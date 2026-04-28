import React, { useState, useEffect, useRef } from 'react'
import {
  FolderOpen,
  Play,
  Heart,
  MoreHorizontal,
  Trash2,
  TrendingUp,
  ListMusic,
  Cloud,
  HardDrive,
  RefreshCw,
  Loader2,
  Shuffle,
  Link,
  X
} from 'lucide-react'
import { usePlayerStore, Song } from '../store/playerStore'
import { fetchTrendingTracks } from '../services/audius'
import './Library.css'

export const Library: React.FC = () => {
  const {
    playlist,
    filteredPlaylist,
    searchQuery,
    playSong,
    playShuffled,
    currentSong,
    isPlaying,
    setPlaylist,
    favorites,
    toggleFavorite,
    playCounts,
    userPlaylists,
    activeView,
    addSongToPlaylist,
    removeSongFromPlaylist,
    musicSource,
    setMusicSource,
    setCloudLoading,
    setCloudError,
    setCloudTrendingCache,
    cloudLoading,
    cloudError,
    cloudPersonalSongs,
    addCloudSong,
    removeCloudSong
  } = usePlayerStore()

  const [showToast, setShowToast]       = useState(false)
  const [menuSong, setMenuSong]         = useState<Song | null>(null)
  const [menuPos, setMenuPos]           = useState({ x: 0, y: 0 })
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [urlInput, setUrlInput]         = useState('')
  const [urlTitle, setUrlTitle]         = useState('')
  const [urlArtist, setUrlArtist]       = useState('')
  const [urlError, setUrlError]         = useState('')
  const menuRef    = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const cloudInitRef = useRef(false)

  useEffect(() => {
    if (!menuSong) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuSong(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuSong])

  useEffect(() => {
    if (showUrlDialog) setTimeout(() => urlInputRef.current?.focus(), 60)
  }, [showUrlDialog])

  const loadCloudTrending = async () => {
    setCloudLoading(true)
    setCloudError(null)
    try {
      const songs = await fetchTrendingTracks(45)
      setCloudTrendingCache(songs)
      setPlaylist(songs)
      usePlayerStore.setState({ searchQuery: '' })
    } catch {
      setCloudError('No se pudo cargar la música en la nube. Comprueba tu conexión.')
    } finally {
      setCloudLoading(false)
    }
  }

  // Al iniciar: catálogo en la nube (Audius)
  useEffect(() => {
    if (cloudInitRef.current) return
    if (musicSource !== 'cloud') return
    cloudInitRef.current = true
    void loadCloudTrending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicSource])

  // Al pasar a modo local: recuperar última carpeta si existe
  useEffect(() => {
    if (musicSource !== 'local') return
    // @ts-ignore
    if (!window.api?.getSavedFolder) return
    ;(async () => {
      // @ts-ignore
      const saved = await window.api.getSavedFolder()
      if (saved && saved.length > 0) setPlaylist(saved)
      else setPlaylist([])
    })()
  }, [musicSource, setPlaylist])

  useEffect(() => {
    // @ts-ignore
    if (!window.api?.onFolderUpdated) return
    // @ts-ignore
    window.api.onFolderUpdated((songs: Song[]) => {
      setMusicSource('local')
      setPlaylist(songs)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    })
  }, [setMusicSource, setPlaylist])

  const handleOpenFolder = async () => {
    // @ts-ignore
    if (window.api) {
      setMusicSource('local')
      // @ts-ignore
      const files = await window.api.selectFolder()
      if (files) setPlaylist(files)
    }
  }

  const handleCloudMode = () => {
    setMusicSource('cloud')
    void loadCloudTrending()
  }

  const openMenu = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ x: rect.left - 140, y: rect.bottom + 4 })
    setMenuSong(song)
  }

  // ── Cloud URL dialog ────────────────────────────────────────────────────────
  const handleAddByUrl = () => {
    setUrlError('')
    const url = urlInput.trim()
    if (!url) { setUrlError('Pega una URL de audio válida.'); return }
    if (!/^https?:\/\//i.test(url)) { setUrlError('La URL debe comenzar con http:// o https://'); return }
    const title  = urlTitle.trim()  || url.split('/').pop()?.split('?')[0] || 'Sin título'
    const artist = urlArtist.trim() || 'Artista desconocido'
    const song: Song = {
      filePath: `url:${url}`,
      audioUrl: url,
      source: 'personal',
      title,
      artist,
      duration: 0
    }
    addCloudSong(song)
    setUrlInput(''); setUrlTitle(''); setUrlArtist(''); setUrlError('')
    setShowUrlDialog(false)
  }

  const getViewSongs = (): Song[] => {
    const source = searchQuery.trim() ? filteredPlaylist : playlist

    if (activeView === 'all') return filteredPlaylist

    if (activeView === 'favorites') {
      return source.filter((s) => favorites.includes(s.filePath))
    }

    if (activeView === 'most-played') {
      return [...playlist]
        .filter((s) => (playCounts[s.filePath] ?? 0) > 0)
        .sort((a, b) => (playCounts[b.filePath] ?? 0) - (playCounts[a.filePath] ?? 0))
        .slice(0, 50)
    }

    if (activeView === 'personal-cloud') {
      return cloudPersonalSongs
    }

    const pl = userPlaylists.find((p) => p.id === activeView)
    if (pl) {
      return pl.songPaths
        .map((fp) => playlist.find((s) => s.filePath === fp))
        .filter(Boolean) as Song[]
    }

    return filteredPlaylist
  }

  const viewSongs = getViewSongs()
  const activePl  = userPlaylists.find((p) => p.id === activeView)

  const getViewTitle = () => {
    if (activeView === 'all')            return 'Inicio'
    if (activeView === 'favorites')      return 'Canciones que te gustan'
    if (activeView === 'most-played')    return 'Más reproducidas'
    if (activeView === 'personal-cloud') return 'Mis canciones en la nube'
    return activePl?.name ?? 'Inicio'
  }

  const getViewIcon = () => {
    if (activeView === 'favorites')
      return <Heart size={28} fill="currentColor" className="view-icon liked-icon" />
    if (activeView === 'most-played') return <TrendingUp size={28} className="view-icon trending-icon" />
    if (activeView === 'personal-cloud') return <Cloud size={28} className="view-icon" style={{ color: 'var(--accent-cool)' }} />
    if (activePl) return <ListMusic size={28} className="view-icon" style={{ color: 'var(--accent-warm)' }} />
    return null
  }

  const formatTime = (sec: number) =>
    `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`

  const showPlaysCol  = activeView === 'most-played'
  const showRemoveCol = !!activePl
  const isPersonalCloud = activeView === 'personal-cloud'

  const emptyLibrary   = playlist.length === 0 && !cloudLoading
  const showCloudBoot  = musicSource === 'cloud' && cloudLoading && playlist.length === 0

  return (
    <div className="library-container">
      {showToast && (
        <div className="folder-update-toast">
          <div className="toast-dot" />
          Biblioteca local actualizada
        </div>
      )}

      {cloudError && (
        <div className="library-error-banner" role="alert">
          {cloudError}
          <button type="button" className="library-error-retry" onClick={() => void loadCloudTrending()}>
            Reintentar
          </button>
        </div>
      )}

      {/* ── URL dialog ──────────────────────────────────────────────────────── */}
      {showUrlDialog && (
        <div className="url-dialog-overlay" onClick={() => setShowUrlDialog(false)}>
          <div className="url-dialog" onClick={e => e.stopPropagation()}>
            <div className="url-dialog-header">
              <span>Agregar canción por URL</span>
              <button className="url-dialog-close" onClick={() => setShowUrlDialog(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="url-dialog-hint">
              Pega un enlace directo a un archivo de audio (MP3, M4A, OGG…) desde Dropbox, Google Drive u otro servicio.
            </p>
            <label className="url-dialog-label">URL del audio *</label>
            <input
              ref={urlInputRef}
              className="url-dialog-input"
              placeholder="https://ejemplo.com/cancion.mp3"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddByUrl()}
            />
            <label className="url-dialog-label">Título (opcional)</label>
            <input
              className="url-dialog-input"
              placeholder="Nombre de la canción"
              value={urlTitle}
              onChange={e => setUrlTitle(e.target.value)}
            />
            <label className="url-dialog-label">Artista (opcional)</label>
            <input
              className="url-dialog-input"
              placeholder="Nombre del artista"
              value={urlArtist}
              onChange={e => setUrlArtist(e.target.value)}
            />
            {urlError && <p className="url-dialog-error">{urlError}</p>}
            <div className="url-dialog-actions">
              <button className="url-dialog-cancel" onClick={() => setShowUrlDialog(false)}>Cancelar</button>
              <button className="url-dialog-confirm" onClick={handleAddByUrl}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      <div className="library-header-main">
        <div className="view-title-area">
          {getViewIcon()}
          <div>
            <h2>{getViewTitle()}</h2>
            {viewSongs.length > 0 && (
              <div className="view-count">
                {viewSongs.length} {viewSongs.length === 1 ? 'canción' : 'canciones'}
                {musicSource === 'cloud' && activeView === 'all' && (
                  <span className="source-pill">
                    <Cloud size={12} /> Audius
                  </span>
                )}
                {musicSource === 'local' && activeView === 'all' && (
                  <span className="source-pill source-pill-local">
                    <HardDrive size={12} /> Archivos
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="library-header-actions">
          {/* Shuffle play button — visible whenever there are songs in this view */}
          {viewSongs.length > 1 && (
            <button
              type="button"
              className="add-folder-btn shuffle-play-btn"
              onClick={() => playShuffled(viewSongs)}
              title="Reproducir en orden aleatorio"
            >
              <Shuffle size={16} />
              <span className="btn-label-full">Reproducción aleatoria</span>
              <span className="btn-label-short">Aleatorio</span>
            </button>
          )}

          {/* Add by URL — visible in personal cloud view or alongside local */}
          <button
            type="button"
            className="add-folder-btn url-add-btn"
            onClick={() => setShowUrlDialog(true)}
            title="Agregar canción desde URL en la nube"
          >
            <Link size={16} />
            <span className="btn-label-full">Agregar URL</span>
            <span className="btn-label-short">URL</span>
          </button>

          <div className="source-toggle" role="group" aria-label="Origen de la música">
            <button
              type="button"
              className={`source-toggle-btn ${musicSource === 'cloud' ? 'active' : ''}`}
              onClick={handleCloudMode}
              title="Streaming desde Audius"
            >
              <Cloud size={16} />
              Nube
            </button>
            <button
              type="button"
              className={`source-toggle-btn ${musicSource === 'local' ? 'active' : ''}`}
              onClick={() => setMusicSource('local')}
              title="Archivos en tu equipo"
            >
              <HardDrive size={16} />
              Local
            </button>
          </div>
          {musicSource === 'cloud' && (
            <button
              type="button"
              className="add-folder-btn refresh-cloud-btn"
              onClick={() => void loadCloudTrending()}
              disabled={cloudLoading}
              title="Actualizar tendencias"
            >
              {cloudLoading ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
              <span className="btn-label-full">Tendencias</span>
            </button>
          )}
          {musicSource === 'local' && (
            <button type="button" className="add-folder-btn" onClick={handleOpenFolder}>
              <FolderOpen size={18} />
              <span className="btn-label-full">Elegir carpeta</span>
              <span className="btn-label-short">Carpeta</span>
            </button>
          )}
        </div>
      </div>

      {showCloudBoot ? (
        <div className="library-loading">
          <Loader2 size={40} className="spin library-loading-icon" />
          <p>Conectando con Audius…</p>
        </div>
      ) : emptyLibrary && activeView !== 'personal-cloud' ? (
        <div className="empty-state">
          {musicSource === 'cloud' ? (
            <>
              <Cloud size={48} className="empty-icon empty-icon-cloud" />
              <h3>Descubre música en la nube</h3>
              <p>Sonora usa Audius para reproducir canciones sin descargar carpetas.</p>
              <button type="button" className="add-folder-btn large" onClick={() => void loadCloudTrending()} disabled={cloudLoading}>
                {cloudLoading ? <Loader2 size={20} className="spin" /> : <Cloud size={20} />}
                Cargar tendencias
              </button>
            </>
          ) : (
            <>
              <FolderOpen size={48} className="empty-icon" />
              <h3>Sin archivos locales</h3>
              <p>Elige una carpeta con MP3, FLAC, M4A u otros formatos compatibles.</p>
              <button type="button" className="add-folder-btn large" onClick={handleOpenFolder}>
                Elegir carpeta
              </button>
            </>
          )}
        </div>
      ) : viewSongs.length === 0 ? (
        <div className="empty-state">
          {isPersonalCloud ? (
            <>
              <Cloud size={48} className="empty-icon empty-icon-cloud" />
              <h3>Sin canciones personales en la nube</h3>
              <p>Agrega canciones pegando un enlace directo a un archivo de audio (Dropbox, Google Drive, etc.).</p>
              <button type="button" className="add-folder-btn large" onClick={() => setShowUrlDialog(true)}>
                <Link size={20} />
                Agregar por URL
              </button>
            </>
          ) : (
            <>
              <FolderOpen size={48} className="empty-icon" />
              <h3>
                {activeView === 'favorites'
                  ? 'Aún no hay favoritos'
                  : activeView === 'most-played'
                    ? 'Sin reproducciones aún'
                    : activePl
                      ? 'Playlist vacía'
                      : 'Sin resultados'}
              </h3>
              <p>
                {activeView === 'favorites'
                  ? 'Pulsa el corazón en una canción para guardarla aquí.'
                  : activeView === 'most-played'
                    ? 'Las canciones que más escuches aparecerán aquí.'
                    : activePl
                      ? 'Usa el menú ⋯ en una canción para añadirla a esta lista.'
                      : `Nada coincide con «${searchQuery}»`}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="song-list">
          <div className="song-list-header">
            <div className="col-title">Título</div>
            <div className="col-artist">Artista</div>
            {showPlaysCol && <div className="col-plays">Veces</div>}
            <div className="col-time">Duración</div>
            <div className="col-actions" />
          </div>

          <div className="song-list-body">
            {viewSongs.map((song, index) => {
              const isActive = currentSong?.filePath === song.filePath
              const isFav    = favorites.includes(song.filePath)
              const plays    = playCounts[song.filePath] ?? 0

              return (
                <div
                  key={song.filePath + index}
                  className={`song-row ${isActive ? 'active' : ''}`}
                  onClick={() => playSong(song)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="col-play">
                    {isActive && isPlaying ? (
                      <div className="playing-bars">
                        <div className="bar" />
                        <div className="bar" />
                        <div className="bar" />
                      </div>
                    ) : (
                      <span className="index-num">{index + 1}</span>
                    )}
                    <button
                      type="button"
                      className="row-play-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        playSong(song)
                      }}
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>

                  <div className="col-title">
                    <div className="song-title-text">{song.title || 'Sin título'}</div>
                  </div>

                  <div className="col-artist">{song.artist || 'Artista desconocido'}</div>

                  {showPlaysCol && <div className="col-plays">{plays}</div>}

                  <div className="col-time">{formatTime(song.duration)}</div>

                  <div className="col-actions">
                    <button
                      type="button"
                      className={`row-action-btn like-btn ${isFav ? 'liked' : ''}`}
                      title={isFav ? 'Quitar de favoritos' : 'Me gusta'}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(song.filePath)
                      }}
                    >
                      <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
                    </button>

                    {isPersonalCloud ? (
                      <button
                        type="button"
                        className="row-action-btn remove-btn"
                        title="Eliminar canción"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCloudSong(song.filePath)
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : showRemoveCol ? (
                      <button
                        type="button"
                        className="row-action-btn remove-btn"
                        title="Quitar de la playlist"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSongFromPlaylist(activeView, song.filePath)
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="row-action-btn more-btn"
                        title="Más opciones"
                        onClick={(e) => {
                          e.stopPropagation()
                          openMenu(e, song)
                        }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {menuSong && (
        <div ref={menuRef} className="song-menu-dropdown" style={{ top: menuPos.y, left: menuPos.x }}>
          <div className="song-menu-label">Añadir a playlist</div>
          {userPlaylists.length === 0 ? (
            <div className="song-menu-empty">Crea una lista en la barra lateral</div>
          ) : (
            userPlaylists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                className="song-menu-item"
                onClick={() => {
                  addSongToPlaylist(pl.id, menuSong.filePath)
                  setMenuSong(null)
                }}
              >
                {pl.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
