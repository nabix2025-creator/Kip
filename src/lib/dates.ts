import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import type { TimeFormat, ViewMode } from '@/types'

export { addDays, addMinutes, addMonths, addWeeks, addYears, format, isSameDay, isSameMonth, isToday, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInMinutes, eachDayOfInterval }

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function startOfQuarter(date: Date): Date {
  const month = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), month, 1)
}

export function getWeekDays(anchor: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn })
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function getMonthGrid(anchor: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn })
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

export function getViewRange(view: ViewMode, selected: Date, weekStartsOn: 0 | 1): { start: Date; end: Date } {
  if (view === 'day') return { start: startOfDay(selected), end: endOfDay(selected) }
  if (view === 'week') {
    return {
      start: startOfWeek(selected, { weekStartsOn }),
      end: endOfWeek(selected, { weekStartsOn }),
    }
  }
  if (view === 'month') {
    const start = startOfWeek(startOfMonth(selected), { weekStartsOn })
    return { start, end: addDays(start, 41) }
  }
  if (view === 'quarter') {
    const start = startOfQuarter(selected)
    const end = endOfMonth(addMonths(start, 2))
    return { start, end }
  }
  return { start: startOfYear(selected), end: endOfYear(selected) }
}

export function shiftDate(view: ViewMode, date: Date, direction: 1 | -1): Date {
  if (view === 'day') return addDays(date, direction)
  if (view === 'week') return addWeeks(date, direction)
  if (view === 'month') return addMonths(date, direction)
  if (view === 'quarter') return addMonths(date, 3 * direction)
  return addYears(date, direction)
}

export function formatPeriodTitle(view: ViewMode, date: Date, weekStartsOn: 0 | 1): string {
  if (view === 'day') return format(date, 'EEEE, MMMM d')
  if (view === 'week') {
    const days = getWeekDays(date, weekStartsOn)
    const a = days[0]
    const b = days[6]
    if (a.getFullYear() !== b.getFullYear()) return `${format(a, 'MMM d, yyyy')} – ${format(b, 'MMM d, yyyy')}`
    if (a.getMonth() !== b.getMonth()) return `${format(a, 'MMM d')} – ${format(b, 'MMM d, yyyy')}`
    return `${format(a, 'MMM d')} – ${format(b, 'd, yyyy')}`
  }
  if (view === 'month') return format(date, 'MMMM yyyy')
  if (view === 'quarter') {
    const start = startOfQuarter(date)
    const end = addMonths(start, 2)
    return `${format(start, 'MMMM')} – ${format(end, 'MMMM yyyy')}`
  }
  return format(date, 'yyyy')
}

export function formatTime(date: Date, timeFormat: TimeFormat): string {
  return format(date, timeFormat === '12h' ? 'h:mm a' : 'HH:mm')
}

export function formatHourLabel(hour: number, timeFormat: TimeFormat): string {
  if (timeFormat === '24h') return `${String(hour).padStart(2, '0')}:00`
  const suffix = hour < 12 ? 'AM' : 'PM'
  const value = hour % 12 === 0 ? 12 : hour % 12
  return `${value} ${suffix}`
}

export function combineDateAndMinutes(day: Date, minutes: number): Date {
  const next = startOfDay(day)
  next.setMinutes(minutes)
  return next
}

export function clampMinutes(value: number, min = 0, max = 24 * 60): number {
  return Math.min(max, Math.max(min, value))
}

export function eventDateKeys(startIso: string, endIso: string): string[] {
  const start = startOfDay(parseISO(startIso))
  const endExclusive = parseISO(endIso)
  const last = new Date(endExclusive.getTime() - 1)
  const end = startOfDay(last < start ? start : last)
  return eachDayOfInterval({ start, end }).map(toDateKey)
}

export function weekdayLabels(weekStartsOn: 0 | 1): string[] {
  const start = startOfWeek(new Date(2024, 0, 7), { weekStartsOn })
  return Array.from({ length: 7 }, (_, index) => format(addDays(start, index), 'EEE').toUpperCase())
}
