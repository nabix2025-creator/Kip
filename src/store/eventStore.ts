import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CalendarEvent, EventDraft, EventStatus } from '@/types'
import { uid } from '@/lib/id'
import { pushGoogleChange } from '@/lib/googleCalendar'

interface EventState {
  events: CalendarEvent[]
  statuses: Record<string, EventStatus>
  addEvent: (draft: EventDraft) => CalendarEvent
  updateEvent: (id: string, patch: Partial<CalendarEvent>, options?: { silent?: boolean }) => void
  setEventStatus: (event: CalendarEvent, status: EventStatus) => void
  deleteEvent: (event: CalendarEvent, scope: 'single' | 'series') => void
  moveEvent: (event: CalendarEvent, startIso: string, endIso: string) => void
  removeByCalendar: (calendarId: string) => void
  replaceEvents: (events: CalendarEvent[]) => void
}

export function eventStatusOf(event: CalendarEvent, statuses: Record<string, EventStatus> = useEventStore.getState().statuses): EventStatus {
  return statuses[event.id] ?? event.status ?? 'open'
}

function fromDraft(draft: EventDraft, id = uid()): CalendarEvent {
  const stamp = new Date().toISOString()
  return {
    id,
    calendarId: draft.calendarId,
    title: draft.title.trim() || 'New Event',
    start: draft.start,
    end: draft.end,
    allDay: draft.allDay,
    location: draft.location.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    recurrence: draft.recurrence || undefined,
    reminders: draft.reminders,
    status: 'open',
    externalId: draft.externalId,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      events: [],
      statuses: {},
      addEvent: (draft) => {
        const event = fromDraft(draft)
        set({ events: [...get().events, event] })
        void pushGoogleChange('insert', event)
        return event
      },
      updateEvent: (id, patch, options) => {
        const current = get().events.find((event) => event.id === id)
        if (!current) return
        const next = { ...current, ...patch, updatedAt: new Date().toISOString() }
        set({ events: get().events.map((event) => (event.id === id ? next : event)) })
        if (!options?.silent) void pushGoogleChange('update', next)
      },
      setEventStatus: (event, status) => {
        const stored = get().events.find((item) => item.id === event.id)
        if (stored) {
          const next = { ...stored, status, updatedAt: new Date().toISOString() }
          set({
            events: get().events.map((item) => (item.id === event.id ? next : item)),
            statuses: { ...get().statuses, [event.id]: status },
          })
          void pushGoogleChange('update', next)
          return
        }
        set({ statuses: { ...get().statuses, [event.id]: status } })
      },
      deleteEvent: (event, scope) => {
        if (event.seriesId && scope === 'single') {
          const dateKey = event.id.split('@')[1]
          const statuses = { ...get().statuses }
          delete statuses[event.id]
          set({
            events: get().events.map((item) =>
              item.id === event.seriesId ? { ...item, exdates: Array.from(new Set([...(item.exdates ?? []), dateKey])) } : item,
            ),
            statuses,
          })
          return
        }
        const id = event.seriesId && scope === 'series' ? event.seriesId : event.id
        const existing = get().events.find((item) => item.id === id)
        const statuses = { ...get().statuses }
        delete statuses[event.id]
        delete statuses[id]
        set({ events: get().events.filter((item) => item.id !== id), statuses })
        if (existing) void pushGoogleChange('delete', existing)
      },
      moveEvent: (event, startIso, endIso) => {
        if (event.seriesId) {
          const dateKey = event.id.split('@')[1]
          const detached: CalendarEvent = {
            ...event,
            id: uid(),
            seriesId: undefined,
            recurrence: undefined,
            exdates: undefined,
            externalId: undefined,
            start: startIso,
            end: endIso,
            updatedAt: new Date().toISOString(),
          }
          set({
            events: get()
              .events.map((item) =>
                item.id === event.seriesId ? { ...item, exdates: Array.from(new Set([...(item.exdates ?? []), dateKey])) } : item,
              )
              .concat(detached),
          })
          return
        }
        const next = { ...event, start: startIso, end: endIso, updatedAt: new Date().toISOString() }
        set({ events: get().events.map((item) => (item.id === event.id ? next : item)) })
        void pushGoogleChange('update', next)
      },
      removeByCalendar: (calendarId) => set({ events: get().events.filter((event) => event.calendarId !== calendarId) }),
      replaceEvents: (events) => set({ events }),
    }),
    {
      name: 'kip-events',
      partialize: (state) => ({ events: state.events, statuses: state.statuses }),
    },
  ),
)

export function draftFromEvent(event: CalendarEvent, calendarFallback: string): EventDraft {
  return {
    id: event.seriesId ?? event.id,
    seriesId: event.seriesId,
    calendarId: event.calendarId || calendarFallback,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    location: event.location ?? '',
    notes: event.notes ?? '',
    recurrence: event.recurrence ?? null,
    reminders: event.reminders ?? [],
    externalId: event.externalId,
  }
}
