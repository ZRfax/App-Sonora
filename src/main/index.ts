import { app, shell, BrowserWindow, ipcMain, dialog, globalShortcut } from 'electron'
import { join, extname } from 'path'
import fs from 'fs'
import * as mm from 'music-metadata'

let mainWindow: BrowserWindow | null = null
let miniWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

/** Atajos de ventana (equivalente a optimizer.watchWindowShortcuts del toolkit). */
function watchWindowShortcuts(window: BrowserWindow): void {
  const { webContents } = window
  webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    if (!isDev) {
      if (input.code === 'KeyR' && (input.control || input.meta)) event.preventDefault()
      if (input.code === 'KeyI' && ((input.alt && input.meta) || (input.control && input.shift))) {
        event.preventDefault()
      }
    } else if (input.code === 'F12') {
      if (webContents.isDevToolsOpened()) webContents.closeDevTools()
      else webContents.openDevTools({ mode: 'undocked' })
    }
    if (input.code === 'Minus' && (input.control || input.meta)) event.preventDefault()
    if (input.code === 'Equal' && input.shift && (input.control || input.meta)) event.preventDefault()
  })
}

// ── Folder watcher ────────────────────────────────────────────────────────────
let folderWatcher: fs.FSWatcher | null = null
let watchDebounce: ReturnType<typeof setTimeout> | null = null

function startFolderWatcher(dir: string): void {
  if (folderWatcher) {
    try {
      folderWatcher.close()
    } catch {}
    folderWatcher = null
  }
  try {
    folderWatcher = fs.watch(dir, { recursive: true }, (_evt, filename) => {
      if (!filename) return
      if (!['.mp3', '.wav', '.flac', '.m4a', '.ogg'].includes(extname(filename).toLowerCase())) return
      if (watchDebounce) clearTimeout(watchDebounce)
      watchDebounce = setTimeout(async () => {
        const songs = await scanFolder(dir)
        if (songs && mainWindow && !mainWindow.isDestroyed())
          mainWindow.webContents.send('folder:updated', songs)
      }, 1500)
    })
    folderWatcher.on('error', () => {
      folderWatcher = null
    })
  } catch (e) {
    console.error('Watcher error', e)
  }
}

// ── Config persistence ────────────────────────────────────────────────────────
function cfgPath() {
  return join(app.getPath('userData'), 'app-config.json')
}
function getConfig(): { lastFolderPath?: string } {
  try {
    return JSON.parse(fs.readFileSync(cfgPath(), 'utf-8'))
  } catch {
    return {}
  }
}
function saveConfig(data: { lastFolderPath?: string }) {
  try {
    fs.writeFileSync(cfgPath(), JSON.stringify(data), 'utf-8')
  } catch {}
}

// ── Folder scanner ────────────────────────────────────────────────────────────
async function walkDir(dir: string): Promise<string[]> {
  let out: string[] = []
  for (const f of await fs.promises.readdir(dir)) {
    const p = join(dir, f)
    if ((await fs.promises.stat(p)).isDirectory()) out = out.concat(await walkDir(p))
    else out.push(p)
  }
  return out
}

async function scanFolder(dir: string): Promise<object[] | null> {
  try {
    const audio = (await walkDir(dir)).filter((f) =>
      ['.mp3', '.wav', '.flac', '.m4a', '.ogg'].includes(extname(f).toLowerCase())
    )
    const songs = []
    for (const fp of audio) {
      try {
        const meta = await mm.parseFile(fp)
        let coverUrl: string | undefined
        if (meta.common.picture?.length) {
          const p = meta.common.picture[0]
          coverUrl = `data:${p.format};base64,${p.data.toString('base64')}`
        }
        songs.push({
          filePath: `file://${fp.replace(/\\/g, '/')}`,
          source: 'local',
          title: meta.common.title || fp.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, ''),
          artist: meta.common.artist || 'Unknown Artist',
          album: meta.common.album || 'Unknown Album',
          duration: meta.format.duration || 0,
          coverUrl
        })
      } catch {}
    }
    return songs
  } catch {
    return null
  }
}

// ── Windows ───────────────────────────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 360,
    minHeight: 580,
    show: false,
    autoHideMenuBar: true,
    title: 'Sonora',
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, webSecurity: false }
  })
  mainWindow.on('ready-to-show', () => mainWindow!.show())
  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow!.hide()
    createMiniWindow()
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  if (isDev && process.env['ELECTRON_RENDERER_URL']) mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

function createMiniWindow(): void {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show()
    miniWindow.focus()
    return
  }
  miniWindow = new BrowserWindow({
    width: 320,
    height: 440,
    minWidth: 260,
    minHeight: 72,
    maxWidth: 520,
    maxHeight: 720,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    title: 'Sonora',
    transparent: false,
    backgroundColor: '#080a10',
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, webSecurity: false }
  })
  miniWindow.on('closed', () => {
    miniWindow = null
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) app.exit(0)
  })
  if (isDev && process.env['ELECTRON_RENDERER_URL'])
    miniWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?mini=true`)
  else miniWindow.loadFile(join(__dirname, '../renderer/index.html'), { query: { mini: 'true' } })
  miniWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mini:request-push')
  })
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(isDev ? process.execPath : 'com.zabdiel.sonora')
  }
  app.on('browser-window-created', (_, w) => watchWindowShortcuts(w))

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled || !filePaths.length) return null
    const dir = filePaths[0]
    const songs = await scanFolder(dir)
    if (songs) {
      saveConfig({ lastFolderPath: dir })
      startFolderWatcher(dir)
    }
    return songs
  })

  ipcMain.handle('store:getSavedFolder', async () => {
    const { lastFolderPath } = getConfig()
    if (!lastFolderPath) return null
    const songs = await scanFolder(lastFolderPath)
    if (songs) startFolderWatcher(lastFolderPath)
    return songs
  })

  ipcMain.handle('mini:open', () => createMiniWindow())
  ipcMain.handle('mini:close', () => {
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.close()
  })
  ipcMain.handle('mini:hide', () => {
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.hide()
  })
  ipcMain.handle('main:show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  ipcMain.handle('mini:resize', (_e, w: number, h: number) => {
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.setSize(Math.round(w), Math.round(h))
  })
  ipcMain.handle('mini:command', (_e, cmd: string, data?: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mini:execute', cmd, data)
  })
  ipcMain.handle('mini:push-state', (_e, state: unknown) => {
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.webContents.send('mini:state', state)
  })

  // Ctrl+Shift+M — toggle the mini player window (open if closed, hide if visible)
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (miniWindow && !miniWindow.isDestroyed()) {
      if (miniWindow.isVisible()) {
        miniWindow.hide()
      } else {
        miniWindow.show()
        miniWindow.focus()
      }
    } else {
      createMiniWindow()
    }
  })
  createWindow()
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  try {
    folderWatcher?.close()
  } catch {}
  if (watchDebounce) clearTimeout(watchDebounce)
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
