import { create } from 'zustand'

export interface Song {
  /** Unique id: local `file://…`, cloud `audius:{id}`, or personal `url:{url}` */
  filePath: string
  /** HTTP stream URL when `source` is cloud (Audius) or personal URL */
  audioUrl?: string
  source?: 'local' | 'cloud' | 'personal'
  title: string
  artist: string
  album?: string
  duration: number
  coverUrl?: string
}

export interface UserPlaylist {
  id: string
  name: string
  songPaths: string[]
}

// ── localStorage helpers ───────────────────────────────────────────────────────
const loadLocal = <T>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? '') ?? fallback } catch { return fallback }
}
const saveLocal = (key: string, val: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

interface PlayerState {
  currentSong: Song | null
  queue: Song[]
  playlist: Song[]
  filteredPlaylist: Song[]
  /** Sidebar search string */
  searchQuery: string
  /** `cloud` = Audius streaming; `local` = files from disk */
  musicSource: 'cloud' | 'local'
  cloudLoading: boolean
  cloudError: string | null
  /** Cached trending list for clearing cloud search */
  cloudTrendingCache: Song[]
  isPlaying: boolean
  volume: number
  progress: number
  pendingSeek: number | null
  isShuffle: boolean
  isRepeat: boolean

  // Favorites, play counts, playlists
  favorites: string[]
  playCounts: Record<string, number>
  userPlaylists: UserPlaylist[]
  activeView: string   // 'all' | 'favorites' | 'most-played' | playlist id

  // Personal cloud songs (added by URL)
  cloudPersonalSongs: Song[]

  // Actions
  setPlaylist: (songs: Song[]) => void
  playSong: (song: Song) => void
  playShuffled: (songs: Song[]) => void
  togglePlay: () => void
  setVolume: (volume: number) => void
  setProgress: (progress: number) => void
  seekTo: (time: number) => void
  clearPendingSeek: () => void
  nextSong: () => void
  prevSong: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  searchSongs: (query: string) => void
  clearSearch: () => void

  toggleFavorite: (filePath: string) => void
  createUserPlaylist: (name: string) => void
  removeUserPlaylist: (id: string) => void
  addSongToPlaylist: (playlistId: string, filePath: string) => void
  removeSongFromPlaylist: (playlistId: string, filePath: string) => void
  setActiveView: (view: string) => void

  setMusicSource: (source: 'cloud' | 'local') => void
  setCloudLoading: (v: boolean) => void
  setCloudError: (msg: string | null) => void
  setCloudTrendingCache: (songs: Song[]) => void

  // Personal cloud song management
  addCloudSong: (song: Song) => void
  removeCloudSong: (filePath: string) => void

  // Panel flotante visible
  showPanel: boolean
  togglePanel: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  playlist: [],
  filteredPlaylist: [],
  searchQuery: '',
  musicSource: 'cloud',
  cloudLoading: false,
  cloudError: null,
  cloudTrendingCache: [],
  isPlaying: false,
  volume: 1,
  progress: 0,
  pendingSeek: null,
  isShuffle: false,
  isRepeat: false,

  favorites:           loadLocal<string[]>('player_favorites', []),
  playCounts:          loadLocal<Record<string, number>>('player_playCounts', {}),
  userPlaylists:       loadLocal<UserPlaylist[]>('player_userPlaylists', []),
  cloudPersonalSongs:  loadLocal<Song[]>('cloud_personal_songs', []),
  activeView:          'all',

  setPlaylist: (songs) => set({ playlist: songs, queue: songs, filteredPlaylist: songs }),

  setMusicSource: (musicSource) => set({ musicSource }),
  setCloudLoading: (cloudLoading) => set({ cloudLoading }),
  setCloudError: (cloudError) => set({ cloudError }),
  setCloudTrendingCache: (cloudTrendingCache) => set({ cloudTrendingCache }),

  playSong: (song) => {
    const { playCounts } = get()
    const newCounts = { ...playCounts, [song.filePath]: (playCounts[song.filePath] ?? 0) + 1 }
    saveLocal('player_playCounts', newCounts)
    set({ currentSong: song, isPlaying: true, progress: 0, playCounts: newCounts })
  },

  playShuffled: (songs) => {
    if (songs.length === 0) return
    const rand = Math.floor(Math.random() * songs.length)
    const song = songs[rand]
    const { playCounts } = get()
    const newCounts = { ...playCounts, [song.filePath]: (playCounts[song.filePath] ?? 0) + 1 }
    saveLocal('player_playCounts', newCounts)
    set({
      currentSong: song,
      isPlaying: true,
      progress: 0,
      playCounts: newCounts,
      isShuffle: true,
      queue: songs,
      playlist: songs,
      filteredPlaylist: songs
    })
  },

  togglePlay: () => set((state) => ({
    isPlaying: state.currentSong ? !state.isPlaying : false
  })),

  setVolume: (volume) => set({ volume }),

  setProgress: (progress) => set({ progress }),

  seekTo: (time) => set({ pendingSeek: time, progress: time }),

  clearPendingSeek: () => set({ pendingSeek: null }),

  searchSongs: (query) => {
    const { playlist } = get()
    const filtered = query.trim().length === 0
      ? playlist
      : playlist.filter(song =>
          song.title.toLowerCase().includes(query.toLowerCase()) ||
          song.artist.toLowerCase().includes(query.toLowerCase()) ||
          (song.album && song.album.toLowerCase().includes(query.toLowerCase()))
        )
    set({ searchQuery: query, filteredPlaylist: filtered })
  },

  clearSearch: () => {
    const { playlist, musicSource, cloudTrendingCache } = get()
    if (musicSource === 'cloud' && cloudTrendingCache.length > 0) {
      set({
        searchQuery: '',
        playlist: cloudTrendingCache,
        queue: cloudTrendingCache,
        filteredPlaylist: cloudTrendingCache
      })
    } else {
      set({ searchQuery: '', filteredPlaylist: playlist })
    }
  },

  nextSong: () => {
    const { currentSong, queue, isRepeat, isShuffle } = get()
    if (!currentSong || queue.length === 0) return
    const idx = queue.findIndex(s => s.filePath === currentSong.filePath)
    if (idx === -1) return
    let next: Song
    if (isRepeat) {
      // Repeat current song
      next = currentSong
    } else if (isShuffle) {
      const rand = Math.floor(Math.random() * queue.length)
      next = queue[rand]
    } else if (idx < queue.length - 1) {
      next = queue[idx + 1]
    } else {
      // End of queue — loop back to start automatically
      next = queue[0]
    }
    const { playCounts } = get()
    const newCounts = { ...playCounts, [next.filePath]: (playCounts[next.filePath] ?? 0) + 1 }
    saveLocal('player_playCounts', newCounts)
    set({ currentSong: next, isPlaying: true, progress: 0, playCounts: newCounts })
  },

  prevSong: () => {
    const { currentSong, queue } = get()
    if (!currentSong || queue.length === 0) return
    const idx = queue.findIndex(s => s.filePath === currentSong.filePath)
    if (idx > 0) {
      const prev = queue[idx - 1]
      const { playCounts } = get()
      const newCounts = { ...playCounts, [prev.filePath]: (playCounts[prev.filePath] ?? 0) + 1 }
      saveLocal('player_playCounts', newCounts)
      set({ currentSong: prev, isPlaying: true, progress: 0, playCounts: newCounts })
    }
  },

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat:  () => set((state) => ({ isRepeat:  !state.isRepeat  })),

  // ── Favorites ────────────────────────────────────────────────────────────────
  toggleFavorite: (filePath) => {
    const { favorites } = get()
    const newFavs = favorites.includes(filePath)
      ? favorites.filter(f => f !== filePath)
      : [...favorites, filePath]
    saveLocal('player_favorites', newFavs)
    set({ favorites: newFavs })
  },

  // ── User playlists ───────────────────────────────────────────────────────────
  createUserPlaylist: (name) => {
    const { userPlaylists } = get()
    const id = `pl_${Date.now()}`
    const updated = [...userPlaylists, { id, name, songPaths: [] }]
    saveLocal('player_userPlaylists', updated)
    set({ userPlaylists: updated, activeView: id })
  },

  removeUserPlaylist: (id) => {
    const { userPlaylists, activeView } = get()
    const updated = userPlaylists.filter(p => p.id !== id)
    saveLocal('player_userPlaylists', updated)
    set({ userPlaylists: updated, activeView: activeView === id ? 'all' : activeView })
  },

  addSongToPlaylist: (playlistId, filePath) => {
    const { userPlaylists } = get()
    const updated = userPlaylists.map(p =>
      p.id === playlistId && !p.songPaths.includes(filePath)
        ? { ...p, songPaths: [...p.songPaths, filePath] }
        : p
    )
    saveLocal('player_userPlaylists', updated)
    set({ userPlaylists: updated })
  },

  removeSongFromPlaylist: (playlistId, filePath) => {
    const { userPlaylists } = get()
    const updated = userPlaylists.map(p =>
      p.id === playlistId
        ? { ...p, songPaths: p.songPaths.filter(fp => fp !== filePath) }
        : p
    )
    saveLocal('player_userPlaylists', updated)
    set({ userPlaylists: updated })
  },

  setActiveView: (view) => set({ activeView: view }),

  // ── Personal cloud songs ─────────────────────────────────────────────────────
  addCloudSong: (song) => {
    const { cloudPersonalSongs } = get()
    if (cloudPersonalSongs.some(s => s.filePath === song.filePath)) return
    const updated = [...cloudPersonalSongs, song]
    saveLocal('cloud_personal_songs', updated)
    set({ cloudPersonalSongs: updated })
  },

  removeCloudSong: (filePath) => {
    const { cloudPersonalSongs } = get()
    const updated = cloudPersonalSongs.filter(s => s.filePath !== filePath)
    saveLocal('cloud_personal_songs', updated)
    set({ cloudPersonalSongs: updated })
  },

  showPanel: false,
  togglePanel: () => set((state) => ({ showPanel: !state.showPanel })),
}))
