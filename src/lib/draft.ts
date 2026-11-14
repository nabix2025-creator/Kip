import { addMinutes } from 'date-fns'
import type { EventDraft } from '@/types'
import { useSettingsStore } from '@/store/settingsStore'

export function blankDraft(partial: Partial<EventDraft> = {}): EventDraft {
  const settings = useSettingsStore.getState()
  const start = partial.start ? new Date(partial.start) : new Date()
  if (!partial.start) {
    start.setSeconds(0, 0)
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15)
  }
  const end = partial.end ? new Date(partial.end) : addMinutes(start, 60)
  return {
    calendarId: partial.calendarId || settings.defaultCalendarId,
    title: partial.title ?? '',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: partial.allDay ?? false,
    location: partial.location ?? '',
    notes: partial.notes ?? '',
    recurrence: partial.recurrence ?? null,
    reminders: partial.reminders ?? (settings.defaultReminder ? [settings.defaultReminder] : []),
    id: partial.id,
    seriesId: partial.seriesId,
    externalId: partial.externalId,
  }
}
