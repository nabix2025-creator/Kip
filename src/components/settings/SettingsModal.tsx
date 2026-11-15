import { useEffect, useState, type ReactNode } from 'react'
import { mergeRemoteCalendars } from '@/lib/googleCalendar'
import { formatFocusEndsAt, formatFocusRemaining } from '@/lib/focusDuration'
import { FocusDurationDialog, type FocusDurationChoice } from '@/components/ui/FocusDurationDialog'
import { FocusTargetPicker, defaultFocusTargets } from '@/components/ui/FocusTargetPicker'
import type { FocusTargetId } from '@/vite-env'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useFocusModeStatus } from '@/hooks/useFocusModeStatus'
import { useAuthStore } from '@/store/authStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { AccountStatus } from '@/vite-env'

const sections = ['General', 'Focus', 'Account', 'Calendars', 'Alerts', 'Weather', 'Calendars sync', 'Shortcuts'] as const

export function SettingsModal() {
  const open = useCalendarStore((state) => state.settingsOpen)
  const close = () => useCalendarStore.setState({ settingsOpen: false })
  const [section, setSection] = useState<(typeof sections)[number]>('General')
  return (
    <Modal open={open} onClose={close} width={780}>
      <div className="flex min-h-[500px] bg-grouped">
        <aside className="w-48 border-r border-divider bg-secondary/60 p-3">
          <div className="px-2 pb-3 text-[13px] font-semibold text-secondary">Settings</div>
          {sections.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSection(item)}
              className={`mb-0.5 block w-full rounded-[10px] px-3 py-2 text-left text-[15px] tracking-[-0.01em] ${section === item ? 'bg-accent-blue font-semibold text-white' : 'text-primary hover:bg-fill/10'}`}
            >
              {item}
            </button>
          ))}
          <div className="mt-8 px-2 text-[12px] text-tertiary">Kip 1.0</div>
        </aside>
        <div className="min-w-0 flex-1 p-6">
          {section === 'General' && <GeneralSection />}
          {section === 'Focus' && <FocusSection />}
          {section === 'Account' && <KipAccountSection />}
          {section === 'Calendars' && <CalendarSection />}
          {section === 'Alerts' && <AlertSection />}
          {section === 'Weather' && <WeatherSection />}
          {section === 'Calendars sync' && <AccountSection />}
          {section === 'Shortcuts' && <ShortcutSection />}
        </div>
      </div>
    </Modal>
  )
}

function GeneralSection() {
  const theme = useSettingsStore((state) => state.theme)
  const weekStartsOn = useSettingsStore((state) => state.weekStartsOn)
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const setOpenAtLogin = useSettingsStore((state) => state.setOpenAtLogin)
  const desktop = Boolean(window.api?.loginItemGet)

  useEffect(() => {
    setOpenAtLogin(true)
    if (!window.api?.loginItemGet) return
    void window.api
      .loginItemGet()
      .then(() => setOpenAtLogin(true))
      .catch(() => undefined)
  }, [setOpenAtLogin])

  return (
    <div className="space-y-5">
      <h2 className="mb-1 text-[28px] font-bold tracking-[-0.03em]">General</h2>
      <Row label="Theme">
        <Segmented value={theme} onChange={useSettingsStore.getState().setTheme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]} />
      </Row>
      <Row label="Week starts on">
        <Segmented value={String(weekStartsOn)} onChange={(value) => useSettingsStore.getState().setWeekStartsOn(value === '1' ? 1 : 0)} options={[{ value: '0', label: 'Sunday' }, { value: '1', label: 'Monday' }]} />
      </Row>
      <Row label="Time format">
        <Segmented value={timeFormat} onChange={useSettingsStore.getState().setTimeFormat} options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]} />
      </Row>
      <Row label="Open Kip at login">
        <span className="rounded-[8px] bg-fill/10 px-2.5 py-1 text-[12px] font-semibold text-secondary">Always on</span>
      </Row>
      <p className="text-body text-secondary">
        {desktop
          ? 'Kip always launches when Windows starts. This cannot be turned off.'
          : 'Startup login is mandatory in the desktop app.'}
      </p>
    </div>
  )
}

function FocusSection() {
  const preferred = useSettingsStore((state) => state.focusModePreferred)
  const setPreferred = useSettingsStore((state) => state.setFocusModePreferred)
  const [status, setStatus] = useFocusModeStatus()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draftTargets, setDraftTargets] = useState<FocusTargetId[]>(defaultFocusTargets)
  const desktop = Boolean(window.api?.focusModeGet)

  useEffect(() => {
    if (!status) return
    setPreferred(status.enabled)
    if (status.message) setMessage(status.message)
    if (status.targets?.length) setDraftTargets(status.targets)
  }, [status, setPreferred])

  const applyStatus = (next: Awaited<ReturnType<NonNullable<typeof window.api>['focusModeGet']>>) => {
    setStatus(next)
    setPreferred(next.enabled)
    setMessage(next.message)
    if (next.targets?.length) setDraftTargets(next.targets)
  }

  const updateTargets = async (nextTargets: FocusTargetId[]) => {
    setDraftTargets(nextTargets)
    if (!window.api?.focusModeSetTargets) return
    setBusy(true)
    try {
      const next = await window.api.focusModeSetTargets(nextTargets)
      applyStatus(next)
    } catch {
      setMessage('Could not update blocked apps.')
    } finally {
      setBusy(false)
    }
  }

  const startWithDuration = async (choice: FocusDurationChoice) => {
    if (!window.api?.focusModeEnable) {
      setMessage('Focus Mode needs the Kip desktop app on Windows.')
      return
    }
    setBusy(true)
    try {
      const next = await window.api.focusModeEnable(choice)
      applyStatus(next)
    } catch {
      setMessage('Could not start Focus Mode.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (enabled: boolean) => {
    if (!window.api?.focusModeEnable || !window.api.focusModeDisable) {
      setMessage('Focus Mode needs the Kip desktop app on Windows.')
      return
    }
    if (enabled) {
      setPickerOpen(true)
      return
    }
    setBusy(true)
    try {
      // Off is refused while the timer runs — popup + stays on.
      const next = await window.api.focusModeDisable()
      applyStatus(next)
    } catch {
      setMessage('Could not change Focus Mode.')
    } finally {
      setBusy(false)
    }
  }

  const forceOff = async () => {
    if (!window.api?.focusModeForceDisable) {
      setMessage('Focus Mode needs the Kip desktop app on Windows.')
      return
    }
    setBusy(true)
    try {
      const next = await window.api.focusModeForceDisable()
      applyStatus(next)
    } catch {
      setMessage('Could not force-off Focus Mode.')
    } finally {
      setBusy(false)
    }
  }

  const remaining = status?.enabled ? formatFocusRemaining(status.remainingMs) : ''
  const until = status?.enabled ? formatFocusEndsAt(status.endsAt) : ''
  const showForceOff = Boolean(status?.enabled || status?.hostsActive)

  return (
    <div className="space-y-5">
      <h2 className="mb-1 text-[28px] font-bold tracking-[-0.03em]">Focus Mode</h2>
      <Row label="Block distractions">
        <Switch checked={status?.enabled ?? preferred} onChange={(value) => void toggle(value)} />
      </Row>
      {status?.enabled && remaining && (
        <Row label="Session ends">
          <span className="text-[13px] font-semibold tabular-nums text-accent-orange">
            {remaining}
            {until ? ` · ${until}` : ''}
          </span>
        </Row>
      )}
      {showForceOff && (
        <div className="space-y-2 rounded-[12px] border border-accent-orange/25 bg-accent-orange/5 p-4">
          <p className="text-[13px] font-semibold text-primary">Emergency unlock</p>
          <p className="text-[12px] leading-relaxed text-secondary">
            Force off clears the timer, restores the hosts file, and stops app blocking — even mid-session. Quitting Kip alone
            does not unlock sites while a session is active.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void forceOff()}
            className="rounded-[8px] bg-accent-orange px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            Force off Focus Mode
          </button>
        </div>
      )}
      <div className="space-y-2 rounded-[12px] border border-divider bg-primary p-4 shadow-card">
        <p className="text-[13px] font-semibold text-primary">Block these</p>
        <p className="text-[12px] leading-relaxed text-secondary">
          Highlighted apps/sites stay blocked. Tap to deselect — e.g. turn off Discord if you still want to use it during Focus.
        </p>
        <FocusTargetPicker
          selected={draftTargets}
          onChange={(next) => void updateTargets(next)}
          available={status?.availableTargets}
          disabled={busy || !desktop}
        />
      </div>
      {busy && <p className="text-body text-secondary">Applying… approve the Windows admin prompt if shown.</p>}
      {message && <p className="text-body text-secondary">{message}</p>}
      <div className="space-y-2 rounded-[12px] bg-primary p-4 text-[13px] leading-relaxed text-secondary shadow-card">
        <p>
          When you turn Focus Mode on, pick a duration and which distractions to block. Deselected apps (like Discord) stay
          usable. Kip redirects selected sites via the hosts file and closes matching desktop apps.
        </p>
        <p>
          While the timer is running, Focus Mode stays locked — flipping Off shows a reminder and keeps blocking. Use{' '}
          <span className="font-semibold text-primary">Force off Focus Mode</span> above to unlock early. When the session
          ends, blocking turns off automatically. Site blocking needs admin once (UAC).
        </p>
        {!desktop && <p className="text-accent-orange">Open the desktop Kip app to enable system blocking.</p>}
        {status?.needsElevation && (
          <p className="text-accent-orange">Hosts not updated yet — turn Focus Mode on again and approve admin to block websites.</p>
        )}
      </div>
      <FocusDurationDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(choice) => void startWithDuration(choice)}
        initialTargets={draftTargets}
        availableTargets={status?.availableTargets}
      />
    </div>
  )
}

function CalendarSection() {
  const calendars = useCalendarStore((state) => state.calendars)
  const defaultCalendarId = useSettingsStore((state) => state.defaultCalendarId)
  return (
    <div className="space-y-4">
      <h2 className="mb-1 text-[28px] font-bold tracking-[-0.03em]">Calendars</h2>
      <Row label="Default calendar">
        <Select
          className="min-w-[180px]"
          value={defaultCalendarId}
          onChange={useSettingsStore.getState().setDefaultCalendarId}
          label="Default calendar"
          options={calendars.map((calendar) => ({ value: calendar.id, label: calendar.name, color: calendar.color }))}
        />
      </Row>
    </div>
  )
}

function AlertSection() {
  const enabled = useSettingsStore((state) => state.notificationsEnabled)
  const reminder = useSettingsStore((state) => state.defaultReminder)
  return (
    <div className="space-y-4">
      <h2 className="mb-1 text-[28px] font-bold tracking-[-0.03em]">Alerts</h2>
      <Row label="System notifications">
        <Switch checked={enabled} onChange={useSettingsStore.getState().setNotificationsEnabled} />
      </Row>
      <Row label="Default alert">
        <Select
          className="min-w-[160px]"
          value={String(reminder)}
          onChange={(value) => useSettingsStore.getState().setDefaultReminder(Number(value))}
          label="Default alert"
          options={[
            { value: '0', label: 'None' },
            { value: '5', label: '5 minutes' },
            { value: '10', label: '10 minutes' },
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '1440', label: '1 day' },
          ]}
        />
      </Row>
      <p className="text-body text-secondary">
        Alerts open a custom centered popup (not Windows toast) with a chime while Kip is running, including tray. Quit stops alerts.
      </p>
    </div>
  )
}

function WeatherSection() {
  const enabled = useSettingsStore((state) => state.weatherEnabled)
  const city = useSettingsStore((state) => state.weatherCity)
  const key = useSettingsStore((state) => state.openWeatherKey)
  return (
    <div className="space-y-4">
      <h2 className="mb-1 text-[28px] font-bold tracking-[-0.03em]">Weather</h2>
      <Row label="Show forecast">
        <Switch checked={enabled} onChange={useSettingsStore.getState().setWeatherEnabled} />
      </Row>
      <label className="block text-body text-secondary">
        City
        <input className="field mt-1 w-full" value={city} placeholder="Use my location if empty" onChange={(event) => useSettingsStore.getState().setWeatherCity(event.target.value)} />
      </label>
      <label className="block text-body text-secondary">
        OpenWeatherMap key
        <input className="field mt-1 w-full" value={key} placeholder="Optional — Open-Meteo is used otherwise" onChange={(event) => useSettingsStore.getState().setOpenWeatherKey(event.target.value)} />
      </label>
      <p className="text-body text-secondary">Temperatures are shown in °C on the day and week headers.</p>
    </div>
  )
}

function KipAccountSection() {
  const profile = useAuthStore((state) => state.profile)
  const busy = useAuthStore((state) => state.busy)
  const syncStatus = useCalendarStore((state) => state.syncStatus)
  const [name, setName] = useState(profile?.displayName ?? '')
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '')
  const [city, setCity] = useState(profile?.city ?? '')

  useEffect(() => {
    setName(profile?.displayName ?? '')
    setAge(profile?.age ? String(profile.age) : '')
    setCity(profile?.city ?? '')
  }, [profile])

  return (
    <div className="space-y-4">
      <h2 className="mb-1 text-[28px] font-bold tracking-[-0.03em]">Account</h2>
      <div className="ios-card p-4">
        <div className="text-[15px] font-semibold">{profile?.displayName || 'Kip user'}</div>
        <div className="mt-1 text-[13px] text-secondary">{profile?.email || 'Signed in with Google'}</div>
        <div className="mt-2 text-[12px] text-tertiary">Cloud sync: {syncStatus}</div>
      </div>
      <label className="block text-body text-secondary">
        Display name
        <input className="field mt-1 w-full" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="block text-body text-secondary">
        Age
        <input className="field mt-1 w-full" value={age} inputMode="numeric" onChange={(event) => setAge(event.target.value.replace(/[^\d]/g, '').slice(0, 3))} />
      </label>
      <label className="block text-body text-secondary">
        City
        <input className="field mt-1 w-full" value={city} onChange={(event) => setCity(event.target.value)} />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          className="h-9 rounded-lg bg-accent-blue px-3 text-body text-white disabled:opacity-50"
          onClick={() => {
            void useAuthStore
              .getState()
              .saveProfile({
                displayName: name,
                age: age ? Number(age) : null,
                city,
                onboarded: true,
              })
              .then(() => {
                if (city.trim()) useSettingsStore.getState().setWeatherCity(city.trim())
                useCalendarStore.getState().pushToast('Profile saved')
              })
              .catch(() => undefined)
          }}
        >
          Save profile
        </button>
        <button
          type="button"
          className="h-9 rounded-lg px-3 text-body text-accent-red"
          onClick={() => {
            void import('@/store/confirmStore').then(({ askConfirm }) =>
              askConfirm({
                title: 'Sign out of Kip?',
                body: 'Your local data stays on this PC. Cloud sync pauses until you sign in again.',
                confirmLabel: 'Sign out',
              }).then((ok) => {
                if (ok) void useAuthStore.getState().signOut()
              }),
            )
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

function AccountSection() {
  const clientId = useSettingsStore((state) => state.googleClientId)
  const clientSecret = useSettingsStore((state) => state.googleClientSecret)
  const [google, setGoogle] = useState<AccountStatus>({ connected: false })
  const [icloud, setIcloud] = useState<AccountStatus>({ connected: false })
  const [appleId, setAppleId] = useState('')
  const [applePassword, setApplePassword] = useState('')
  const [busy, setBusy] = useState('')

  const refresh = () => {
    void window.api?.googleStatus().then(setGoogle)
    void window.api?.icloudStatus().then(setIcloud)
  }
  useEffect(refresh, [])

  const run = async (label: string, action: () => Promise<unknown>) => {
    if (!window.api) {
      useCalendarStore.getState().pushToast('Calendar connections run in the desktop app', 'error')
      return
    }
    setBusy(label)
    try {
      const result = await action()
      if (result && typeof result === 'object' && 'calendars' in result) mergeRemoteCalendars(result as never, label.startsWith('iCloud') ? 'icloud' : 'google')
      refresh()
    } catch (error) {
      useCalendarStore.getState().pushToast(error instanceof Error ? error.message : 'Account request failed', 'error')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="mb-1 text-[28px] font-bold tracking-[-0.03em]">Calendars sync</h2>
      <p className="text-body text-secondary">
        Optional. Connect Google Calendar / iCloud calendars. Kip account login is separate under Account.
      </p>
      <label className="block text-body text-secondary">Google client ID<input className="field mt-1 w-full" value={clientId} onChange={(event) => useSettingsStore.getState().setGoogleClientId(event.target.value)} /></label>
      <label className="block text-body text-secondary">Google client secret<input className="field mt-1 w-full" type="password" value={clientSecret} onChange={(event) => useSettingsStore.getState().setGoogleClientSecret(event.target.value)} /></label>
      <div className="flex gap-2">
        <button type="button" className="h-9 rounded-lg bg-accent-blue px-3 text-body text-white" disabled={!!busy} onClick={() => run('Google', () => window.api!.googleConnect({ clientId, clientSecret }))}>Connect Google</button>
        <button type="button" className="h-9 rounded-lg bg-tertiary px-3 text-body" disabled={!google.connected || !!busy} onClick={() => run('Google sync', () => window.api!.googleSync())}>Sync</button>
        <button type="button" className="h-9 rounded-lg px-3 text-body text-accent-red" onClick={() => disconnect('google')}>Disconnect</button>
      </div>
      <div className="text-[12px] text-secondary">{google.connected ? `Google · ${google.account ?? 'connected'}` : 'Google Calendar not connected'}{busy ? ` · ${busy}` : ''}</div>
      <label className="block text-body text-secondary">Apple ID<input className="field mt-1 w-full" value={appleId} onChange={(event) => setAppleId(event.target.value)} /></label>
      <label className="block text-body text-secondary">App-specific password<input className="field mt-1 w-full" type="password" value={applePassword} onChange={(event) => setApplePassword(event.target.value)} /></label>
      <div className="flex gap-2">
        <button type="button" className="h-9 rounded-lg bg-accent-blue px-3 text-body text-white" disabled={!!busy} onClick={() => run('iCloud', () => window.api!.icloudConnect({ username: appleId, password: applePassword }))}>Connect iCloud</button>
        <button type="button" className="h-9 rounded-lg bg-tertiary px-3 text-body" disabled={!icloud.connected || !!busy} onClick={() => run('iCloud sync', () => window.api!.icloudSync())}>Sync</button>
        <button type="button" className="h-9 rounded-lg px-3 text-body text-accent-red" onClick={() => disconnect('icloud')}>Disconnect</button>
      </div>
      <div className="text-[12px] text-secondary">{icloud.connected ? `iCloud · ${icloud.account}` : 'iCloud not connected'}</div>
    </div>
  )
}

function disconnect(provider: 'google' | 'icloud') {
  void import('@/store/confirmStore').then(({ askConfirm }) =>
    askConfirm({
      title: provider === 'google' ? 'Disconnect Google?' : 'Disconnect iCloud?',
      body: 'Synced calendars from this account will be removed locally.',
      confirmLabel: 'Disconnect',
    }).then((ok) => {
      if (!ok) return
      const calendars = useCalendarStore.getState().calendars.filter((calendar) => calendar.provider === provider)
      void (provider === 'google' ? window.api?.googleDisconnect() : window.api?.icloudDisconnect())
      calendars.forEach((calendar) => {
        useEventStore.getState().removeByCalendar(calendar.id)
        useCalendarStore.getState().removeCalendar(calendar.id)
      })
    }),
  )
}

function ShortcutSection() {
  const rows = [
    ['Ctrl K', 'New event'],
    ['Ctrl T', 'Go to today'],
    ['Ctrl F', 'Search'],
    ['← / →', 'Previous / next period'],
    ['1 – 5', 'Day, week, month, quarter, year'],
    ['Esc', 'Close the top panel'],
  ]
  return (
    <div>
      <h2 className="mb-4 text-[28px] font-bold tracking-[-0.03em]">Shortcuts</h2>
      <div className="ios-card">
        {rows.map(([key, label]) => (
          <div key={key} className="ios-row justify-between text-[15px]">
            <span>{label}</span>
            <span className="rounded-[8px] bg-fill/12 px-2.5 py-1 text-[12px] font-semibold text-secondary">{key}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ios-card">
      <div className="ios-row justify-between gap-4">
        <div className="text-[15px] tracking-[-0.01em]">{label}</div>
        {children}
      </div>
    </div>
  )
}
