const LEGACY_TO_KIP = [
  ['fantastical-settings', 'kip-settings'],
  ['nodash-settings', 'kip-settings'],
  ['fantastical-calendars', 'kip-calendars'],
  ['nodash-calendars', 'kip-calendars'],
  ['fantastical-events', 'kip-events'],
  ['nodash-events', 'kip-events'],
  ['fantastical-tasks', 'kip-tasks'],
  ['nodash-tasks', 'kip-tasks'],
  ['fantastical-dashboard', 'kip-dashboard'],
  ['nodash-dashboard', 'kip-dashboard'],
  ['fantastical-timed-reminders', 'kip-timed-reminders'],
  ['nodash-timed-reminders', 'kip-timed-reminders'],
  ['fantastical-fired-reminders', 'kip-fired-reminders'],
  ['nodash-fired-reminders', 'kip-fired-reminders'],
  ['fantastical-client-id', 'kip-client-id'],
  ['nodash-client-id', 'kip-client-id'],
  ['fantastical-sync-at', 'kip-sync-at'],
  ['nodash-sync-at', 'kip-sync-at'],
  ['fantastical-whiteboard', 'kip-whiteboard'],
  ['nodash-whiteboard', 'kip-whiteboard'],
] as const

const KEYS = ['kip-settings', 'kip-calendars', 'kip-events', 'kip-tasks'] as const

export function migrateLegacyStorage(): void {
  for (const [from, to] of LEGACY_TO_KIP) {
    if (localStorage.getItem(to) != null) continue
    const value = localStorage.getItem(from)
    if (value == null) continue
    localStorage.setItem(to, value)
  }
}

export async function restoreFromElectronStore(): Promise<void> {
  migrateLegacyStorage()
  if (!window.api) return
  for (const key of KEYS) {
    if (localStorage.getItem(key)) continue
    const remote = await window.api.storeGet(key)
    if (typeof remote === 'string' && remote) localStorage.setItem(key, remote)
  }
}

export function mirrorToElectronStore(): () => void {
  migrateLegacyStorage()
  if (!window.api) return () => undefined
  const save = () => {
    for (const key of KEYS) {
      const value = localStorage.getItem(key)
      if (value != null) void window.api?.storeSet(key, value)
    }
  }
  const id = window.setInterval(save, 2000)
  window.addEventListener('beforeunload', save)
  return () => {
    window.clearInterval(id)
    window.removeEventListener('beforeunload', save)
    save()
  }
}
