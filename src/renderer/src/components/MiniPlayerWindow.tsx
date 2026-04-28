import React, { useState, useEffect, useRef } from 'react'
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, X, Search, Maximize2, ChevronDown, ChevronUp, Shuffle
} from 'lucide-react'
import { Song } from '../store/playerStore'
import './MiniPlayerWindow.css'

interface MiniState {
  currentSong: Song | null
  isPlaying: boolean
  volume: number
  playlist: Song[]
  progress: number
}

const api = () => (window as any).api

const sendCmd = (cmd: string, data?: unknown) => api()?.sendMiniCommand?.(cmd, data)
const fmt = (s: number) => {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

const EXPANDED_H = 440
const COMPACT_H  = 88

export const MiniPlayerWindow: React.FC = () => {
  const [state, setState] = useState<MiniState>({
    currentSong: null, isPlaying: false, volume: 1, playlist: [], progress: 0
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch]   = useState(false)
  const [minimized, setMinimized]     = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!api()?.onMiniState) return
    api().onMiniState((s: unknown) => setState(s as MiniState))
    return () => api()?.removeMiniListeners?.()
  }, [])

  // Focus search input when panel opens
  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [showSearch])

  const { currentSong, isPlaying, volume, playlist, progress } = state
  const duration    = currentSong?.duration ?? 0
  const progressPct = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0

  const results = searchQuery.trim()
    ? playlist
        .filter(s =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.artist.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : []

  const handleClose    = () => api()?.closeMiniPlayer?.()
  const handleShowMain = () => api()?.showMainPlayer?.()

  const handleMinimize = () => {
    api()?.hideMiniPlayer?.()
  }
  const handleExpand = () => {
    api()?.resizeMiniPlayer?.(320, EXPANDED_H)
    setMinimized(false)
  }

  // ── Compact (minimized) view ─────────────────────────────────────────────
  if (minimized) {
    return (
      <div className="mini-window mini-compact">
        <div className="mini-bg-art" style={currentSong?.coverUrl ? { backgroundImage: `url(${currentSong.coverUrl})` } : {}} />
        <div className="mini-bg-overlay" />
        <div className="mini-compact-content">
          <div className="mini-compact-drag">
            <div className="mini-compact-info">
              <span className="mini-compact-title">{currentSong?.title ?? 'Sin canción'}</span>
              <span className="mini-compact-artist">{currentSong?.artist ?? ''}</span>
            </div>
          </div>
          <div className="mini-compact-controls">
            <button className="mini-sm-btn" onClick={() => sendCmd('PREV_SONG')} disabled={!currentSong}>
              <SkipBack size={14} fill="currentColor" />
            </button>
            <button className="mini-sm-play" onClick={() => sendCmd('TOGGLE_PLAY')} disabled={!currentSong}>
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <button className="mini-sm-btn" onClick={() => sendCmd('NEXT_SONG')} disabled={!currentSong}>
              <SkipForward size={14} fill="currentColor" />
            </button>
            <button className="mini-icon-btn" onClick={handleExpand} title="Expandir">
              <ChevronUp size={13} />
            </button>
            <button className="mini-icon-btn mini-close-btn" onClick={handleClose} title="Cerrar">
              <X size={13} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Full view ────────────────────────────────────────────────────────────
  return (
    <div className="mini-window">
      <div className="mini-bg-art" style={currentSong?.coverUrl ? { backgroundImage: `url(${currentSong.coverUrl})` } : {}} />
      <div className="mini-bg-overlay" />

      <div className="mini-content">

        {/* Header */}
        <div className="mini-drag-header">
          <span className="mini-app-title">Sonora</span>
          <div className="mini-header-btns">
            <button className="mini-icon-btn" onClick={() => setShowSearch(v => !v)} title="Buscar">
              <Search size={13} />
            </button>
            <button className="mini-icon-btn" onClick={handleShowMain} title="Abrir player completo">
              <Maximize2 size={13} />
            </button>
            <button className="mini-icon-btn" onClick={handleMinimize} title="Minimizar">
              <ChevronDown size={13} />
            </button>
            <button className="mini-icon-btn mini-close-btn" onClick={handleClose} title="Cerrar">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Art OR Search — fills all flexible space */}
        <div className="mini-flex-area">
          {showSearch ? (
            /* ── Search panel ─────────────────────────────────────────── */
            <div className="mini-search-panel">
              <div className="mini-search-input-wrap">
                <Search size={14} className="mini-search-icon" />
                <input
                  ref={searchInputRef}
                  className="mini-search-input"
                  placeholder="Buscar canción o artista..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="mini-clear-btn" onClick={() => setSearchQuery('')}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="mini-search-results">
                {results.length > 0 ? (
                  results.map((song, i) => (
                    <button
                      key={i}
                      className="mini-result-item"
                      onClick={() => {
                        sendCmd('PLAY_SONG', song.filePath)
                        setSearchQuery('')
                        setShowSearch(false)
                      }}
                    >
                      <div className="mini-result-cover">
                        {song.coverUrl
                          ? <img src={song.coverUrl} alt="" />
                          : <span>♪</span>}
                      </div>
                      <div className="mini-result-text">
                        <div className="mini-result-title">{song.title}</div>
                        <div className="mini-result-artist">{song.artist}</div>
                      </div>
                    </button>
                  ))
                ) : searchQuery.trim() ? (
                  <div className="mini-no-results">Sin resultados para "{searchQuery}"</div>
                ) : (
                  <div className="mini-search-hint">Escribe para buscar en tus {playlist.length} canciones</div>
                )}
              </div>
            </div>
          ) : (
            /* ── Album art ────────────────────────────────────────────── */
            <div className="mini-art-section">
              <div className={`mini-art-frame ${isPlaying ? 'playing' : ''}`}>
                {currentSong?.coverUrl
                  ? <img src={currentSong.coverUrl} alt="Cover" className="mini-art-img" />
                  : <div className="mini-art-placeholder">♪</div>}
              </div>
            </div>
          )}
        </div>

        {/* Song info — always visible */}
        <div className="mini-info">
          <div className="mini-song-title-wrap">
            <span className="mini-song-title">{currentSong?.title ?? 'Sin canción'}</span>
          </div>
          <div className="mini-song-artist">{currentSong?.artist ?? ''}</div>
        </div>

        {/* Progress — always visible */}
        <div className="mini-progress-area">
          <input
            type="range"
            className="mini-progress-slider"
            min="0"
            max={duration || 100}
            value={progress}
            step="0.5"
            disabled={!currentSong}
            onChange={e => sendCmd('SEEK', Number(e.target.value))}
            style={{ '--mini-prog': `${progressPct}%` } as React.CSSProperties}
          />
          <div className="mini-progress-times">
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Controls — always visible */}
        <div className="mini-controls">
          <button className="mini-ctrl-btn" onClick={() => sendCmd('PREV_SONG')} disabled={!currentSong}>
            <SkipBack size={18} fill="currentColor" />
          </button>
          {!currentSong && playlist.length > 0 ? (
            <button className="mini-play-btn" onClick={() => sendCmd('PLAY_RANDOM')} title="Reproducir aleatoria">
              <Shuffle size={20} />
            </button>
          ) : (
            <button className="mini-play-btn" onClick={() => sendCmd('TOGGLE_PLAY')} disabled={!currentSong}>
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>
          )}
          <button className="mini-ctrl-btn" onClick={() => sendCmd('NEXT_SONG')} disabled={!currentSong}>
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>

        {/* Volume — always visible */}
        <div className="mini-volume">
          <button className="mini-vol-icon" onClick={() => sendCmd('SET_VOLUME', volume === 0 ? 1 : 0)}>
            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range" className="mini-volume-slider"
            min="0" max="1" step="0.01" value={volume}
            onChange={e => sendCmd('SET_VOLUME', Number(e.target.value))}
            style={{ '--vol': `${volume * 100}%` } as React.CSSProperties}
          />
          <span className="mini-vol-pct">{Math.round(volume * 100)}%</span>
        </div>

        {/* Footer */}
        <div className="mini-footer">
          <span>{playlist.length} en biblioteca</span>
        </div>

      </div>
    </div>
  )
}
