import { useMemo } from 'react'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { expandEvents } from '@/lib/recurrence'
import { eventDateKeys } from '@/lib/dates'
import type { CalendarEvent } from '@/types'

export function useEvents(start: Date, end: Date): CalendarEvent[] {
  const events = useEventStore((state) => state.events)
  const calendars = useCalendarStore((state) => state.calendars)
  const startMs = start.getTime()
  const endMs = end.getTime()
  return useMemo(() => {
    const visible = new Set(calendars.filter((calendar) => calendar.visible).map((calendar) => calendar.id))
    return expandEvents(events, new Date(startMs), new Date(endMs)).filter((event) => visible.has(event.calendarId))
  }, [events, calendars, startMs, endMs])
}

export function useEventsByDay(start: Date, end: Date): Map<string, CalendarEvent[]> {
  const events = useEvents(start, end)
  return useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      for (const key of eventDateKeys(event.start, event.end)) {
        map.set(key, [...(map.get(key) ?? []), event])
      }
    }
    return map
  }, [events])
}

export function calendarColor(calendarId: string): string {
  return useCalendarStore.getState().calendars.find((calendar) => calendar.id === calendarId)?.color ?? '#0A84FF'
}
