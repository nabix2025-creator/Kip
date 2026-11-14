import { useEffect } from 'react'
import { addDays } from 'date-fns'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useTaskStore } from '@/store/taskStore'
import { useSettingsStore } from '@/store/settingsStore'
import { expandEvents } from '@/lib/recurrence'
import { scanReminders } from '@/lib/notifications'
import { isAlertWindow, isTrayWindow } from '@/lib/env'

export function useNotifications(): void {
  const events = useEventStore((state) => state.events)
  const calendars = useCalendarStore((state) => state.calendars)
  const tasks = useTaskStore((state) => state.tasks)
  const enabled = useSettingsStore((state) => state.notificationsEnabled)

  useEffect(() => {
    if (!enabled || isTrayWindow() || isAlertWindow()) return
    const run = () => {
      const now = new Date()
      const upcoming = expandEvents(events, now, addDays(now, 2))
      void scanReminders(upcoming, calendars, tasks)
    }
    run()
    const id = window.setInterval(run, 10_000)
    const onFocus = () => run()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [events, calendars, tasks, enabled])
}
