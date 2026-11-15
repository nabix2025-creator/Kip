export type Priority = 'none' | 'low' | 'medium' | 'high'
export type ViewMode = 'day' | 'week' | 'month' | 'quarter' | 'year'
export type ThemeMode = 'light' | 'dark' | 'system'
export type TimeFormat = '12h' | '24h'
export type CalendarProvider = 'local' | 'google' | 'icloud'
export type SourceGroup = 'iCloud' | 'Google' | 'Other'
export type EventStatus = 'open' | 'done' | 'missed'
export type TaskPeriod = 'today' | 'tomorrow' | 'week' | 'month'

export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  byWeekday?: number[]
  until?: string
  count?: number
}

export interface Calendar {
  id: string
  name: string
  color: string
  provider: CalendarProvider
  group: SourceGroup
  visible: boolean
  externalId?: string
  readOnly?: boolean
}

export interface CalendarSet {
  id: string
  name: string
  visibleIds: string[]
}

export interface CalendarEvent {
  id: string
  calendarId: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  notes?: string
  recurrence?: Recurrence
  exdates?: string[]
  reminders: number[]
  status?: EventStatus
  seriesId?: string
  externalId?: string
  createdAt: string
  updatedAt: string
}

export interface TaskListDef {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  listId: string
  title: string
  notes?: string
  completed: boolean
  /** Exclusive time bucket; preferred over inferring from due. */
  period?: TaskPeriod
  due?: string
  priority: Priority
  recurrence?: Recurrence
  createdAt: string
  updatedAt: string
}

export interface EventDraft {
  id?: string
  seriesId?: string
  calendarId: string
  title: string
  start: string
  end: string
  allDay: boolean
  location: string
  notes: string
  recurrence: Recurrence | null
  reminders: number[]
  externalId?: string
}

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export interface Anchor {
  x: number
  y: number
}
