import { useMemo } from 'react'
import { resolveTaskPeriod } from '@/lib/taskPeriod'
import { useTaskStore } from '@/store/taskStore'
import type { Task, TaskPeriod } from '@/types'

export type TaskFilter = 'all' | TaskPeriod

export function useTasks(filter: TaskFilter): Task[] {
  const tasks = useTaskStore((state) => state.tasks)
  return useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (filter === 'all') return true
      return resolveTaskPeriod(task) === filter
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
