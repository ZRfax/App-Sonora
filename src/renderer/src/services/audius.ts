/**
 * Audius public API — streaming without local files.
 * https://docs.audius.org
 */

import type { Song } from '../store/playerStore'

const AUDIUS_API = 'https://api.audius.co/v1'

export interface AudiusTrack {
  id: string
  title: string
  duration: number
  genre?: string
  user?: { name?: string }
  artwork?: Record<string, string> | string | null
}

function pickArtwork(artwork?: Record<string, string> | string | null): string | undefined {
  if (!artwork) return undefined
  if (typeof artwork === 'string') return artwork
  return (
    artwork['1000x1000'] ||
    artwork['480x480'] ||
    artwork['150x150'] ||
    artwork['100x100'] ||
    Object.values(artwork)[0]
  )
}

export function audiusTrackToSong(track: AudiusTrack): Song {
  const id = track.id
  return {
    filePath: `audius:${id}`,
    audioUrl: `${AUDIUS_API}/tracks/${id}/stream`,
    title: track.title || 'Sin título',
    artist: track.user?.name?.trim() || 'Artista desconocido',
    album: track.genre,
    duration: typeof track.duration === 'number' ? track.duration : 0,
    coverUrl: pickArtwork(track.artwork),
    source: 'cloud'
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Audius ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchTrendingTracks(limit = 40): Promise<Song[]> {
  const url = `${AUDIUS_API}/tracks/trending?time=week&limit=${limit}`
  const data = await parseJson<{ data?: AudiusTrack[] }>(await fetch(url))
  const rows = data.data ?? []
  return rows.map(audiusTrackToSong)
}

export async function searchTracks(query: string, limit = 40): Promise<Song[]> {
  const q = query.trim()
  if (!q) return []
  const params = new URLSearchParams({ query: q, limit: String(limit) })
  const url = `${AUDIUS_API}/tracks/search?${params.toString()}`
  const data = await parseJson<{ data?: AudiusTrack[] }>(await fetch(url))
  const rows = data.data ?? []
  return rows.map(audiusTrackToSong)
}
