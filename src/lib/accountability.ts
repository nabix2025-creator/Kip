import { toDateKey } from '@/lib/dates'
import type { Habit } from '@/store/dashboardStore'
import type { Task } from '@/types'

export type AccountabilityBreakdown = {
  score: number
  habitsPct: number | null
  todosPct: number | null
  focusPct: number | null
  habitsDone: number
  habitsTotal: number
  todosDone: number
  todosTotal: number
  focusMinutes: number
}

/** Daily accountability % from habits + today todos + optional focus minutes. */
export function accountabilityScore(input: {
  now?: Date
  habits: Habit[]
  tasks: Task[]
  focusMinutesToday: number
  focusTargetMinutes?: number
}): AccountabilityBreakdown {
  const day = toDateKey(input.now ?? new Date())
  const habitsTotal = input.habits.length
  const habitsDone = input.habits.filter((habit) => habit.checks[day]).length
  const habitsPct = habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : null

  const todayTasks = input.tasks.filter((task) => {
    if (task.period === 'today') return true
    if (!task.due) return false
    return task.due.slice(0, 10) === day
  })
  const todosTotal = todayTasks.length
  const todosDone = todayTasks.filter((task) => task.completed).length
  const todosPct = todosTotal ? Math.round((todosDone / todosTotal) * 100) : null

  const target = Math.max(1, input.focusTargetMinutes ?? 25)
  const focusPct =
    input.focusMinutesToday > 0 || habitsTotal > 0 || todosTotal > 0
      ? Math.min(100, Math.round((input.focusMinutesToday / target) * 100))
      : null

  const parts: number[] = []
  if (habitsPct != null) parts.push(habitsPct)
  if (todosPct != null) parts.push(todosPct)
  if (focusPct != null && input.focusMinutesToday > 0) parts.push(Math.min(100, focusPct))

  const score = parts.length ? Math.round(parts.reduce((sum, value) => sum + value, 0) / parts.length) : 0

  return {
    score,
    habitsPct,
    todosPct,
    focusPct: input.focusMinutesToday > 0 ? Math.min(100, focusPct ?? 0) : focusPct,
    habitsDone,
    habitsTotal,
    todosDone,
    todosTotal,
    focusMinutes: input.focusMinutesToday,
  }
}
