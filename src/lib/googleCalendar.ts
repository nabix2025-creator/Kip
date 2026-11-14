import type { CalendarEvent } from '@/types'
import type { GooglePush, SyncPayload } from '@/vite-env'

export async function pushGoogleChange(action: GooglePush['action'], event: CalendarEvent): Promise<void> {
  if (!window.api || event.seriesId) return
  const { useCalendarStore } = await import('@/store/calendarStore')
  const { useEventStore } = await import('@/store/eventStore')
  const calendar = useCalendarStore.getState().calendars.find((item) => item.id === event.calendarId)
  if (!calendar || calendar.provider !== 'google' || !calendar.externalId) return
  if (action !== 'insert' && !event.externalId) return
  try {
    const result = await window.api.googlePush({
      action,
      calendarExternalId: calendar.externalId,
      externalId: event.externalId,
      event: {
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        location: event.location,
        notes: event.notes,
        reminders: event.reminders,
      },
    })
    if (action === 'insert' && result.externalId) {
      useEventStore.getState().updateEvent(event.id, { externalId: result.externalId }, { silent: true })
    }
  } catch (error) {
    useCalendarStore.getState().pushToast(error instanceof Error ? error.message : 'Google Calendar sync failed', 'error')
  }
}

export function mergeRemoteCalendars(payload: SyncPayload, provider: 'google' | 'icloud'): void {
  void import('@/store/calendarStore').then(({ useCalendarStore }) => {
    void import('@/store/eventStore').then(({ useEventStore }) => {
      const state = useCalendarStore.getState()
      let calendars = [...state.calendars]
      const idByExternal = new Map<string, string>()

      for (const remote of payload.calendars) {
        const existing = calendars.find((calendar) => calendar.externalId === remote.externalId && calendar.provider === provider)
        if (existing) {
          calendars = calendars.map((calendar) =>
            calendar.id === existing.id ? { ...calendar, name: remote.name, color: remote.color || calendar.color } : calendar,
          )
          idByExternal.set(remote.externalId, existing.id)
        } else {
          const id = `${provider}-${remote.externalId}`
          calendars.push({
            id,
            name: remote.name,
            color: remote.color || (provider === 'google' ? '#0A84FF' : '#34C759'),
            provider,
            group: provider === 'google' ? 'Google' : 'iCloud',
            visible: true,
            externalId: remote.externalId,
          })
          idByExternal.set(remote.externalId, id)
        }
      }

      const syncedExternalCalendars = new Set(payload.calendars.map((calendar) => calendar.externalId))
      const localCalendarId = (externalId: string) => idByExternal.get(externalId)
      const events = useEventStore.getState().events.filter((event) => {
        if (!event.externalId) return true
        const calendar = calendars.find((item) => item.id === event.calendarId)
        if (!calendar || calendar.provider !== provider || !calendar.externalId) return true
        return !syncedExternalCalendars.has(calendar.externalId)
      })

      const stamp = new Date().toISOString()
      for (const remote of payload.events) {
        const calendarId = localCalendarId(remote.calendarExternalId)
        if (!calendarId) continue
        events.push({
          id: `${provider}:${remote.externalId}`,
          calendarId,
          title: remote.title || 'Busy',
          start: remote.start,
          end: remote.end,
          allDay: remote.allDay,
          location: remote.location,
          notes: remote.notes,
          reminders: [],
          externalId: remote.externalId,
          createdAt: stamp,
          updatedAt: stamp,
        })
      }

      useCalendarStore.getState().replaceCalendars(calendars)
      useEventStore.getState().replaceEvents(events)
      useCalendarStore.getState().pushToast(`${provider === 'google' ? 'Google' : 'iCloud'} calendars updated`)
    })
  })
}
