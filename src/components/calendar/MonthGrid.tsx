import { format, isSameDay, isSameMonth, isToday } from 'date-fns'
import { cn } from '@/lib/cn'
import { eventStyle } from '@/lib/colors'
import { formatTime, getMonthGrid, toDateKey, weekdayLabels } from '@/lib/dates'
import type { CalendarEvent, ViewMode } from '@/types'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'

interface Props {
  month: Date
  variant: 'month' | 'quarter' | 'year'
  byDay: Map<string, CalendarEvent[]>
  weekStartsOn: 0 | 1
  selected: Date
  timeFormat: '12h' | '24h'
  theme: 'light' | 'dark'
  colorOf: (id: string) => string
  onSelect: (date: Date) => void
}

export function MonthGrid({ month, variant, byDay, weekStartsOn, selected, timeFormat, theme, colorOf, onSelect }: Props) {
  const days = getMonthGrid(month, weekStartsOn)
  const labels = weekdayLabels(weekStartsOn)
  const dense = variant !== 'month'
  const openDay = (date: Date, view: ViewMode = 'day') => {
    onSelect(date)
    useCalendarStore.getState().setView(view)
  }

  return (
    <div className={cn('flex min-h-0 flex-col', variant === 'month' && 'h-full')}>
      {variant !== 'month' && (
        <button type="button" className="mb-1 px-1 text-left text-body font-semibold hover:text-accent-blue" onClick={() => openDay(month, 'month')}>
          {format(month, variant === 'year' ? 'MMMM' : 'MMMM yyyy')}
        </button>
      )}
      <div className={cn('grid grid-cols-7', dense ? 'mb-1' : 'border-b border-divider')}>
        {labels.map((label) => (
          <div key={label} className={cn('text-center text-[10px] font-medium tracking-wider text-tertiary', dense ? 'py-0.5' : 'py-2')}>
            {dense ? label.slice(0, 1) : label.slice(0, 3)}
          </div>
        ))}
      </div>
      <div className={cn('grid min-h-0 flex-1 grid-cols-7', variant === 'month' && 'grid-rows-6')}>
        {days.map((day) => {
          const key = toDateKey(day)
          const items = (byDay.get(key) ?? []).slice().sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start))
          const outside = !isSameMonth(day, month)
          const today = isToday(day)
          const isSelected = isSameDay(day, selected)
          return (
            <div
              key={key}
              data-date-key={key}
              className={cn('min-w-0 border-divider', variant === 'month' ? 'border-b border-r p-1' : 'px-0.5 py-0.5', outside && 'opacity-40')}
              onClick={() => onSelect(day)}
              onDoubleClick={() => openDay(day)}
            >
              <div className={cn('mb-1 flex', dense && 'mb-0 justify-center')}>
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full font-medium',
                    dense ? 'h-5 w-5 text-[11px]' : 'h-6 w-6 text-body',
                    today && 'bg-accent-red text-white',
                    isSelected && !today && 'bg-accent-blue text-white',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
              {variant === 'month' && (
                <div className="space-y-1">
                  {items.slice(0, 3).map((event) => (
                    <EventPill key={event.id} event={event} color={colorOf(event.calendarId)} theme={theme} timeFormat={timeFormat} />
                  ))}
                  {items.length > 3 && (
                    <button type="button" className="px-1 text-[11px] font-medium text-secondary hover:text-primary" onClick={() => openDay(day)}>
                      +{items.length - 3} more
                    </button>
                  )}
                </div>
              )}
              {variant !== 'month' && items.length > 0 && (
                <div className="flex justify-center gap-px">
                  {items.slice(0, 3).map((event) => (
                    <span key={event.id} className="h-1 w-1 rounded-full" style={{ background: colorOf(event.calendarId) }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventPill({ event, color, theme, timeFormat }: { event: CalendarEvent; color: string; theme: 'light' | 'dark'; timeFormat: '12h' | '24h' }) {
  const colors = eventStyle(color, theme)
  const open = useCalendarStore((state) => state.openPopover)
  const moveEvent = useEventStore((state) => state.moveEvent)
  const status = useEventStore((state) => state.statuses[event.id] ?? event.status ?? 'open')
  return (
    <button
      type="button"
      data-event
      className={cn(
        'block w-full truncate px-1 py-0.5 text-left text-[11px] font-medium',
        status === 'done' && 'opacity-55 line-through',
        status === 'missed' && 'opacity-80',
      )}
      style={{
        background: colors.background,
        color: colors.color,
        boxShadow: `inset 2px 0 0 ${status === 'missed' ? '#FF3B30' : colors.bar}`,
      }}
      onClick={(click) => {
        click.stopPropagation()
        open(event, click.clientX, click.clientY)
      }}
      onPointerDown={(pointer) => {
        if (pointer.button !== 0) return
        pointer.stopPropagation()
        const originX = pointer.clientX
        const originY = pointer.clientY
        let moved = false
        const move = (next: PointerEvent) => {
          if (Math.abs(next.clientX - originX) > 5 || Math.abs(next.clientY - originY) > 5) moved = true
        }
        const up = (next: PointerEvent) => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          if (!moved) return
          const key = document.elementFromPoint(next.clientX, next.clientY)?.closest('[data-date-key]')?.getAttribute('data-date-key')
          if (!key || key === toDateKey(new Date(event.start))) return
          const [year, month, date] = key.split('-').map(Number)
          const start = new Date(event.start)
          const end = new Date(event.end)
          const duration = end.getTime() - start.getTime()
          const nextStart = new Date(year, month - 1, date, start.getHours(), start.getMinutes(), 0, 0)
          moveEvent(event, nextStart.toISOString(), new Date(nextStart.getTime() + duration).toISOString())
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }}
    >
      {!event.allDay && <span className="mr-1 opacity-70">{formatTime(new Date(event.start), timeFormat)}</span>}
      {event.title}
    </button>
  )
}
