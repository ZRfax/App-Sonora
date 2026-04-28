import React, { useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, LayoutPanelTop } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import './PlayerControls.css'

export const PlayerControls: React.FC = () => {
  const {
    currentSong, isPlaying, volume, progress, pendingSeek,
    togglePlay, nextSong, prevSong, setVolume, setProgress, seekTo, clearPendingSeek,
    toggleShuffle, toggleRepeat, isShuffle, isRepeat,
    showPanel, togglePanel
  } = usePlayerStore()

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedSongPathRef = useRef<string | null>(null)
  // Ref para saber si debe reproducir cuando el audio esté listo (onCanPlay)
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying

  // Carga y controla reproducción — solo cambia src si es canción diferente
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSong) return

    if (loadedSongPathRef.current !== currentSong.filePath) {
      // Nueva canción: local file:// o stream en la nube (audioUrl)
      loadedSongPathRef.current = currentSong.filePath
      if (currentSong.audioUrl) {
        audio.crossOrigin = 'anonymous'
        audio.src = currentSong.audioUrl
      } else {
        audio.removeAttribute('crossOrigin')
        audio.src = currentSong.filePath
      }
      audio.currentTime = 0
    }

    if (isPlaying) {
      // play() retorna promesa; si falla por carga en curso, onCanPlay reintentará
      audio.play().catch(err => {
        if (err.name !== 'AbortError') console.error('Playback failed:', err)
      })
    } else {
      audio.pause()
    }
  }, [currentSong?.filePath, isPlaying])

  // Reintenta play cuando el audio ya está listo para reproducir
  const handleCanPlay = () => {
    const audio = audioRef.current
    if (audio && isPlayingRef.current && audio.paused) {
      audio.play().catch(e => {
        if (e.name !== 'AbortError') console.error('Retry play failed:', e)
      })
    }
  }

  // Ajusta el volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // Aplica seek externo (desde FloatingPlayer o MiniPlayer)
  useEffect(() => {
    if (pendingSeek !== null && audioRef.current) {
      audioRef.current.currentTime = pendingSeek
      clearPendingSeek()
    }
  }, [pendingSeek])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setProgress(time)
    }
  }

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="player-controls-container">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={nextSong}
        onCanPlay={handleCanPlay}
      />
      
      {/* Current Song Info */}
      <div className="now-playing">
        {currentSong ? (
          <>
            <div className="cover-art">
              {currentSong.coverUrl ? (
                <img src={currentSong.coverUrl} alt="Album Art" />
              ) : (
                <div className="cover-placeholder">♪</div>
              )}
            </div>
            <div className="song-info">
              <div className="title" title={currentSong.title}>{currentSong.title}</div>
              <div className="artist" title={currentSong.artist}>{currentSong.artist}</div>
            </div>
          </>
        ) : (
          <div className="empty-player">No song playing</div>
        )}
      </div>

      {/* Main Controls */}
      <div className="main-controls">
        <div className="buttons">
          <button className={`control-btn icon-small ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle}>
            <Shuffle size={16} />
          </button>
          <button className="control-btn" onClick={prevSong} disabled={!currentSong}>
            <SkipBack size={20} />
          </button>
          <button className="play-btn" onClick={togglePlay} disabled={!currentSong}>
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="play-icon-offset" />}
          </button>
          <button className="control-btn" onClick={nextSong} disabled={!currentSong}>
            <SkipForward size={20} />
          </button>
          <button className={`control-btn icon-small ${isRepeat ? 'active' : ''}`} onClick={toggleRepeat}>
            <Repeat size={16} />
          </button>
        </div>
        
        <div className="progress-bar-container">
          <span className="time">{formatTime(progress)}</span>
          <input 
            type="range" 
            className="progress-slider" 
            min="0" 
            max={currentSong?.duration || 100}
            value={progress}
            onChange={handleSeek}
            disabled={!currentSong}
            style={{
              '--progress': `${(progress / (currentSong?.duration || 1)) * 100}%`
            } as React.CSSProperties}
          />
          <span className="time">{formatTime(currentSong?.duration || 0)}</span>
        </div>
      </div>

      {/* Auxiliary Controls (Volume + Panel toggle) */}
      <div className="aux-controls">
        <button
          className={`icon-small control-btn ${showPanel ? 'active' : ''}`}
          onClick={togglePanel}
          title={showPanel ? 'Ocultar panel de control' : 'Mostrar panel de control'}
        >
          <LayoutPanelTop size={16} />
        </button>
        <div className="volume-control">
          <button className="control-btn" onClick={() => setVolume(volume === 0 ? 1 : 0)}>
            {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input 
            type="range" 
            className="volume-slider" 
            min="0" 
            max="1" 
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{
              '--volume-progress': `${volume * 100}%`
            } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  )
}
