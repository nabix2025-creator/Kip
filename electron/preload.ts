import { contextBridge, ipcRenderer } from 'electron'

const api = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  quit: () => ipcRenderer.send('app:quit'),
  focusMain: () => ipcRenderer.send('window:focus'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),
  storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  fetchText: (url: string) => ipcRenderer.invoke('net:fetchText', url) as Promise<string>,
  notify: (payload: { title: string; body: string; start?: string; time?: string }) => ipcRenderer.invoke('notify', payload),
  dismissReminder: () => ipcRenderer.send('reminder:dismiss'),
  openReminder: (date?: string) => ipcRenderer.send('reminder:open', date),
  reminderReady: () => ipcRenderer.send('reminder:ready'),
  onReminderAlert: (callback: (payload: { title: string; body: string; start?: string; time?: string }) => void) => {
    const listener = (_event: unknown, payload: { title: string; body: string; start?: string; time?: string }) => callback(payload)
    ipcRenderer.on('reminder:show', listener)
    return () => ipcRenderer.removeListener('reminder:show', listener)
  },
  onAuthCallback: (callback: (url: string) => void) => {
    const listener = (_event: unknown, url: string) => callback(url)
    ipcRenderer.on('auth:callback', listener)
    return () => ipcRenderer.removeListener('auth:callback', listener)
  },
  setTray: (payload: { icon: string; events: { id: string; title: string; time: string; color: string }[] }) =>
    ipcRenderer.invoke('tray:update', payload),
  openMain: (date?: string) => ipcRenderer.send('tray:open', date),
  googleConnect: (creds: { clientId: string; clientSecret: string }) => ipcRenderer.invoke('google:connect', creds),
  googleSync: () => ipcRenderer.invoke('google:sync'),
  googlePush: (action: unknown) => ipcRenderer.invoke('google:push', action),
  googleDisconnect: () => ipcRenderer.invoke('google:disconnect'),
  googleStatus: () => ipcRenderer.invoke('google:status'),
  icloudConnect: (creds: { username: string; password: string }) => ipcRenderer.invoke('icloud:connect', creds),
  icloudSync: () => ipcRenderer.invoke('icloud:sync'),
  icloudDisconnect: () => ipcRenderer.invoke('icloud:disconnect'),
  icloudStatus: () => ipcRenderer.invoke('icloud:status'),
  onNavigate: (callback: (iso: string) => void) => {
    const listener = (_event: unknown, iso: string) => callback(iso)
    ipcRenderer.on('navigate', listener)
    return () => ipcRenderer.removeListener('navigate', listener)
  },
  onMaximized: (callback: (maximized: boolean) => void) => {
    const listener = (_event: unknown, maximized: boolean) => callback(maximized)
    ipcRenderer.on('window:maximized', listener)
    return () => ipcRenderer.removeListener('window:maximized', listener)
  },
  focusModeGet: () => ipcRenderer.invoke('focusMode:get'),
  focusModeEnable: (options?: { minutes?: number; endsAt?: string }) =>
    ipcRenderer.invoke('focusMode:enable', options),
  focusModeDisable: () => ipcRenderer.invoke('focusMode:disable'),
  focusModeForceDisable: () => ipcRenderer.invoke('focusMode:forceDisable'),
  onFocusModeUpdated: (callback: (status: unknown) => void) => {
    const listener = (_event: unknown, status: unknown) => callback(status)
    ipcRenderer.on('focusMode:updated', listener)
    return () => ipcRenderer.removeListener('focusMode:updated', listener)
  },
  loginItemGet: () => ipcRenderer.invoke('loginItem:get'),
  loginItemSet: (openAtLogin: boolean) => ipcRenderer.invoke('loginItem:set', openAtLogin),
  platform: process.platform,
}

contextBridge.exposeInMainWorld('api', api)
