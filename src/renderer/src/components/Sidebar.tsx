import React, { useState, useRef, useEffect } from 'react'
import { Home, LibraryIcon, Plus, Heart, TrendingUp, ListMusic, X, Check, Cloud } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import { SearchBar } from './SearchBar'
import './Sidebar.css'

export const Sidebar: React.FC = () => {
  const {
    favorites, userPlaylists, activeView,
    setActiveView, createUserPlaylist, removeUserPlaylist
  } = usePlayerStore()

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName]       = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating) setTimeout(() => inputRef.current?.focus(), 50)
  }, [isCreating])

  const handleCreate = () => {
    if (newName.trim()) {
      createUserPlaylist(newName.trim())
      setNewName('')
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') { setIsCreating(false); setNewName('') }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-brand" aria-label="Sonora">
        <span className="sidebar-brand-mark" />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Sonora</span>
          <span className="sidebar-brand-tag">Reproductor</span>
        </div>
      </div>
      <div className="sidebar-nav">
        <button
          className={`nav-item ${activeView === 'all' ? 'active' : ''}`}
          onClick={() => setActiveView('all')}
        >
          <Home size={24} />
          <span>Inicio</span>
        </button>
      </div>

      <SearchBar />

      <div className="sidebar-library">
        <div className="library-header">
          <button className="nav-item" onClick={() => setActiveView('all')}>
            <LibraryIcon size={24} />
            <span>Tu biblioteca</span>
          </button>
          <button
            className="icon-btn"
            title="Create playlist"
            onClick={() => { setIsCreating(true) }}
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="playlists-container">
          {/* Liked Songs */}
          <button
            className={`playlist-item ${activeView === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveView('favorites')}
          >
            <Heart
              size={16}
              className="playlist-icon liked-icon"
              fill={favorites.length > 0 ? 'currentColor' : 'none'}
            />
            <span className="playlist-name">Me gusta</span>
            {favorites.length > 0 && (
              <span className="playlist-count">{favorites.length}</span>
            )}
          </button>

          {/* Most Played */}
          <button
            className={`playlist-item ${activeView === 'most-played' ? 'active' : ''}`}
            onClick={() => setActiveView('most-played')}
          >
            <TrendingUp size={16} className="playlist-icon trending-icon" />
            <span className="playlist-name">Más escuchadas</span>
          </button>

          {/* Personal cloud songs */}
          <button
            className={`playlist-item ${activeView === 'personal-cloud' ? 'active' : ''}`}
            onClick={() => setActiveView('personal-cloud')}
          >
            <Cloud size={16} className="playlist-icon" style={{ color: 'var(--accent-cool)' }} />
            <span className="playlist-name">Mis canciones nube</span>
          </button>

          {/* Divider before user playlists */}
          {userPlaylists.length > 0 && <div className="sidebar-divider" />}

          {/* User-created playlists */}
          {userPlaylists.map(pl => (
            <button
              key={pl.id}
              className={`playlist-item ${activeView === pl.id ? 'active' : ''}`}
              onClick={() => setActiveView(pl.id)}
            >
              <ListMusic size={16} className="playlist-icon" />
              <span className="playlist-name">{pl.name}</span>
              <span className="playlist-count">{pl.songPaths.length}</span>
              <span
                className="playlist-delete-btn"
                role="button"
                onClick={(e) => { e.stopPropagation(); removeUserPlaylist(pl.id) }}
              >
                <X size={12} />
              </span>
            </button>
          ))}

          {/* Inline create-playlist row */}
          {isCreating && (
            <div className="playlist-create-row">
              <ListMusic size={16} className="playlist-icon" />
              <input
                ref={inputRef}
                className="playlist-name-input"
                placeholder="Playlist name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="icon-btn" onClick={handleCreate} title="Save">
                <Check size={14} />
              </button>
              <button
                className="icon-btn"
                onClick={() => { setIsCreating(false); setNewName('') }}
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
