import { contextBridge, ipcRenderer } from 'electron'

const api = {
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  getSavedFolder: () => ipcRenderer.invoke('store:getSavedFolder'),
  openMiniPlayer: () => ipcRenderer.invoke('mini:open'),
  closeMiniPlayer: () => ipcRenderer.invoke('mini:close'),
  hideMiniPlayer: () => ipcRenderer.invoke('mini:hide'),
  showMainPlayer: () => ipcRenderer.invoke('main:show'),
  resizeMiniPlayer: (w: number, h: number) => ipcRenderer.invoke('mini:resize', w, h),
  pushStateToMini: (state: unknown) => ipcRenderer.invoke('mini:push-state', state),
  sendMiniCommand: (cmd: string, data?: unknown) => ipcRenderer.invoke('mini:command', cmd, data),

  onMiniExecute: (cb: (cmd: string, data?: unknown) => void) =>
    ipcRenderer.on('mini:execute', (_e, cmd, data) => cb(cmd, data)),
  onMiniState: (cb: (state: unknown) => void) =>
    ipcRenderer.on('mini:state', (_e, state) => cb(state)),
  onMiniRequestPush: (cb: () => void) =>
    ipcRenderer.on('mini:request-push', () => cb()),
  onFolderUpdated: (cb: (songs: unknown) => void) => {
    ipcRenderer.removeAllListeners('folder:updated')
    ipcRenderer.on('folder:updated', (_e, songs) => cb(songs))
  },

  onPanelToggle: (cb: () => void) => {
    ipcRenderer.removeAllListeners('panel:toggle')
    ipcRenderer.on('panel:toggle', () => cb())
  },

  removeMiniListeners: () => {
    ipcRenderer.removeAllListeners('mini:execute')
    ipcRenderer.removeAllListeners('mini:state')
    ipcRenderer.removeAllListeners('mini:request-push')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (e) {
    console.error(e)
  }
} else {
  // @ts-expect-error expone api en preload sin aislamiento
  window.api = api
}
