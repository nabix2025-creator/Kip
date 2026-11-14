import { addDays, addMinutes, addMonths, addWeeks, addYears, differenceInMinutes, parseISO, startOfDay, startOfWeek } from 'date-fns'
import type { CalendarEvent } from '@/types'
import { toDateKey } from '@/lib/dates'

export function expandEvents(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const event of events) out.push(...expandEvent(event, rangeStart, rangeEnd))
  return out
}

export function expandEvent(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  if (!event.recurrence) {
    const start = parseISO(event.start)
    const end = parseISO(event.end)
    if (end < rangeStart || start > rangeEnd) return []
    return [event]
  }

  const occurrences: CalendarEvent[] = []
  for (const day of iterateDays(event, rangeEnd)) {
    if (day > rangeEnd) break
    const key = toDateKey(day)
    if (event.exdates?.includes(key)) continue
    const occurrenceEnd = occurrenceBounds(event, day).end
    if (occurrenceEnd < rangeStart || day > rangeEnd) continue
    if (startOfDay(day) < startOfDay(rangeStart) && occurrenceEnd < rangeStart) continue
    occurrences.push(materialize(event, day))
  }
  return occurrences
}

function iterateDays(event: CalendarEvent, rangeEnd: Date): Date[] {
  const recurrence = event.recurrence!
  const interval = Math.max(1, recurrence.interval || 1)
  const start = startOfDay(parseISO(event.start))
  const until = recurrence.until ? startOfDay(parseISO(recurrence.until)) : addYears(start, 8)
  const limit = until < rangeEnd ? until : rangeEnd
  const maxCount = recurrence.count ?? 10000
  const days: Date[] = []

  if (recurrence.freq === 'daily') {
    let cursor = start
    if (cursor < startOfDay(addDays(rangeEnd, -400)) && !recurrence.count) {
      const jump = Math.floor((startOfDay(rangeEnd).getTime() - cursor.getTime()) / 86400000) - 400
      if (jump > 0) cursor = addDays(cursor, Math.floor(jump / interval) * interval)
    }
    while (cursor <= limit && days.length < maxCount) {
      days.push(cursor)
      cursor = addDays(cursor, interval)
    }
    return days
  }

  if (recurrence.freq === 'weekly') {
    const weekdays = (recurrence.byWeekday?.length ? [...recurrence.byWeekday] : [parseISO(event.start).getDay()]).sort((a, b) => a - b)
    let week = startOfWeek(start, { weekStartsOn: 0 })
    let produced = 0
    while (week <= limit && produced < maxCount) {
      for (const weekday of weekdays) {
        const day = addDays(week, weekday)
        if (day < start || day > limit) continue
        days.push(day)
        produced += 1
        if (produced >= maxCount) break
      }
      week = addWeeks(week, interval)
    }
    return days
  }

  if (recurrence.freq === 'monthly') {
    for (let index = 0; days.length < maxCount; index += 1) {
      const day = startOfDay(addMonths(parseISO(event.start), index * interval))
      if (day > limit) break
      days.push(day)
    }
    return days
  }

  for (let index = 0; days.length < maxCount; index += 1) {
    const day = startOfDay(addYears(parseISO(event.start), index * interval))
    if (day > limit) break
    days.push(day)
  }
  return days
}

function occurrenceBounds(event: CalendarEvent, day: Date): { start: Date; end: Date } {
  const originalStart = parseISO(event.start)
  const originalEnd = parseISO(event.end)
  const duration = Math.max(15, differenceInMinutes(originalEnd, originalStart))
  if (event.allDay) {
    const start = startOfDay(day)
    const span = Math.max(1, Math.round(duration / (60 * 24)))
    return { start, end: addDays(start, span) }
  }
  const start = new Date(day)
  start.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0)
  return { start, end: addMinutes(start, duration) }
}

export function materialize(event: CalendarEvent, day: Date): CalendarEvent {
  const bounds = occurrenceBounds(event, day)
  return {
    ...event,
    id: `${event.id}@${toDateKey(day)}`,
    seriesId: event.id,
    start: bounds.start.toISOString(),
    end: bounds.end.toISOString(),
  }
}

export function describeRecurrence(event: { recurrence?: CalendarEvent['recurrence'] }): string | null {
  const recurrence = event.recurrence
  if (!recurrence) return null
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const every = recurrence.interval <= 1 ? '' : ` ${recurrence.interval}`
  if (recurrence.freq === 'daily') return recurrence.interval <= 1 ? 'Every day' : `Every ${recurrence.interval} days`
  if (recurrence.freq === 'weekly') {
    const days = recurrence.byWeekday?.map((day) => names[day].slice(0, 3)).join(', ')
    return `Every${every} week${days ? ` · ${days}` : ''}`
  }
  if (recurrence.freq === 'monthly') return recurrence.interval <= 1 ? 'Every month' : `Every ${recurrence.interval} months`
  return recurrence.interval <= 1 ? 'Every year' : `Every ${recurrence.interval} years`
}
