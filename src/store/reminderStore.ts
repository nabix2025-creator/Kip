import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '@/lib/id'

export interface TimedReminder {
  id: string
  title: string
  at: string
  done: boolean
  createdAt: string
}

interface ReminderState {
  reminders: TimedReminder[]
  addReminder: (title: string, at: string) => void
  toggleReminder: (id: string) => void
  removeReminder: (id: string) => void
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      addReminder: (title, at) => {
        const name = title.trim()
        if (!name || !at) return
        const stamp = new Date().toISOString()
        set({
          reminders: [{ id: uid(), title: name, at, done: false, createdAt: stamp }, ...get().reminders],
        })
      },
      toggleReminder: (id) =>
        set({
          reminders: get().reminders.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
        }),
      removeReminder: (id) => set({ reminders: get().reminders.filter((item) => item.id !== id) }),
    }),
    { name: 'kip-timed-reminders' },
  ),
)
