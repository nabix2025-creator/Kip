import { useRef } from 'react'
import { addDays, addMinutes, format, parseISO } from 'date-fns'
import { Check } from 'lucide-react'
import { HOUR_HEIGHT, SNAP_MINUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/dates'
import { eventStyle } from '@/lib/colors'
import { eventStatusOf, useEventStore } from '@/store/eventStore'
import type { CalendarEvent, TimeFormat } from '@/types'

interface Props {
  event: CalendarEvent
  top: number
  height: number
  col: number
  cols: number
  color: string
  theme: 'light' | 'dark'
  timeFormat: TimeFormat
  dayWidth: () => number
  allowDayShift: boolean
  onOpen: (event: CalendarEvent, x: number, y: number) => void
  onMove: (event: CalendarEvent, start: Date, end: Date) => void
}

export function EventBlock({ event, top, height, col, cols, color, theme, timeFormat, dayWidth, allowDayShift, onOpen, onMove }: Props) {
  const colors = eventStyle(color, theme)
  const status = useEventStore((state) => eventStatusOf(event, state.statuses))
  const dragRef = useRef<HTMLDivElement>(null)
  const compact = height < 36
  const tiny = height < 24
  const done = status === 'done'
  const missed = status === 'missed'

  const onPointerDown = (pointer: React.PointerEvent) => {
    if (pointer.button !== 0) return
    pointer.stopPropagation()
    pointer.preventDefault()
    const resizing = Boolean((pointer.target as HTMLElement).closest('[data-resize]'))
    const originX = pointer.clientX
    const originY = pointer.clientY
    let dx = 0
    let dy = 0
    const node = dragRef.current
    const move = (next: PointerEvent) => {
      dx = next.clientX - originX
      dy = next.clientY - originY
      if (!node) return
      if (resizing) {
        const snapped = Math.round(dy / (HOUR_HEIGHT / (60 / SNAP_MINUTES))) * (HOUR_HEIGHT / (60 / SNAP_MINUTES))
        node.style.height = `${Math.max(16, height + snapped)}px`
      } else {
        const snappedY = Math.round(dy / (HOUR_HEIGHT / 4)) * (HOUR_HEIGHT / 4)
        const snappedX = allowDayShift ? Math.round(dx / Math.max(1, dayWidth())) * dayWidth() : 0
        node.style.transform = `translate(${snappedX}px, ${snappedY}px)`
        node.classList.add('is-dragging')
      }
    }
    const up = (next: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      // Restore React-controlled geometry. Clearing height to '' collapses the
      // absolute block to content size until the next store/now re-render, which
      // looks like a half-height event while start/end times stay unchanged.
      if (node) {
        node.classList.remove('is-dragging')
        node.style.transform = ''
        node.style.height = `${height}px`
      }
      const moved = Math.abs(next.clientX - originX) > 4 || Math.abs(next.clientY - originY) > 4
      if (!moved) {
        onOpen(event, next.clientX, next.clientY)
        return
      }
      const minutes = Math.round((dy / HOUR_HEIGHT) * 60 / SNAP_MINUTES) * SNAP_MINUTES
      const dayShift = allowDayShift && !resizing ? Math.round(dx / Math.max(1, dayWidth())) : 0
      const start = parseISO(event.start)
      const end = parseISO(event.end)
      if (resizing) {
        const nextEnd = addMinutes(end, minutes)
        if (nextEnd.getTime() - start.getTime() < SNAP_MINUTES * 60 * 1000) return
        onMove(event, start, nextEnd)
        return
      }
      if (minutes === 0 && dayShift === 0) return
      onMove(event, addMinutes(addDays(start, dayShift), minutes), addMinutes(addDays(end, dayShift), minutes))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const gap = cols > 1 ? 1 : 0

  return (
    <div
      ref={dragRef}
      data-event
      className={cn(
        'event-block absolute overflow-hidden px-1.5 py-0.5 text-left',
        tiny ? 'text-[10px]' : 'text-[12px]',
        done && 'opacity-55',
        missed && 'opacity-80',
      )}
      style={{
        top,
        height,
        left: cols === 1 ? 0 : `calc(${(col / cols) * 100}% + ${col === 0 ? 0 : gap}px)`,
        width: cols === 1 ? '100%' : `calc(${100 / cols}% - ${gap}px)`,
        right: cols === 1 ? 0 : undefined,
        background: colors.background,
        color: colors.color,
        ['--bar' as string]: missed ? '#FF3B30' : colors.bar,
      }}
      onPointerDown={onPointerDown}
    >
      <div className={cn('flex items-center gap-1 truncate font-semibold leading-4', done && 'line-through')}>
        {done && <Check size={11} strokeWidth={2.6} className="shrink-0" />}
        <span className="truncate">{event.title}</span>
        {missed && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide opacity-80">Missed</span>}
      </div>
      {!compact && (
        <div className="truncate text-[11px] opacity-80">
          {formatTime(parseISO(event.start), timeFormat)} – {formatTime(parseISO(event.end), timeFormat)}
        </div>
      )}
      {!tiny && event.location && height > 52 && <div className="truncate text-[11px] opacity-70">{event.location}</div>}
      <div data-resize className="absolute inset-x-1 bottom-0 h-2 cursor-ns-resize" />
      <span className="sr-only">{format(parseISO(event.start), 'p')}</span>
    </div>
  )
}
