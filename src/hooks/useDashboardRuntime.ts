import { useEffect } from 'react'
import { formatTime, toDateKey } from '@/lib/dates'
import { scanReminders, showSystemNotification } from '@/lib/notifications'
import { useCalendarStore } from '@/store/calendarStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { useReminderStore } from '@/store/reminderStore'
import { useSettingsStore } from '@/store/settingsStore'

const HABIT_NUDGE_KEY = 'kip-habit-nudge'

export function useDashboardRuntime(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const scan = () => {
      const day = toDateKey(new Date())
      const tasks = useDashboardStore.getState().tasks
      if (tasks.some((task) => task.day !== day)) {
        useDashboardStore.setState({ tasks: tasks.filter((task) => task.day === day) })
      }
      if (useDashboardStore.getState().syncPomodoro()) {
        useCalendarStore.getState().pushToast('Focus session complete')
        void showSystemNotification({
          title: 'Focus session complete',
          body: '25 focused minutes. Stand up and breathe.',
          time: 'Session complete',
        })
      }

      const notificationsOn = useSettingsStore.getState().notificationsEnabled
      if (notificationsOn) {
        const timed = useReminderStore.getState().reminders
        const countdowns = useDashboardStore.getState().countdowns
        void scanReminders([], [], [], timed, countdowns)

        // Gentle habit miss nudge after 8pm local — once per day.
        const hour = new Date().getHours()
        if (hour >= 20) {
          const habits = useDashboardStore.getState().habits
          const missed = habits.filter((habit) => !habit.checks[day])
          const nudged = localStorage.getItem(HABIT_NUDGE_KEY)
          if (missed.length && nudged !== day) {
            localStorage.setItem(HABIT_NUDGE_KEY, day)
            const names = missed
              .slice(0, 3)
              .map((habit) => habit.name)
              .join(', ')
            useCalendarStore.getState().pushToast(`Habits waiting · ${names}`)
            void showSystemNotification({
              title: 'Habits waiting',
              body: missed.length === 1 ? `${names} is still open tonight.` : `${names}${missed.length > 3 ? '…' : ''} — a small check-in keeps the streak.`,
              time: 'Evening nudge',
            })
          }
        }
      }

      const now = Date.now()
      for (const call of useDashboardStore.getState().calls) {
        const at = new Date(call.at).getTime()
        if (call.reminded || Number.isNaN(at)) continue
        const lead = at - 5 * 60 * 1000
        if (now < lead || now > at + 60 * 1000) continue
        useDashboardStore.getState().markCallReminded(call.id)
        const when = formatTime(new Date(at), useSettingsStore.getState().timeFormat)
        useCalendarStore.getState().pushToast(`Call ${call.who} · ${when}`)
        void showSystemNotification({
          title: `Call ${call.who}`,
          body: call.phone ? `${call.phone} · ${when}` : `Due at ${when}`,
          time: when,
        })
      }
    }
    scan()
    const id = window.setInterval(scan, 1000)
    const onFocus = () => scan()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [enabled])
}
