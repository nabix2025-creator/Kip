/// <reference types="vite/client" />

export interface TrayEvent {
  id: string
  title: string
  time: string
  color: string
}

export interface GoogleCalendarDTO {
  externalId: string
  name: string
  color: string
}

export interface GoogleEventDTO {
  externalId: string
  calendarExternalId: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  notes?: string
}

export interface SyncPayload {
  calendars: GoogleCalendarDTO[]
  events: GoogleEventDTO[]
  account?: string
}

export interface AccountStatus {
  connected: boolean
  account?: string
}

export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  quit: () => void
  focusMain: () => void
  isMaximized: () => Promise<boolean>
  storeGet: (key: string) => Promise<unknown>
  storeSet: (key: string, value: unknown) => Promise<void>
  openExternal: (url: string) => Promise<void>
  fetchText: (url: string) => Promise<string>
  notify: (payload: { title: string; body: string; start?: string; time?: string }) => Promise<void>
  dismissReminder: () => void
  openReminder: (date?: string) => void
  reminderReady: () => void
  onReminderAlert: (cb: (payload: { title: string; body: string; start?: string; time?: string }) => void) => () => void
  onAuthCallback: (cb: (url: string) => void) => () => void
  setTray: (payload: { icon: string; events: TrayEvent[] }) => Promise<void>
  openMain: (date?: string) => void
  googleConnect: (creds: { clientId: string; clientSecret: string }) => Promise<SyncPayload>
  googleSync: () => Promise<SyncPayload>
  googlePush: (action: GooglePush) => Promise<{ externalId?: string }>
  googleDisconnect: () => Promise<void>
  googleStatus: () => Promise<AccountStatus>
  icloudConnect: (creds: { username: string; password: string }) => Promise<SyncPayload>
  icloudSync: () => Promise<SyncPayload>
  icloudDisconnect: () => Promise<void>
  icloudStatus: () => Promise<AccountStatus>
  onNavigate: (cb: (iso: string) => void) => () => void
  onMaximized: (cb: (maximized: boolean) => void) => () => void
  focusModeGet: () => Promise<FocusModeStatus>
  focusModeEnable: (options?: { minutes?: number; endsAt?: string }) => Promise<FocusModeStatus>
  focusModeDisable: () => Promise<FocusModeStatus>
  focusModeForceDisable: () => Promise<FocusModeStatus>
  onFocusModeUpdated?: (cb: (status: FocusModeStatus) => void) => () => void
  loginItemGet: () => Promise<{ openAtLogin: boolean; openAsHidden?: boolean }>
  loginItemSet: (openAtLogin: boolean) => Promise<{ openAtLogin: boolean; openAsHidden?: boolean }>
  platform: string
}

export interface FocusModeStatus {
  enabled: boolean
  hostsActive: boolean
  processGuard: boolean
  needsElevation: boolean
  message: string
  blockedDomains: string[]
  blockedApps: string[]
  endsAt: string | null
  remainingMs: number
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export interface GooglePush {
  action: 'insert' | 'update' | 'delete'
  calendarExternalId: string
  externalId?: string
  event?: {
    title: string
    start: string
    end: string
    allDay: boolean
    location?: string
    notes?: string
    reminders?: number[]
  }
}

declare global {
  interface Window {
    api?: ElectronAPI
  }
}

export {}
