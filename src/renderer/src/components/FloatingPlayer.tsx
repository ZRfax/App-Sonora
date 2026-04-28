import React, { useState, useRef, useEffect, useCallback } from 'react'
// Note: showPanel state now lives in playerStore
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, ChevronDown, Monitor } from 'lucide-react'
import { usePlayerStore, Song } from '../store/playerStore'
import './FloatingPlayer.css'

export const FloatingPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    togglePlay,
    nextSong,
    prevSong,
    setVolume,
    seekTo,
    playSong,
    playlist,
    showPanel,
    togglePanel
  } = usePlayerStore()

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00'
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const [isSearching, setIsSearching] = useState(false)
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: 80 })
  const dragOffset = useRef({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    setIsDragging(true)
  }

  const getFilteredSongs = () => {
    if (!localSearchQuery.trim()) return []
    return playlist.filter(s =>
      s.title.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(localSearchQuery.toLowerCase())
    ).slice(0, 5)
  }

  const handlePlayFromSearch = (song: Song) => {
    playSong(song)
    setLocalSearchQuery('')
    setIsSearching(false)
  }

  const handleOpenMiniWindow = () => {
    // @ts-ignore
    if (window.api?.openMiniPlayer) {
      // @ts-ignore
      window.api.openMiniPlayer()
    }
  }

  if (!showPanel) return null

  return (
    <div
      className="floating-player"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="floating-header" onMouseDown={handleHeaderMouseDown}>
        <div className="header-title">
          <span className="floating-brand-mark" aria-hidden />
          <h3>Sonora</h3>
        </div>
        <div className="header-actions">
          <button className="minimize-btn" onClick={handleOpenMiniWindow} title="Open mini window (always on top)">
            <Monitor size={16} />
          </button>
          <button className="minimize-btn" onClick={togglePanel} title="Hide panel">
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      <div className="floating-content">
        {/* Current Song Info */}
        {currentSong ? (
          <div className="floating-song-info">
            <div className="cover-small">
              {currentSong.coverUrl ? (
                <img src={currentSong.coverUrl} alt="Album Art" />
              ) : (
                <div className="cover-placeholder-small">♪</div>
              )}
            </div>
            <div className="song-text">
              <div className="title-small">{currentSong.title}</div>
              <div className="artist-small">{currentSong.artist}</div>
            </div>
          </div>
        ) : (
          <div className="floating-empty">No song playing</div>
        )}

        {/* Main Controls */}
        <div className="floating-controls">
          <button className="control-btn-small" onClick={prevSong} disabled={!currentSong} title="Previous">
            <SkipBack size={18} />
          </button>
          <button className="play-btn-small" onClick={togglePlay} disabled={!currentSong} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" />
            )}
          </button>
          <button className="control-btn-small" onClick={nextSong} disabled={!currentSong} title="Next">
            <SkipForward size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="floating-progress">
          <input
            type="range"
            className="floating-progress-slider"
            min="0"
            max={currentSong?.duration || 100}
            value={progress}
            step="0.5"
            disabled={!currentSong}
            onChange={(e) => seekTo(Number(e.target.value))}
            style={{
              '--fp-progress': `${(progress / (currentSong?.duration || 1)) * 100}%`
            } as React.CSSProperties}
          />
          <div className="floating-progress-times">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(currentSong?.duration || 0)}</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="floating-volume">
          <button className="control-btn-small" onClick={() => setVolume(volume === 0 ? 1 : 0)}>
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            className="volume-slider-small"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{
              '--volume-progress': `${volume * 100}%`
            } as React.CSSProperties}
          />
          <span className="volume-percent">{Math.round(volume * 100)}%</span>
        </div>

        {/* Search Section */}
        <div className="floating-search-section">
          <button
            className="search-toggle-btn"
            onClick={() => setIsSearching(!isSearching)}
            title="Search songs"
          >
            🔍 {isSearching ? 'Hide' : 'Search'}
          </button>

          {isSearching && (
            <div className="floating-search-box">
              <div className="fp-search-input-wrapper">
                <input
                  type="text"
                  className="search-input-small"
                  placeholder="Song or artist..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  autoFocus
                />
                {localSearchQuery && (
                  <button className="clear-search-btn" onClick={() => setLocalSearchQuery('')} title="Clear">
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {localSearchQuery && (
                <div className="search-results-small">
                  {getFilteredSongs().length > 0 ? (
                    getFilteredSongs().slice(0, 5).map((song, idx) => (
                      <button
                        key={idx}
                        className="result-item"
                        onClick={() => handlePlayFromSearch(song)}
                      >
                        <div className="result-title">{song.title}</div>
                        <div className="result-artist">{song.artist}</div>
                      </button>
                    ))
                  ) : (
                    <div className="no-results">No songs found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Song Count */}
        <div className="floating-stats">
          <small>{playlist.length} en biblioteca</small>
          <small className="shortcut-hint" title="Mostrar u ocultar este panel">Panel: Ctrl+Shift+M</small>
        </div>
      </div>
    </div>
  )
}
