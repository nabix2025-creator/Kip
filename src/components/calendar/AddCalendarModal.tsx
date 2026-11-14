import { useState } from 'react'
import { PALETTE } from '@/lib/constants'
import { mergeRemoteCalendars } from '@/lib/googleCalendar'
import { Modal } from '@/components/ui/Modal'
import { useCalendarStore } from '@/store/calendarStore'
import { useSettingsStore } from '@/store/settingsStore'

type Tab = 'local' | 'google' | 'icloud'

export function AddCalendarModal() {
  const open = useCalendarStore((state) => state.addCalendarOpen)
  const close = () => useCalendarStore.setState({ addCalendarOpen: false })
  const [tab, setTab] = useState<Tab>('local')
  const [name, setName] = useState('New Calendar')
  const [color, setColor] = useState<string>(PALETTE[4].value)
  const [appleId, setAppleId] = useState('')
  const [password, setPassword] = useState('')
  const clientId = useSettingsStore((state) => state.googleClientId)
  const clientSecret = useSettingsStore((state) => state.googleClientSecret)

  return (
    <Modal open={open} onClose={close} width={440}>
      <div className="p-4">
        <div className="text-header font-semibold">Add Calendar</div>
        <div className="mt-3 flex gap-1">
          {(['local', 'google', 'icloud'] as Tab[]).map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-1 text-[12px] capitalize ${tab === item ? 'bg-accent-blue text-white' : 'bg-tertiary'}`}>
              {item === 'icloud' ? 'iCloud' : item}
            </button>
          ))}
        </div>
        {tab === 'local' && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              useCalendarStore.getState().addCalendar({ name: name.trim() || 'Calendar', color, provider: 'local', group: 'Other', visible: true })
              close()
            }}
          >
            <input className="field w-full" value={name} onChange={(event) => setName(event.target.value)} />
            <div className="flex gap-2">
              {PALETTE.map((swatch) => (
                <button key={swatch.id} type="button" aria-label={swatch.label} className="h-6 w-6 rounded-full" style={{ background: swatch.value, outline: color === swatch.value ? '2px solid white' : undefined, outlineOffset: 2 }} onClick={() => setColor(swatch.value)} />
              ))}
            </div>
            <button className="h-9 rounded-lg bg-accent-blue px-4 text-body font-medium text-white" type="submit">Create</button>
          </form>
        )}
        {tab === 'google' && (
          <div className="mt-4 space-y-3">
            <input className="field w-full" placeholder="Client ID" value={clientId} onChange={(event) => useSettingsStore.getState().setGoogleClientId(event.target.value)} />
            <input className="field w-full" placeholder="Client secret" type="password" value={clientSecret} onChange={(event) => useSettingsStore.getState().setGoogleClientSecret(event.target.value)} />
            <button
              type="button"
              className="h-9 rounded-lg bg-accent-blue px-4 text-body font-medium text-white"
              onClick={() => {
                void window.api?.googleConnect({ clientId, clientSecret }).then((payload) => {
                  mergeRemoteCalendars(payload, 'google')
                  close()
                }).catch((error) => useCalendarStore.getState().pushToast(error instanceof Error ? error.message : 'Google connection failed', 'error'))
              }}
            >
              Connect Google Calendar
            </button>
          </div>
        )}
        {tab === 'icloud' && (
          <div className="mt-4 space-y-3">
            <input className="field w-full" placeholder="Apple ID" value={appleId} onChange={(event) => setAppleId(event.target.value)} />
            <input className="field w-full" placeholder="App-specific password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button
              type="button"
              className="h-9 rounded-lg bg-accent-blue px-4 text-body font-medium text-white"
              onClick={() => {
                void window.api?.icloudConnect({ username: appleId, password }).then((payload) => {
                  mergeRemoteCalendars(payload, 'icloud')
                  close()
                }).catch((error) => useCalendarStore.getState().pushToast(error instanceof Error ? error.message : 'iCloud connection failed', 'error'))
              }}
            >
              Connect iCloud
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
