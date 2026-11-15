import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, addMonths, addWeeks, addYears, parseISO } from 'date-fns'
import type { Priority, Recurrence, Task, TaskListDef, TaskPeriod } from '@/types'
import { uid } from '@/lib/id'
import { dueForPeriod, resolveTaskPeriod } from '@/lib/taskPeriod'
import { LIST_REMINDERS, seedLists } from '@/store/seed'

interface TaskState {
  lists: TaskListDef[]
  tasks: Task[]
  addTask: (input: {
    title: string
    listId: string
    period?: TaskPeriod
    due?: string
    priority?: Priority
    notes?: string
    recurrence?: Recurrence
  }) => void
  toggleTask: (id: string) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  rescheduleTask: (id: string, due?: string, period?: TaskPeriod) => void
  setTaskPeriod: (id: string, period: TaskPeriod) => void
  addList: (name: string, color: string) => void
  replaceTasks: (tasks: Task[], lists?: TaskListDef[]) => void
}

function nextDue(due: string, recurrence: Recurrence): string {
  const date = parseISO(due)
  const interval = Math.max(1, recurrence.interval || 1)
  if (recurrence.freq === 'daily') return addDays(date, interval).toISOString()
  if (recurrence.freq === 'weekly') return addWeeks(date, interval).toISOString()
  if (recurrence.freq === 'monthly') return addMonths(date, interval).toISOString()
  return addYears(date, interval).toISOString()
}

function withPeriod(tasks: Task[]): Task[] {
  return tasks.map((task) => {
    const period = resolveTaskPeriod(task)
    return task.period === period ? task : { ...task, period }
  })
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      lists: seedLists(),
      tasks: [],
      addTask: (input) => {
        const stamp = new Date().toISOString()
        const period = input.period ?? (input.due ? resolveTaskPeriod({ due: input.due }) : 'today')
        const task: Task = {
          id: uid(),
          listId: input.listId,
          title: input.title.trim(),
          notes: input.notes,
          period,
          due: input.due ?? dueForPeriod(period),
          priority: input.priority ?? 'none',
          recurrence: input.recurrence,
          completed: false,
          createdAt: stamp,
          updatedAt: stamp,
        }
        if (!task.title) return
        set({ tasks: [task, ...get().tasks] })
      },
      toggleTask: (id) => {
        const task = get().tasks.find((item) => item.id === id)
        if (!task) return
        if (!task.completed && task.recurrence && task.due) {
          const due = nextDue(task.due, task.recurrence)
          set({
            tasks: get().tasks.map((item) =>
              item.id === id
                ? { ...item, due, period: resolveTaskPeriod({ due, period: item.period }), completed: false, updatedAt: new Date().toISOString() }
                : item,
            ),
          })
          return
        }
        set({
          tasks: get().tasks.map((item) => (item.id === id ? { ...item, completed: !item.completed, updatedAt: new Date().toISOString() } : item)),
        })
      },
      updateTask: (id, patch) =>
        set({
          tasks: get().tasks.map((task) => {
            if (task.id !== id) return task
            const next = { ...task, ...patch, updatedAt: new Date().toISOString() }
            if (patch.period && !patch.due) next.due = dueForPeriod(patch.period)
            if (patch.due && !patch.period) next.period = resolveTaskPeriod({ due: patch.due, period: patch.period })
            return next
          }),
        }),
      deleteTask: (id) => set({ tasks: get().tasks.filter((task) => task.id !== id) }),
      rescheduleTask: (id, due, period) =>
        set({
          tasks: get().tasks.map((task) => {
            if (task.id !== id) return task
            const nextPeriod = period ?? (due ? resolveTaskPeriod({ due }) : task.period ?? 'today')
            return {
              ...task,
              due: due ?? dueForPeriod(nextPeriod),
              period: nextPeriod,
              completed: false,
              updatedAt: new Date().toISOString(),
            }
          }),
        }),
      setTaskPeriod: (id, period) =>
        set({
          tasks: get().tasks.map((task) =>
            task.id === id
              ? { ...task, period, due: dueForPeriod(period), completed: false, updatedAt: new Date().toISOString() }
              : task,
          ),
        }),
      addList: (name, color) => set({ lists: [...get().lists, { id: uid(), name: name.trim() || 'List', color }] }),
      replaceTasks: (tasks, lists) => set((state) => ({ tasks: withPeriod(tasks), lists: lists ?? state.lists })),
    }),
    {
      name: 'kip-tasks',
      version: 3,
      migrate: (persisted) => {
        const state = persisted as { lists?: TaskListDef[]; tasks?: Task[] } | undefined
        if (!state) return state as never
        const lists = state.lists?.map((list) =>
          list.id === LIST_REMINDERS || list.name === 'Reminders' ? { ...list, name: 'Todo' } : list,
        )
        return { ...state, lists, tasks: withPeriod(state.tasks ?? []) } as never
      },
    },
  ),
)
