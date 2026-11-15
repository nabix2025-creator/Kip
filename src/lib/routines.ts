import { addDays } from 'date-fns'
import { toDateKey } from '@/lib/dates'
import type { RoutineKind, RoutineStep } from '@/store/dashboardStore'

export const MORNING_STARTERS = ['Make bed', 'Drink water', 'Stretch 5 min', 'Review today’s plan']
export const EVENING_STARTERS = ['Tidy desk', 'Plan tomorrow', 'No screens 30 min', 'Grateful note']

export function routineDayComplete(
  steps: RoutineStep[],
  checks: Record<string, Record<string, boolean>>,
  day: string,
): boolean {
  if (!steps.length) return false
  const dayChecks = checks[day] ?? {}
  return steps.every((step) => dayChecks[step.id])
}

export function routineStreak(
  kind: RoutineKind,
  steps: RoutineStep[],
  checks: Record<string, Record<string, boolean>>,
  now: Date,
): number {
  if (!steps.length) return 0
  const today = toDateKey(now)
  let cursor = routineDayComplete(steps, checks, today) ? now : addDays(now, -1)
  let count = 0
  while (routineDayComplete(steps, checks, toDateKey(cursor))) {
    count += 1
    cursor = addDays(cursor, -1)
    if (count > 400) break
  }
  void kind
  return count
}
