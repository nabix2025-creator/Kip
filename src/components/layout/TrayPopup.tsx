import { useEffect, useState } from 'react'
import { format, isSameDay, parseISO, startOfDay, addDays } from 'date-fns'
import { expandEvents } from '@/lib/recurrence'
import { formatTime } from '@/lib/dates'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useSettingsStore } from '@/store/settingsStore'

type TrayItem = { id: string; title: string; time: string; color: string; start?: string }

export function TrayPopup() {
  const events = useEventStore((state) => state.events)
  const calendars = useCalendarStore((state) => state.calendars)
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const today = new Date()
  const [live, setLive] = useState<{ dateLabel: string; events: TrayItem[] } | null>(null)

  useEffect(() => {
    void window.api?.getTrayEvents?.().then((payload) => {
      if (payload?.events) setLive(payload)
    })
    return window.api?.onTrayEvents?.((payload) => setLive(payload))
  }, [])

  const visible = new Set(calendars.filter((calendar) => calendar.visible).map((calendar) => calendar.id))
  const colors = new Map(calendars.map((calendar) => [calendar.id, calendar.color]))
  const fromStore: TrayItem[] = expandEvents(events, startOfDay(today), addDays(startOfDay(today), 1))
    .filter((event) => visible.has(event.calendarId) && (event.allDay || isSameDay(parseISO(event.start), today)))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start))
    .map((event) => ({
      id: event.id,
      title: event.title,
      time: event.allDay ? 'All day' : formatTime(parseISO(event.start), timeFormat),
      color: colors.get(event.calendarId) ?? '#0A84FF',
      start: event.start,
    }))

  // Prefer live payload from main (kept fresh by the main window) so tray click always shows today's events.
  const items = live ? live.events : fromStore
  const dateLabel = live?.dateLabel || format(today, 'EEEE, MMMM d')

  return (
    <div className="flex h-full flex-col bg-secondary text-primary">
      <div className="drag border-b border-divider px-4 py-3">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-tertiary">TODAY</div>
        <div className="text-header font-semibold">{dateLabel}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {items.length === 0 && <div className="py-10 text-center text-body text-secondary">No events today</div>}
        {items.map((event) => (
          <button
            key={event.id}
            type="button"
            className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-tertiary"
            onClick={() => window.api?.openMain(event.start ?? today.toISOString())}
          >
            <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: event.color }} />
            <span>
              <span className="block text-body font-medium">{event.title}</span>
              <span className="text-[12px] text-secondary">{event.time}</span>
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="m-3 h-9 rounded-lg bg-accent-blue text-body font-medium text-white"
        onClick={() => window.api?.openMain(today.toISOString())}
      >
        Open Kip
      </button>
    </div>
  )
}
