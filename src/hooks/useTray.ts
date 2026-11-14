import { useEffect } from 'react'
import { isSameDay, parseISO } from 'date-fns'
import { isTrayWindow } from '@/lib/env'
import { drawTrayIcon } from '@/lib/trayIcon'
import { formatTime } from '@/lib/dates'
import { expandEvents } from '@/lib/recurrence'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useSettingsStore } from '@/store/settingsStore'
import { addDays, startOfDay } from 'date-fns'

export function useTray(): void {
  const events = useEventStore((state) => state.events)
  const calendars = useCalendarStore((state) => state.calendars)
  const timeFormat = useSettingsStore((state) => state.timeFormat)

  useEffect(() => {
    if (!window.api || isTrayWindow()) return
    const publish = () => {
      const now = new Date()
      const visible = new Set(calendars.filter((calendar) => calendar.visible).map((calendar) => calendar.id))
      const colors = new Map(calendars.map((calendar) => [calendar.id, calendar.color]))
      const today = expandEvents(events, startOfDay(now), addDays(startOfDay(now), 1)).filter(
        (event) => visible.has(event.calendarId) && (event.allDay || isSameDay(parseISO(event.start), now)),
      )
      window.api?.setTray({
        icon: drawTrayIcon(now.getDate()),
        events: today.slice(0, 8).map((event) => ({
          id: event.id,
          title: event.title,
          time: event.allDay ? 'All day' : formatTime(parseISO(event.start), timeFormat),
          color: colors.get(event.calendarId) ?? '#0A84FF',
        })),
      })
    }
    publish()
    const id = window.setInterval(publish, 60_000)
    return () => window.clearInterval(id)
  }, [events, calendars, timeFormat])

  useEffect(() => {
    if (!window.api || isTrayWindow()) return
    return window.api.onNavigate((iso) => {
      useCalendarStore.getState().setSelectedDate(iso.slice(0, 10))
      useCalendarStore.getState().setView('day')
    })
  }, [])
}
