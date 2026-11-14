import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen, shell } from 'electron'
import { existsSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { connectIcloud, disconnectIcloud, icloudStatus, syncIcloud } from './caldav'
import { connectGoogle, disconnectGoogle, googleStatus, pushGoogle, syncGoogle } from './google'
import { storeGet, storeSet } from './store'
import type { PushAction } from './types'
import { setupAutoUpdater } from './updater'

interface ReminderPayload {
  title: string
  body: string
  start?: string
  time?: string
}

let mainWindow: BrowserWindow | null = null
let popup: BrowserWindow | null = null
let alertWindow: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false
let trayEvents: { title: string; time: string }[] = []
const reminderQueue: ReminderPayload[] = []
let alertVisible = false
let currentAlert: ReminderPayload | null = null

function preloadPath(): string {
  const dir = join(__dirname, '../preload')
  const mjs = join(dir, 'index.mjs')
  return existsSync(mjs) ? mjs : join(dir, 'index.js')
}

function load(window: BrowserWindow, query = ''): void {
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    void window.loadURL(query ? `${devUrl}?${query}` : devUrl)
    return
  }
  void window.loadFile(join(__dirname, '../renderer/index.html'), query ? { search: query } : undefined)
}

function createMain(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    frame: false,
    transparent: true,
    hasShadow: true,
    roundedCorners: true,
    show: false,
    backgroundColor: '#00000000',
    title: 'Kip',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })
  const syncMaximized = () => {
    mainWindow?.webContents.send('window:maximized', Boolean(mainWindow?.isMaximized()))
  }
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('maximize', syncMaximized)
  mainWindow.on('unmaximize', syncMaximized)
  mainWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
  load(mainWindow)
}

function showMain(date?: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) createMain()
  mainWindow?.show()
  mainWindow?.focus()
  if (date) mainWindow?.webContents.send('navigate', date)
}

function showPopup(): void {
  if (!popup || popup.isDestroyed()) {
    popup = new BrowserWindow({
      width: 360,
      height: 480,
      frame: false,
      transparent: true,
      hasShadow: true,
      roundedCorners: true,
      resizable: false,
      show: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: preloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })
    popup.on('blur', () => popup?.hide())
    load(popup, 'view=tray')
  }
  if (popup.isVisible()) {
    popup.hide()
    return
  }
  const bounds = tray?.getBounds()
  if (bounds) {
    popup.setPosition(Math.round(bounds.x + bounds.width / 2 - 180), Math.max(8, Math.round(bounds.y - 488)))
  }
  popup.show()
  popup.focus()
}

const ALERT_WIDTH = 400
const ALERT_HEIGHT = 260

function ensureAlertWindow(): BrowserWindow {
  if (alertWindow && !alertWindow.isDestroyed()) return alertWindow
  alertWindow = new BrowserWindow({
    width: ALERT_WIDTH,
    height: ALERT_HEIGHT,
    frame: false,
    transparent: true,
    hasShadow: true,
    roundedCorners: true,
    resizable: false,
    movable: true,
    fullscreenable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })
  alertWindow.setAlwaysOnTop(true, 'screen-saver')
  alertWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  alertWindow.on('closed', () => {
    alertWindow = null
    alertVisible = false
    currentAlert = null
  })
  load(alertWindow, 'view=alert')
  return alertWindow
}

function positionAlert(window: BrowserWindow): void {
  const display = screen.getPrimaryDisplay()
  const { x, y, width, height } = display.workArea
  window.setBounds({
    width: ALERT_WIDTH,
    height: ALERT_HEIGHT,
    x: Math.round(x + (width - ALERT_WIDTH) / 2),
    y: Math.round(y + (height - ALERT_HEIGHT) / 2),
  })
}

function sendAlert(window: BrowserWindow, payload: ReminderPayload): void {
  const push = () => window.webContents.send('reminder:show', payload)
  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', () => {
      push()
      setTimeout(push, 150)
    })
  } else {
    push()
    setTimeout(push, 80)
  }
}

function presentNextReminder(): void {
  const next = reminderQueue.shift()
  if (!next) {
    alertVisible = false
    currentAlert = null
    if (alertWindow && !alertWindow.isDestroyed()) alertWindow.hide()
    return
  }
  alertVisible = true
  currentAlert = next
  const window = ensureAlertWindow()
  positionAlert(window)
  sendAlert(window, next)
  if (!window.isVisible()) {
    window.show()
    window.focus()
  }
  window.moveTop()
}

function enqueueReminder(payload: ReminderPayload): void {
  reminderQueue.push(payload)
  if (!alertVisible) presentNextReminder()
}

function dismissReminder(): void {
  currentAlert = null
  presentNextReminder()
}

function openReminder(date?: string): void {
  reminderQueue.length = 0
  alertVisible = false
  currentAlert = null
  if (alertWindow && !alertWindow.isDestroyed()) alertWindow.hide()
  showMain(date)
}

function refreshTrayMenu(): void {
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Kip', click: () => showMain() },
      { type: 'separator' },
      ...(trayEvents.length
        ? trayEvents.slice(0, 6).map((event) => ({
            label: `${event.time}   ${event.title}`.slice(0, 80),
            click: () => showMain(new Date().toISOString()),
          }))
        : [{ label: 'No events today', enabled: false }]),
      { type: 'separator' },
      {
        label: 'Quit Kip',
        click: () => {
          quitting = true
          app.quit()
        },
      },
    ]),
  )
}

function blankIcon() {
  return nativeImage.createFromBitmap(Buffer.alloc(16 * 16 * 4, 255), { width: 16, height: 16 })
}

function sendAuthCallback(url: string): void {
  showMain()
  mainWindow?.webContents.send('auth:callback', url)
}

function registerProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('kip', process.execPath, [resolvePath(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('kip')
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const url = argv.find((item) => item.startsWith('kip://'))
    if (url) sendAuthCallback(url)
    else showMain()
  })
  app.setAppUserModelId('com.kip.app')
  registerProtocol()
  app.whenReady().then(() => {
    createMain()
    tray = new Tray(blankIcon())
    tray.setToolTip('Kip')
    refreshTrayMenu()
    tray.on('click', () => showPopup())
    tray.on('right-click', () => tray?.popUpContextMenu())

    const bootUrl = process.argv.find((item) => item.startsWith('kip://'))
    if (bootUrl) {
      mainWindow?.webContents.once('did-finish-load', () => sendAuthCallback(bootUrl))
    }

    ipcMain.handle('shell:openExternal', (_event, url: string) => shell.openExternal(url))
    ipcMain.on('window:focus', () => showMain())

    ipcMain.on('window:minimize', () => {
      mainWindow?.minimize()
    })
    ipcMain.on('window:maximize', () => {
      if (!mainWindow) return
      if (mainWindow.isMaximized()) mainWindow.unmaximize()
      else mainWindow.maximize()
      mainWindow.webContents.send('window:maximized', mainWindow.isMaximized())
    })
    ipcMain.on('window:close', () => {
      mainWindow?.close()
    })
    ipcMain.on('app:quit', () => {
      quitting = true
      app.quit()
    })
    ipcMain.handle('window:isMaximized', () => Boolean(mainWindow?.isMaximized()))
    ipcMain.handle('store:get', (_event, key: string) => storeGet(key))
    ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
      storeSet(key, value)
    })
    ipcMain.handle('notify', (_event, payload: ReminderPayload) => {
      enqueueReminder({ title: payload.title, body: payload.body, start: payload.start, time: payload.time })
    })
    ipcMain.on('reminder:dismiss', () => dismissReminder())
    ipcMain.on('reminder:open', (_event, date?: string) => openReminder(date))
    ipcMain.on('reminder:ready', (event) => {
      if (currentAlert) event.sender.send('reminder:show', currentAlert)
    })
    ipcMain.handle('tray:update', (_event, payload: { icon?: string; events?: { title: string; time: string }[] }) => {
      if (payload.icon) {
        const image = nativeImage.createFromDataURL(payload.icon)
        tray?.setImage(image.resize({ width: 16, height: 16 }))
      }
      trayEvents = payload.events ?? []
      tray?.setToolTip(`Kip · ${new Date().getDate()}`)
      refreshTrayMenu()
    })
    ipcMain.on('tray:open', (_event, date?: string) => {
      popup?.hide()
      showMain(date)
    })
    ipcMain.handle('google:connect', (_event, creds: { clientId: string; clientSecret: string }) => connectGoogle(creds))
    ipcMain.handle('google:sync', () => syncGoogle())
    ipcMain.handle('google:push', (_event, action: PushAction) => pushGoogle(action))
    ipcMain.handle('google:disconnect', () => disconnectGoogle())
    ipcMain.handle('google:status', () => googleStatus())
    ipcMain.handle('icloud:connect', (_event, creds: { username: string; password: string }) => connectIcloud(creds))
    ipcMain.handle('icloud:sync', () => syncIcloud())
    ipcMain.handle('icloud:disconnect', () => disconnectIcloud())
    ipcMain.handle('icloud:status', () => icloudStatus())

    setupAutoUpdater()
  })
}

app.on('before-quit', () => {
  quitting = true
})

app.on('window-all-closed', () => {
  if (quitting) app.quit()
})

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
})
