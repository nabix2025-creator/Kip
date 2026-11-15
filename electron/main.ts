import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen, shell, type WebContents } from 'electron'
import { existsSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { connectIcloud, disconnectIcloud, icloudStatus, syncIcloud } from './caldav'
import {
  disableFocusMode,
  enableFocusMode,
  forceDisableFocusMode,
  getFocusModeStatus,
  resumeFocusModeIfNeeded,
  setFocusModeTargets,
  setFocusNagParent,
  teardownFocusModeOnQuit,
  type FocusTargetId,
} from './focusMode'
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
let focusTeardownDone = false
let trayEvents: { id: string; title: string; time: string; color: string; start?: string }[] = []
const reminderQueue: ReminderPayload[] = []
let alertVisible = false
let currentAlert: ReminderPayload | null = null

function preloadPath(): string {
  const dir = join(__dirname, '../preload')
  const mjs = join(dir, 'index.mjs')
  return existsSync(mjs) ? mjs : join(dir, 'index.js')
}

function resolveAppIcon(): string | undefined {
  const candidates = [
    join(process.resourcesPath, 'icon.ico'),
    join(process.resourcesPath, 'icon.png'),
    join(__dirname, '../../build/icon.ico'),
    join(__dirname, '../../build/icons/icon-256.png'),
    join(__dirname, '../../build/icon.png'),
  ]
  return candidates.find((path) => existsSync(path))
}

function appIconImage() {
  const path = resolveAppIcon()
  return path ? nativeImage.createFromPath(path) : null
}

/** Disable Chromium page zoom (Ctrl+/Ctrl-/Ctrl+wheel) — Kip UI must stay 100%. */
function lockPageZoom(contents: WebContents): void {
  const freeze = () => {
    try {
      contents.setZoomFactor(1)
      contents.setVisualZoomLevelLimits(1, 1)
    } catch {
      /* ignore */
    }
  }
  freeze()
  contents.on('did-finish-load', freeze)
  contents.on('before-input-event', (event, input) => {
    if (!(input.control || input.meta)) return
    const key = input.key.toLowerCase()
    // Block zoom in/out/reset: -, _, =, +, 0, numpad ±
    if (key === '-' || key === '_' || key === '=' || key === '+' || key === '0' || key === 'numadd' || key === 'numsub') {
      event.preventDefault()
      freeze()
    }
  })
}

function load(window: BrowserWindow, query = ''): void {
  lockPageZoom(window.webContents)
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    void window.loadURL(query ? `${devUrl}?${query}` : devUrl)
    return
  }
  void window.loadFile(join(__dirname, '../renderer/index.html'), query ? { search: query } : undefined)
}

function createMain(): void {
  const icon = resolveAppIcon()
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
    ...(icon ? { icon } : {}),
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

function pushTrayEventsToPopup(): void {
  if (!popup || popup.isDestroyed()) return
  const payload = {
    dateLabel: new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    events: trayEvents,
  }
  const send = () => {
    if (!popup || popup.isDestroyed()) return
    popup.webContents.send('tray:events', payload)
  }
  if (popup.webContents.isLoading()) {
    popup.webContents.once('did-finish-load', send)
  } else {
    send()
  }
}

function positionTrayPopup(window: BrowserWindow): void {
  const bounds = tray?.getBounds()
  const display = bounds
    ? screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
    : screen.getPrimaryDisplay()
  const work = display.workArea
  const width = 360
  const height = 480
  let x = work.x + Math.round((work.width - width) / 2)
  let y = work.y + Math.round((work.height - height) / 2)
  if (bounds && bounds.width > 0) {
    x = Math.round(bounds.x + bounds.width / 2 - width / 2)
    // Taskbar usually at bottom — place popup above tray icon.
    y = Math.round(bounds.y - height - 8)
    if (y < work.y + 8) {
      // Taskbar on top (or icon near top): place below.
      y = Math.round(bounds.y + bounds.height + 8)
    }
  }
  x = Math.min(Math.max(work.x + 8, x), work.x + work.width - width - 8)
  y = Math.min(Math.max(work.y + 8, y), work.y + work.height - height - 8)
  window.setPosition(x, y)
}

function showPopup(): void {
  if (!popup || popup.isDestroyed()) {
    const icon = resolveAppIcon()
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
      ...(icon ? { icon } : {}),
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
  positionTrayPopup(popup)
  pushTrayEventsToPopup()
  popup.show()
  popup.focus()
  // Re-push after a tick in case the tray renderer rehydrated late.
  setTimeout(() => pushTrayEventsToPopup(), 120)
}

const ALERT_WIDTH = 400
const ALERT_HEIGHT = 260

function ensureAlertWindow(): BrowserWindow {
  if (alertWindow && !alertWindow.isDestroyed()) return alertWindow
  const icon = resolveAppIcon()
  alertWindow = new BrowserWindow({
    width: ALERT_WIDTH,
    height: ALERT_HEIGHT,
    frame: false,
    transparent: true,
    hasShadow: false,
    ...(icon ? { icon } : {}),
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

function buildTrayContextMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: 'Today\'s events', click: () => showPopup() },
    { label: 'Open Kip', click: () => showMain() },
    { type: 'separator' },
    ...(trayEvents.length
      ? trayEvents.slice(0, 6).map((event) => ({
          label: `${event.time}   ${event.title}`.slice(0, 80),
          click: () => showMain(new Date().toISOString()),
        }))
      : [{ label: 'No events today', enabled: false as const }]),
    { type: 'separator' },
    {
      label: 'Quit Kip',
      click: () => {
        quitting = true
        app.quit()
      },
    },
  ])
}

function refreshTrayMenu(): void {
  // On Windows, setContextMenu steals left-click. Keep menu for right-click only.
  if (process.platform === 'win32') {
    tray?.setContextMenu(null)
    return
  }
  tray?.setContextMenu(buildTrayContextMenu())
}

function blankIcon() {
  const icon = appIconImage()
  if (icon && !icon.isEmpty()) {
    return icon.resize({ width: 16, height: 16 })
  }
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
  app.on('web-contents-created', (_event, contents) => {
    lockPageZoom(contents)
  })

  app.on('second-instance', (_event, argv) => {
    const url = argv.find((item) => item.startsWith('kip://'))
    if (url) sendAuthCallback(url)
    else showMain()
  })
  app.setAppUserModelId('com.kip.app')
  registerProtocol()
  app.whenReady().then(() => {
    // Packaged installs always open at Windows login — not user-optional.
    if (app.isPackaged) {
      storeSet('openAtLogin', true)
      app.setLoginItemSettings({ openAtLogin: true, path: process.execPath })
    }

    createMain()
    setFocusNagParent(() => mainWindow)
    tray = new Tray(blankIcon())
    tray.setToolTip('Kip')
    refreshTrayMenu()
    // Left / single click → today's events popup (must not use setContextMenu on Windows).
    tray.on('click', () => showPopup())
    tray.on('double-click', () => showMain())
    tray.on('right-click', () => {
      tray?.popUpContextMenu(buildTrayContextMenu())
    })

    void resumeFocusModeIfNeeded()

    const bootUrl = process.argv.find((item) => item.startsWith('kip://'))
    if (bootUrl) {
      mainWindow?.webContents.once('did-finish-load', () => sendAuthCallback(bootUrl))
    }

    ipcMain.handle('shell:openExternal', (_event, url: string) => shell.openExternal(url))
    ipcMain.handle('net:fetchText', async (_event, url: string) => {
      const allowed = new Set(['feeds.bbci.co.uk', 'www.prothomalo.com'])
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        throw new Error('Invalid URL')
      }
      if (parsed.protocol !== 'https:' || !allowed.has(parsed.hostname)) {
        throw new Error('Host not allowed')
      }
      const response = await fetch(parsed.toString(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.text()
    })
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
    ipcMain.handle(
      'tray:update',
      (
        _event,
        payload: { icon?: string; events?: { id: string; title: string; time: string; color: string; start?: string }[] },
      ) => {
        if (payload.icon) {
          const image = nativeImage.createFromDataURL(payload.icon)
          tray?.setImage(image.resize({ width: 16, height: 16 }))
        }
        trayEvents = payload.events ?? []
        const count = trayEvents.length
        tray?.setToolTip(count ? `Kip · ${count} today` : `Kip · ${new Date().getDate()}`)
        refreshTrayMenu()
        if (popup && !popup.isDestroyed() && popup.isVisible()) pushTrayEventsToPopup()
      },
    )
    ipcMain.handle('tray:getEvents', () => ({
      dateLabel: new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      events: trayEvents,
    }))
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

    ipcMain.handle('focusMode:get', () => getFocusModeStatus())
    ipcMain.handle(
      'focusMode:enable',
      (_event, options?: { minutes?: number; endsAt?: string; targets?: FocusTargetId[] }) =>
        enableFocusMode(options),
    )
    ipcMain.handle('focusMode:disable', () => disableFocusMode())
    ipcMain.handle('focusMode:forceDisable', () => forceDisableFocusMode())
    ipcMain.handle('focusMode:setTargets', (_event, targets: FocusTargetId[]) => setFocusModeTargets(targets))

    ipcMain.handle('loginItem:get', () => {
      if (app.isPackaged) {
        storeSet('openAtLogin', true)
        app.setLoginItemSettings({ openAtLogin: true, path: process.execPath })
      }
      const settings = app.getLoginItemSettings()
      return { openAtLogin: app.isPackaged ? true : settings.openAtLogin, openAsHidden: settings.openAsHidden }
    })
    ipcMain.handle('loginItem:set', () => {
      // Ignore attempts to turn startup off — always re-enable for packaged builds.
      storeSet('openAtLogin', true)
      if (app.isPackaged) {
        app.setLoginItemSettings({ openAtLogin: true, path: process.execPath })
      }
      const settings = app.getLoginItemSettings()
      return { openAtLogin: true, openAsHidden: settings.openAsHidden }
    })

    setupAutoUpdater()
  })
}

app.on('before-quit', (event) => {
  quitting = true
  if (focusTeardownDone) return
  event.preventDefault()
  void teardownFocusModeOnQuit()
    .catch(() => undefined)
    .finally(() => {
      focusTeardownDone = true
      app.quit()
    })
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
