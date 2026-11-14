import { useMemo } from 'react'
import { isToday, parseISO, startOfDay } from 'date-fns'
import { useTaskStore } from '@/store/taskStore'
import type { Task } from '@/types'

export type TaskFilter = 'all' | 'today' | 'upcoming'

export function useTasks(filter: TaskFilter): Task[] {
  const tasks = useTaskStore((state) => state.tasks)
  return useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (filter === 'all') return true
      if (!task.due) return false
      const due = parseISO(task.due)
      if (filter === 'today') return isToday(due) || (startOfDay(due) < startOfDay(new Date()) && !task.completed)
      return startOfDay(due) > startOfDay(new Date())
    })
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (a.due && b.due) return a.due.localeCompare(b.due)
      if (a.due) return -1
      if (b.due) return 1
      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [tasks, filter])
}
