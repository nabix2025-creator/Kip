import { addDays } from 'date-fns'
import { toDateKey } from '@/lib/dates'

export function habitStreak(checks: Record<string, boolean>, now: Date) {
  let cursor = checks[toDateKey(now)] ? now : addDays(now, -1)
  let count = 0
  while (checks[toDateKey(cursor)]) {
    count += 1
    cursor = addDays(cursor, -1)
    if (count > 400) break
  }
  return count
}
