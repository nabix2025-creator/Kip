import { addDays, endOfMonth, endOfWeek, isBefore, isSameDay, isSameWeek, isToday, parseISO, startOfDay } from 'date-fns'
import type { TaskPeriod } from '@/types'

export const TASK_PERIODS: { value: TaskPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

export function periodLabel(period: TaskPeriod): string {
  if (period === 'week') return 'This week'
  if (period === 'month') return 'This month'
  if (period === 'tomorrow') return 'Tomorrow'
  return 'Today'
}

export function dueForPeriod(period: TaskPeriod, now = new Date()): string {
  if (period === 'today') return startOfDay(now).toISOString()
  if (period === 'tomorrow') return startOfDay(addDays(now, 1)).toISOString()
  if (period === 'week') return startOfDay(endOfWeek(now, { weekStartsOn: 0 })).toISOString()
  return startOfDay(endOfMonth(now)).toISOString()
}

export function inferPeriod(due: Date | string, now = new Date()): TaskPeriod {
  const date = typeof due === 'string' ? parseISO(due) : due
  const day = startOfDay(date)
  const today = startOfDay(now)
  if (isToday(date) || isBefore(day, today)) return 'today'
  if (isSameDay(date, addDays(today, 1))) return 'tomorrow'
  if (isSameWeek(date, now, { weekStartsOn: 0 })) return 'week'
  return 'month'
}

export function resolveTaskPeriod(task: { period?: TaskPeriod; due?: string }): TaskPeriod {
  if (task.period) return task.period
  if (task.due) return inferPeriod(task.due)
  return 'today'
}
