import { format, isSameDay, parseISO, startOfDay, addDays } from 'date-fns'
import { expandEvents } from '@/lib/recurrence'
import { formatTime } from '@/lib/dates'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useSettingsStore } from '@/store/settingsStore'

export function TrayPopup() {
  const events = useEventStore((state) => state.events)
  const calendars = useCalendarStore((state) => state.calendars)
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const today = new Date()
  const visible = new Set(calendars.filter((calendar) => calendar.visible).map((calendar) => calendar.id))
  const items = expandEvents(events, startOfDay(today), addDays(startOfDay(today), 1))
    .filter((event) => visible.has(event.calendarId) && (event.allDay || isSameDay(parseISO(event.start), today)))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start))

  return (
    <div className="flex h-full flex-col bg-secondary text-primary">
      <div className="drag border-b border-divider px-4 py-3">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-tertiary">TODAY</div>
        <div className="text-header font-semibold">{format(today, 'EEEE, MMMM d')}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {items.length === 0 && <div className="py-10 text-center text-body text-secondary">No Items</div>}
        {items.map((event) => {
          const color = calendars.find((calendar) => calendar.id === event.calendarId)?.color ?? '#0A84FF'
          return (
            <button
              key={event.id}
              type="button"
              className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-tertiary"
              onClick={() => window.api?.openMain(event.start)}
            >
              <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              <span>
                <span className="block text-body font-medium">{event.title}</span>
                <span className="text-[12px] text-secondary">{event.allDay ? 'All day' : formatTime(parseISO(event.start), timeFormat)}</span>
              </span>
            </button>
          )
        })}
      </div>
      <button type="button" className="m-3 h-9 rounded-lg bg-accent-blue text-body font-medium text-white" onClick={() => window.api?.openMain(today.toISOString())}>
        Open Kip
      </button>
    </div>
  )
}
