import React, { useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import { searchTracks } from '../services/audius'
import './SearchBar.css'

const CLOUD_DEBOUNCE_MS = 420

export const SearchBar: React.FC = () => {
  const {
    searchQuery,
    searchSongs,
    clearSearch,
    musicSource,
    setPlaylist,
    setCloudLoading,
    setCloudError,
    cloudTrendingCache,
    cloudLoading
  } = usePlayerStore()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (musicSource === 'local') {
      searchSongs(value)
      return
    }

    // Nube: búsqueda remota con debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)
    usePlayerStore.setState({ searchQuery: value })

    if (value.trim().length === 0) {
      clearSearch()
      return
    }

    debounceRef.current = setTimeout(async () => {
      setCloudLoading(true)
      setCloudError(null)
      try {
        const songs = await searchTracks(value.trim(), 45)
        setPlaylist(songs)
      } catch {
        setCloudError('No se pudo buscar. Revisa tu conexión.')
      } finally {
        setCloudLoading(false)
      }
    }, CLOUD_DEBOUNCE_MS)
  }

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    clearSearch()
  }

  const placeholder =
    musicSource === 'cloud'
      ? 'Buscar en Audius (artistas, títulos…)'
      : 'Buscar en tu biblioteca…'

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        {cloudLoading && musicSource === 'cloud' ? (
          <Loader2 size={18} className="search-icon search-icon-spin" />
        ) : (
          <Search size={18} className="search-icon" />
        )}
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleChange}
        />
        {searchQuery && (
          <button type="button" className="clear-btn" onClick={handleClear} title="Limpiar">
            <X size={18} />
          </button>
        )}
      </div>
      {musicSource === 'cloud' && cloudTrendingCache.length > 0 && searchQuery.trim().length > 0 && (
        <p className="search-hint-cloud">Mostrando resultados de la nube. Borra el texto para volver a tendencias.</p>
      )}
    </div>
  )
}
