import { format, parseISO } from 'date-fns'
import { useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/dates'
import { describeRecurrence } from '@/lib/recurrence'
import { askConfirm } from '@/store/confirmStore'
import { draftFromEvent, eventStatusOf, useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { EventStatus } from '@/types'

export function EventPopover() {
  const popover = useCalendarStore((state) => state.popover)
  const close = () => useCalendarStore.setState({ popover: null })
  const calendars = useCalendarStore((state) => state.calendars)
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const statuses = useEventStore((state) => state.statuses)
  const deleteEvent = useEventStore((state) => state.deleteEvent)
  const setEventStatus = useEventStore((state) => state.setEventStatus)

  useEffect(() => {
    if (!popover) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('[data-popover]')) return
      close()
    }
    window.addEventListener('pointerdown', onPointer)
    return () => window.removeEventListener('pointerdown', onPointer)
  }, [popover])

  if (!popover) return null
  const event = popover.event
  const calendar = calendars.find((item) => item.id === event.calendarId)
  const left = Math.min(popover.x, window.innerWidth - 320)
  const top = Math.min(popover.y, window.innerHeight - 300)
  const series = Boolean(event.seriesId || event.recurrence)
  const status = eventStatusOf(event, statuses)

  const setStatus = (next: EventStatus) => {
    setEventStatus(event, next)
    useCalendarStore.setState({
      popover: { ...popover, event: { ...event, status: next } },
    })
  }

  return (
    <div data-popover className="glass fixed z-[70] w-[300px] overflow-hidden" style={{ left: Math.max(12, left), top: Math.max(12, top) }}>
      <div className="h-1.5" style={{ background: calendar?.color ?? '#0A84FF' }} />
      <div className="p-4">
        <div className={cn('text-title font-semibold', status === 'done' && 'text-secondary line-through')}>{event.title}</div>
        <div className="mt-1 text-body text-secondary">
          {event.allDay
            ? format(parseISO(event.start), 'EEEE, MMMM d')
            : `${format(parseISO(event.start), 'EEE, MMM d')} · ${formatTime(parseISO(event.start), timeFormat)} – ${formatTime(parseISO(event.end), timeFormat)}`}
        </div>
        {event.location && <div className="mt-2 text-body">{event.location}</div>}
        {event.notes && <div className="mt-2 whitespace-pre-wrap text-body text-secondary">{event.notes}</div>}
        {describeRecurrence(event) && <div className="mt-2 text-[12px] text-secondary">{describeRecurrence(event)}</div>}
        {event.reminders.length > 0 && (
          <div className="mt-1 text-[12px] text-tertiary">Alert {event.reminders.map((minutes) => `${minutes}m`).join(', ')} before</div>
        )}
        <div className="mt-1 text-[12px] text-tertiary">{calendar?.name}</div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <StatusChip active={status === 'open'} label="Open" onClick={() => setStatus('open')} />
          <StatusChip
            active={status === 'done'}
            label="Done"
            tone="good"
            icon={<Check size={12} strokeWidth={2.4} />}
            onClick={() => setStatus('done')}
          />
          <StatusChip
            active={status === 'missed'}
            label="Missed"
            tone="bad"
            icon={<X size={12} strokeWidth={2.4} />}
            onClick={() => setStatus('missed')}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="h-8 flex-1 rounded-lg bg-tertiary text-body font-medium"
            onClick={() => {
              const master = event.seriesId ? useEventStore.getState().events.find((item) => item.id === event.seriesId) : undefined
              useCalendarStore.getState().openEventModal({
                mode: 'edit',
                series: false,
                draft: draftFromEvent(master ? { ...event, recurrence: master.recurrence } : event, event.calendarId),
              })
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="h-8 rounded-lg px-3 text-body text-accent-red"
            onClick={() => {
              void askConfirm({ title: 'Delete event?', body: event.title, confirmLabel: 'Delete' }).then((ok) => {
                if (!ok) return
                deleteEvent(event, 'single')
                close()
              })
            }}
          >
            Delete
          </button>
        </div>
        {series && (
          <button
            type="button"
            className="mt-2 text-[12px] text-secondary hover:text-accent-red"
            onClick={() => {
              void askConfirm({
                title: 'Delete entire series?',
                body: `All events in “${event.title}” will be removed.`,
                confirmLabel: 'Delete series',
              }).then((ok) => {
                if (!ok) return
                deleteEvent(event, 'series')
                close()
              })
            }}
          >
            Delete all events in series
          </button>
        )}
      </div>
    </div>
  )
}

function StatusChip({
  active,
  label,
  onClick,
  tone,
  icon,
}: {
  active: boolean
  label: string
  onClick: () => void
  tone?: 'good' | 'bad'
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 items-center justify-center gap-1 rounded-[8px] text-[12px] font-medium transition-colors',
        active && tone === 'good' && 'bg-accent-green text-white',
        active && tone === 'bad' && 'bg-accent-red text-white',
        active && !tone && 'bg-fill/16 text-primary',
        !active && 'bg-fill/8 text-secondary hover:bg-fill/12',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
