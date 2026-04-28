import React, { useEffect, useRef } from 'react'
import { usePlayerStore } from '../store/playerStore'

/**
 * Invisible component that bridges the Zustand store with the mini player window via IPC.
 * - Pushes state changes to the mini window whenever the store updates.
 * - Executes store commands received from the mini window.
 */
export const MiniPlayerBridge: React.FC = () => {
  const store = usePlayerStore()
  const stateRef = useRef(store)
  stateRef.current = store

  // Push current state to mini window
  const pushState = () => {
    const { currentSong, isPlaying, volume, playlist, progress } = stateRef.current
    // @ts-ignore
    window.api?.pushStateToMini?.({ currentSong, isPlaying, volume, playlist, progress })
  }

  // Subscribe to store changes and push to mini window
  useEffect(() => {
    const unsub = usePlayerStore.subscribe(() => {
      pushState()
    })
    return () => unsub()
  }, [])

  // Listen for commands from mini window and execute them in the store
  useEffect(() => {
    // @ts-ignore
    if (!window.api?.onMiniExecute) return

    // @ts-ignore
    window.api.onMiniExecute((command: string, data?: unknown) => {
      const s = stateRef.current
      switch (command) {
        case 'TOGGLE_PLAY':
          s.togglePlay()
          break
        case 'NEXT_SONG':
          s.nextSong()
          break
        case 'PREV_SONG':
          s.prevSong()
          break
        case 'SET_VOLUME':
          if (typeof data === 'number') s.setVolume(data)
          break
        case 'PLAY_SONG': {
          const song = s.playlist.find((p) => p.filePath === data)
          if (song) s.playSong(song)
          break
        }
        case 'PLAY_RANDOM': {
          const { playlist } = s
          if (playlist.length > 0) {
            const randomSong = playlist[Math.floor(Math.random() * playlist.length)]
            s.playSong(randomSong)
          }
          break
        }
        case 'SEEK':
          if (typeof data === 'number') s.seekTo(data)
          break
      }
    })

    // When mini window loads, it triggers a state push
    // @ts-ignore
    window.api.onMiniRequestPush(() => {
      pushState()
    })

    return () => {
      // @ts-ignore
      window.api?.removeMiniListeners?.()
    }
  }, [])

  return null
}
