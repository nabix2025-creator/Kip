import { addDays, startOfDay } from 'date-fns'
import type { Calendar, CalendarEvent, Task, TaskListDef } from '@/types'

export const CAL_PERSONAL = 'cal-personal'
export const CAL_WORK = 'cal-work'
export const CAL_FAMILY = 'cal-family'
export const CAL_HOLIDAYS = 'cal-holidays'
export const CAL_STUDY = 'cal-study'
export const CAL_HEALTH = 'cal-health'
export const CAL_TRAVEL = 'cal-travel'
export const CAL_FRIENDS = 'cal-friends'

export const LIST_REMINDERS = 'list-reminders'
export const LIST_PERSONAL = 'list-personal'
export const LIST_WORK = 'list-work'

function at(dayOffset: number, hours: number, minutes: number): string {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

function allDay(startOffset: number, days: number): { start: string; end: string; allDay: true } {
  const start = startOfDay(addDays(new Date(), startOffset))
  return { start: start.toISOString(), end: addDays(start, days).toISOString(), allDay: true }
}

const now = () => new Date().toISOString()

export function seedCalendars(): Calendar[] {
  return [
    { id: CAL_STUDY, name: 'Study', color: '#0A84FF', provider: 'local', group: 'Other', visible: true },
    { id: CAL_WORK, name: 'Work', color: '#FF3B30', provider: 'local', group: 'Other', visible: true },
    { id: CAL_PERSONAL, name: 'Self', color: '#34C759', provider: 'local', group: 'Other', visible: true },
    { id: CAL_FAMILY, name: 'Family', color: '#AF52DE', provider: 'local', group: 'Other', visible: true },
    { id: CAL_HEALTH, name: 'Health', color: '#34C759', provider: 'local', group: 'Other', visible: true },
    { id: CAL_TRAVEL, name: 'Travel', color: '#64D2FF', provider: 'local', group: 'Other', visible: true },
    { id: CAL_FRIENDS, name: 'Friends', color: '#FF2D55', provider: 'local', group: 'Other', visible: true },
    { id: CAL_HOLIDAYS, name: 'Holidays', color: '#FF9500', provider: 'local', group: 'Other', visible: true },
  ]
}

export const EXTRA_SEED_CALENDARS: Calendar[] = seedCalendars().filter((calendar) =>
  [CAL_HEALTH, CAL_TRAVEL, CAL_FRIENDS].includes(calendar.id),
)

export function seedEvents(): CalendarEvent[] {
  const stamp = now()
  const focus = allDay(2, 1)
  const offsite = allDay(5, 3)
  return [
    {
      id: 'evt-gym',
      calendarId: CAL_PERSONAL,
      title: 'Gym',
      start: at(0, 7, 0),
      end: at(0, 8, 0),
      allDay: false,
      location: 'Riverside Athletic',
      recurrence: { freq: 'weekly', interval: 1, byWeekday: [1, 3, 5] },
      reminders: [30],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'evt-standup',
      calendarId: CAL_WORK,
      title: 'Morning standup',
      start: at(0, 9, 0),
      end: at(0, 9, 30),
      allDay: false,
      location: 'Huddle',
      notes: 'Walk the board, call out blockers.',
      reminders: [10],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'evt-lunch',
      calendarId: CAL_PERSONAL,
      title: 'Lunch with Rahim',
      start: at(0, 12, 30),
      end: at(0, 13, 30),
      allDay: false,
      location: 'Cafe Mango',
      reminders: [15],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'evt-review',
      calendarId: CAL_WORK,
      title: 'Product review',
      start: at(0, 15, 0),
      end: at(0, 16, 15),
      allDay: false,
      location: 'Studio B',
      reminders: [15, 60],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'evt-critique',
      calendarId: CAL_WORK,
      title: 'Design critique',
      start: at(1, 14, 0),
      end: at(1, 15, 30),
      allDay: false,
      location: 'Studio B',
      notes: 'Bring the week view explorations.',
      reminders: [30],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'evt-focus',
      calendarId: CAL_PERSONAL,
      title: 'Focus day',
      ...focus,
      reminders: [],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'evt-dentist',
      calendarId: CAL_FAMILY,
      title: 'Dentist',
      start: at(3, 11, 0),
      end: at(3, 12, 0),
      allDay: false,
      location: 'North Clinic',
      reminders: [60, 1440],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'evt-offsite',
      calendarId: CAL_WORK,
      title: 'Team offsite',
      ...offsite,
      location: 'Lakeside House',
      reminders: [1440],
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'evt-dinner',
      calendarId: CAL_FAMILY,
      title: 'Family dinner',
      start: at(-1, 19, 0),
      end: at(-1, 21, 0),
      allDay: false,
      location: 'Home',
      reminders: [60],
      createdAt: stamp,
      updatedAt: stamp,
    },
  ]
}

export function seedLists(): TaskListDef[] {
  return [
    { id: LIST_REMINDERS, name: 'Todo', color: '#0A84FF' },
    { id: LIST_PERSONAL, name: 'Personal', color: '#34C759' },
    { id: LIST_WORK, name: 'Work', color: '#FF9500' },
  ]
}

export function seedTasks(): Task[] {
  const stamp = now()
  return [
    {
      id: 'task-proposal',
      listId: LIST_WORK,
      title: 'Send the proposal',
      due: at(0, 17, 0),
      priority: 'high',
      completed: false,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'task-groceries',
      listId: LIST_PERSONAL,
      title: 'Buy groceries',
      due: at(0, 18, 0),
      priority: 'none',
      completed: false,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'task-flights',
      listId: LIST_WORK,
      title: 'Book offsite flights',
      due: at(1, 12, 0),
      priority: 'medium',
      completed: false,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'task-passport',
      listId: LIST_PERSONAL,
      title: 'Renew passport',
      due: at(8, 9, 0),
      priority: 'low',
      completed: false,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'task-contract',
      listId: LIST_WORK,
      title: 'Review the contract',
      due: at(-1, 15, 0),
      priority: 'medium',
      completed: true,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ]
}
