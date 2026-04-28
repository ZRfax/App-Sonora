/// <reference types="vite/client" />

export interface SonoraApi {
  selectFolder: () => Promise<unknown[] | null>
  getSavedFolder: () => Promise<unknown[] | null>
  openMiniPlayer: () => Promise<void>
  closeMiniPlayer: () => Promise<void>
  hideMiniPlayer: () => Promise<void>
  showMainPlayer: () => Promise<void>
  resizeMiniPlayer: (w: number, h: number) => Promise<void>
  pushStateToMini: (state: unknown) => Promise<void>
  sendMiniCommand: (cmd: string, data?: unknown) => Promise<void>
  onMiniExecute: (cb: (cmd: string, data?: unknown) => void) => void
  onMiniState: (cb: (state: unknown) => void) => void
  onMiniRequestPush: (cb: () => void) => void
  onFolderUpdated: (cb: (songs: unknown[]) => void) => void
  removeMiniListeners: () => void
}

declare global {
  interface Window {
    api?: SonoraApi
  }
}
