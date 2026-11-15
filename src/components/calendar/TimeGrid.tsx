import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react'
import { addDays, addMinutes, differenceInMinutes, format, isSameDay, isToday, parseISO, startOfDay } from 'date-fns'
import { GUTTER, HOUR_HEIGHT, SNAP_MINUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { combineDateAndMinutes, formatHourLabel, toDateKey } from '@/lib/dates'
import { layoutSegments } from '@/lib/layout'
import { eventDateKeys } from '@/lib/dates'
import { blankDraft } from '@/lib/draft'
import { eventStyle } from '@/lib/colors'
import type { CalendarEvent } from '@/types'
import { EventBlock } from '@/components/events/EventBlock'
import { WeatherWidget } from '@/components/ui/WeatherWidget'
import { useTheme } from '@/hooks/useTheme'
import { useNow } from '@/hooks/useNow'
import { useEvents } from '@/hooks/useEvents'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useSettingsStore } from '@/store/settingsStore'

export function TimeGrid({ days }: { days: Date[] }) {
  const theme = useTheme()
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const selectedKey = useCalendarStore((state) => state.selectedDate)
  const setSelectedDate = useCalendarStore((state) => state.setSelectedDate)
  const focusTick = useCalendarStore((state) => state.focusTick)
  const openPopover = useCalendarStore((state) => state.openPopover)
  const moveEvent = useEventStore((state) => state.moveEvent)
  const calendars = useCalendarStore((state) => state.calendars)
  const now = useNow()
  const rangeEnd = addDays(startOfDay(days[days.length - 1]), 1)
  const events = useEvents(startOfDay(days[0]), rangeEnd)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<{ dayIndex: number; startMin: number; endMin: number } | null>(null)
  const periodKey = days.map((day) => toDateKey(day)).join('|')
  const colorOf = (id: string) => calendars.find((calendar) => calendar.id === id)?.color ?? '#0A84FF'

  const scrollKey = `${periodKey}:${focusTick}`
  const scrolled = useRef('')
  if (scrolled.current !== scrollKey) scrolled.current = scrollKey

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 border-b border-divider">
        <div style={{ width: GUTTER }} />
        {days.map((day) => {
          const today = isToday(day)
          const selected = toDateKey(day) === selectedKey
          return (
            <button key={toDateKey(day)} type="button" onClick={() => setSelectedDate(toDateKey(day))} className="flex-1 py-2 text-center">
              <div className={cn('text-[11px] font-medium', today ? 'text-accent-red' : 'text-tertiary')}>{format(day, 'EEE')}</div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[18px] font-semibold leading-none tracking-[-0.02em]',
                  today && 'bg-accent-red text-white',
                  selected && !today && 'bg-accent-blue text-white',
                  !today && !selected && 'text-primary',
                )}
              >
                {format(day, 'd')}
              </div>
              <WeatherWidget date={day} />
            </button>
          )
        })}
      </div>
      <AllDayRow days={days} events={events.filter((event) => event.allDay)} colorOf={colorOf} theme={theme} onOpen={openPopover} onMove={moveEvent} />
      <ScrollArea scrollKey={scrollKey} scrollerRef={scrollerRef} days={days}>
        <div className="relative flex" style={{ height: 24 * HOUR_HEIGHT }}>
          <div className="relative shrink-0" style={{ width: GUTTER }}>
            {Array.from({ length: 24 }, (_, hour) =>
              hour === 0 ? null : (
                <div key={hour} className="absolute right-3 -translate-y-1/2 text-[11px] text-tertiary" style={{ top: hour * HOUR_HEIGHT }}>
                  {formatHourLabel(hour, timeFormat)}
                </div>
              ),
            )}
          </div>
          <div ref={columnsRef} className="relative flex min-w-0 flex-1">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour}>
                <div className="pointer-events-none absolute left-0 right-0 border-t border-divider" style={{ top: hour * HOUR_HEIGHT }} />
                <div className="pointer-events-none absolute left-0 right-0 border-t border-divider opacity-35" style={{ top: hour * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
              </div>
            ))}
            {days.map((day, index) => (
              <DayColumn
                key={toDateKey(day)}
                day={day}
                index={index}
                events={events}
                colorOf={colorOf}
                theme={theme}
                timeFormat={timeFormat}
                draft={draft?.dayIndex === index ? draft : null}
                selected={toDateKey(day) === selectedKey}
                onDraft={setDraft}
                onOpen={openPopover}
                onMove={(event, start, end) => moveEvent(event, start.toISOString(), end.toISOString())}
                dayWidth={() => (columnsRef.current ? columnsRef.current.clientWidth / days.length : 140)}
                allowDayShift={days.length > 1}
              />
            ))}
            <NowLine days={days} now={now} />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function ScrollArea({
  children,
  scrollKey,
  scrollerRef,
  days,
}: {
  children: ReactNode
  scrollKey: string
  scrollerRef: RefObject<HTMLDivElement>
  days: Date[]
}) {
  useEffect(() => {
    const node = scrollerRef.current
    if (!node) return
    const now = new Date()
    const hour = days.some((day) => isSameDay(day, now)) ? now.getHours() + now.getMinutes() / 60 : 7.5
    const nowY = hour * HOUR_HEIGHT
    // Center the now-line (or morning fallback) in the visible time grid.
    node.scrollTo({ top: Math.max(0, nowY - node.clientHeight / 2), behavior: 'smooth' })
  }, [scrollKey, scrollerRef, days])
  return (
    <div ref={scrollerRef} className="scroll-momentum min-h-0 flex-1">
      {children}
    </div>
  )
}

function DayColumn({
  day,
  index,
  events,
  colorOf,
  theme,
  timeFormat,
  draft,
  selected,
  onDraft,
  onOpen,
  onMove,
  dayWidth,
  allowDayShift,
}: {
  day: Date
  index: number
  events: CalendarEvent[]
  colorOf: (id: string) => string
  theme: 'light' | 'dark'
  timeFormat: '12h' | '24h'
  draft: { startMin: number; endMin: number } | null
  selected: boolean
  onDraft: (draft: { dayIndex: number; startMin: number; endMin: number } | null) => void
  onOpen: (event: CalendarEvent, x: number, y: number) => void
  onMove: (event: CalendarEvent, start: Date, end: Date) => void
  dayWidth: () => number
  allowDayShift: boolean
}) {
  const weekend = day.getDay() === 0 || day.getDay() === 6
  const today = isToday(day)
  const segments = events
    .map((event) => {
      const segment = timedSegment(event, day)
      return segment ? { ...segment, event } : null
    })
    .filter((segment): segment is { startMin: number; endMin: number; event: CalendarEvent; id: string } => Boolean(segment))
  const placed = layoutSegments(segments.map((segment) => ({ id: segment.event.id, startMin: segment.startMin, endMin: segment.endMin })))
  const byId = new Map(segments.map((segment) => [segment.event.id, segment.event]))

  const beginCreate = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('[data-event]')) return
    const column = event.currentTarget
    const anchor = snap(yToMinutes(event.clientY, column))
    const point = { x: event.clientX, y: event.clientY }
    let current = anchor
    let moved = false
    onDraft({ dayIndex: index, startMin: anchor, endMin: Math.min(24 * 60, anchor + 60) })
    const move = (pointer: PointerEvent) => {
      moved = true
      current = snap(yToMinutes(pointer.clientY, column))
      const startMin = clamp(Math.min(anchor, current), 0, 24 * 60 - 15)
      const endMin = clamp(Math.max(anchor, current), startMin + 15, 24 * 60)
      onDraft({ dayIndex: index, startMin, endMin })
    }
    const up = (pointer: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const startMin = clamp(Math.min(anchor, moved ? current : anchor), 0, 24 * 60 - 15)
      const endMin = clamp(Math.max(startMin + (moved ? 15 : 60), moved ? current : anchor + 60), startMin + 15, 24 * 60)
      onDraft(null)
      useCalendarStore.getState().setSelectedDate(toDateKey(day))
      useCalendarStore.getState().openEventModal({
        mode: 'create',
        series: false,
        anchor: { x: point.x, y: pointer.clientY || point.y },
        draft: blankDraft({
          start: combineDateAndMinutes(day, startMin).toISOString(),
          end: combineDateAndMinutes(day, endMin).toISOString(),
        }),
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      data-date-key={toDateKey(day)}
      className="relative min-w-0 flex-1 border-l border-divider"
      style={{
        background: today ? 'rgb(var(--accent-red) / 0.03)' : selected ? 'rgb(var(--accent-blue) / 0.035)' : weekend ? 'rgb(var(--fg) / 0.018)' : undefined,
      }}
      onPointerDown={beginCreate}
    >
      {placed.map((segment) => {
        const event = byId.get(segment.id)
        if (!event) return null
        return (
          <EventBlock
            key={event.id}
            event={event}
            top={(segment.startMin / 60) * HOUR_HEIGHT}
            height={Math.max(18, ((segment.endMin - segment.startMin) / 60) * HOUR_HEIGHT)}
            col={segment.col}
            cols={segment.cols}
            color={colorOf(event.calendarId)}
            theme={theme}
            timeFormat={timeFormat}
            dayWidth={dayWidth}
            allowDayShift={allowDayShift}
            onOpen={onOpen}
            onMove={onMove}
          />
        )
      })}
      {draft && (
        <div
          className="pointer-events-none absolute border border-accent-blue/50 bg-accent-blue/20"
          style={{
            top: (draft.startMin / 60) * HOUR_HEIGHT,
            height: ((draft.endMin - draft.startMin) / 60) * HOUR_HEIGHT,
            left: 0,
            right: 0,
          }}
        />
      )}
    </div>
  )
}

function AllDayRow({
  days,
  events,
  colorOf,
  theme,
  onOpen,
  onMove,
}: {
  days: Date[]
  events: CalendarEvent[]
  colorOf: (id: string) => string
  theme: 'light' | 'dark'
  onOpen: (event: CalendarEvent, x: number, y: number) => void
  onMove: (event: CalendarEvent, startIso: string, endIso: string) => void
}) {
  return (
    <div className="flex max-h-28 shrink-0 overflow-auto border-b border-divider">
      <div className="pt-2 text-right text-[10px] font-medium tracking-wider text-tertiary" style={{ width: GUTTER, paddingRight: 12 }}>
        ALL-DAY
      </div>
      <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((day) => {
          const key = toDateKey(day)
          const items = events.filter((event) => eventDateKeys(event.start, event.end).includes(key))
          return (
            <div key={key} data-date-key={key} className="min-h-9 space-y-1 border-l border-divider p-1">
              {items.map((event) => {
                const colors = eventStyle(colorOf(event.calendarId), theme)
                return (
                  <button
                    key={event.id}
                    type="button"
                    data-event
                    className="block w-full truncate px-1.5 py-0.5 text-left text-[11px] font-medium"
                    style={{ background: colors.background, color: colors.color, boxShadow: `inset 3px 0 0 ${colors.bar}` }}
                    onPointerDown={(pointer) => startAllDayDrag(pointer, event, day, onOpen, onMove)}
                  >
                    {event.title}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function startAllDayDrag(
  pointer: ReactPointerEvent,
  event: CalendarEvent,
  day: Date,
  onOpen: (event: CalendarEvent, x: number, y: number) => void,
  onMove: (event: CalendarEvent, startIso: string, endIso: string) => void,
) {
  pointer.stopPropagation()
  const originX = pointer.clientX
  const originY = pointer.clientY
  let moved = false
  const move = (next: PointerEvent) => {
    if (Math.abs(next.clientX - originX) > 4 || Math.abs(next.clientY - originY) > 4) moved = true
  }
  const up = (next: PointerEvent) => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    const target = document.elementFromPoint(next.clientX, next.clientY)?.closest('[data-date-key]')
    const key = target?.getAttribute('data-date-key')
    if (moved && key && key !== toDateKey(day)) {
      const [year, month, date] = key.split('-').map(Number)
      const nextDay = new Date(year, month - 1, date)
      const delta = differenceInMinutes(startOfDay(nextDay), startOfDay(day))
      onMove(event, addMinutes(parseISO(event.start), delta).toISOString(), addMinutes(parseISO(event.end), delta).toISOString())
      return
    }
    onOpen(event, next.clientX, next.clientY)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function NowLine({ days, now }: { days: Date[]; now: Date }) {
  const index = days.findIndex((day) => isSameDay(day, now))
  if (index < 0) return null
  const top = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top, transition: 'top 1s linear' }}>
      <div className="relative border-t-2 border-accent-red">
        <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-red" style={{ left: `${(index / days.length) * 100}%` }} />
      </div>
    </div>
  )
}

function timedSegment(event: CalendarEvent, day: Date): { id: string; startMin: number; endMin: number } | null {
  if (event.allDay) return null
  const dayStart = startOfDay(day)
  const dayEnd = addDays(dayStart, 1)
  const start = parseISO(event.start)
  const end = parseISO(event.end)
  if (end <= dayStart || start >= dayEnd) return null
  const segStart = start < dayStart ? dayStart : start
  const segEnd = end > dayEnd ? dayEnd : end
  const startMin = differenceInMinutes(segStart, dayStart)
  const endMin = Math.max(startMin + SNAP_MINUTES, differenceInMinutes(segEnd, dayStart))
  return { id: event.id, startMin, endMin }
}

function yToMinutes(clientY: number, column: HTMLElement): number {
  const rect = column.getBoundingClientRect()
  return ((clientY - rect.top) / HOUR_HEIGHT) * 60
}

function snap(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
