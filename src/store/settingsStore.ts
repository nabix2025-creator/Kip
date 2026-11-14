import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FirebaseConfig, ThemeMode, TimeFormat } from '@/types'
import { CAL_PERSONAL } from '@/store/seed'

interface SettingsState {
  theme: ThemeMode
  weekStartsOn: 0 | 1
  timeFormat: TimeFormat
  defaultCalendarId: string
  notificationsEnabled: boolean
  defaultReminder: number
  weatherEnabled: boolean
  weatherCity: string
  openWeatherKey: string
  googleClientId: string
  googleClientSecret: string
  firebase: FirebaseConfig
  setTheme: (theme: ThemeMode) => void
  setWeekStartsOn: (weekStartsOn: 0 | 1) => void
  setTimeFormat: (timeFormat: TimeFormat) => void
  setDefaultCalendarId: (id: string) => void
  setNotificationsEnabled: (enabled: boolean) => void
  setDefaultReminder: (minutes: number) => void
  setWeatherEnabled: (enabled: boolean) => void
  setWeatherCity: (city: string) => void
  setOpenWeatherKey: (key: string) => void
  setGoogleClientId: (value: string) => void
  setGoogleClientSecret: (value: string) => void
  setFirebase: (patch: Partial<FirebaseConfig>) => void
}

const emptyFirebase: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      weekStartsOn: 0,
      timeFormat: '12h',
      defaultCalendarId: CAL_PERSONAL,
      notificationsEnabled: true,
      defaultReminder: 10,
      weatherEnabled: true,
      weatherCity: '',
      openWeatherKey: '',
      googleClientId: '',
      googleClientSecret: '',
      firebase: emptyFirebase,
      setTheme: (theme) => set({ theme }),
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setDefaultCalendarId: (defaultCalendarId) => set({ defaultCalendarId }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setDefaultReminder: (defaultReminder) => set({ defaultReminder }),
      setWeatherEnabled: (weatherEnabled) => set({ weatherEnabled }),
      setWeatherCity: (weatherCity) => set({ weatherCity }),
      setOpenWeatherKey: (openWeatherKey) => set({ openWeatherKey }),
      setGoogleClientId: (googleClientId) => set({ googleClientId }),
      setGoogleClientSecret: (googleClientSecret) => set({ googleClientSecret }),
      setFirebase: (patch) => set((state) => ({ firebase: { ...state.firebase, ...patch } })),
    }),
    {
      name: 'kip-settings',
      version: 3,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<SettingsState>
        return {
          ...state,
          theme: (state.theme as ThemeMode | undefined) ?? 'system',
        }
      },
    },
  ),
)

export function resolvedTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}
