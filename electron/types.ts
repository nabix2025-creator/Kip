export interface RemoteCalendar {
  externalId: string
  name: string
  color: string
}

export interface RemoteEvent {
  externalId: string
  calendarExternalId: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  notes?: string
}

export interface RemotePayload {
  calendars: RemoteCalendar[]
  events: RemoteEvent[]
  account?: string
}

export interface PushAction {
  action: 'insert' | 'update' | 'delete'
  calendarExternalId: string
  externalId?: string
  event?: {
    title: string
    start: string
    end: string
    allDay: boolean
    location?: string
    notes?: string
    reminders?: number[]
  }
}
