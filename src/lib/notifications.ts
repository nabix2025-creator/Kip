import { addMinutes, format, parseISO, startOfDay } from 'date-fns'
import type { Calendar, CalendarEvent, Task } from '@/types'
import type { TimedReminder } from '@/store/reminderStore'
import type { Countdown } from '@/store/dashboardStore'
import { useSettingsStore } from '@/store/settingsStore'

const STORAGE_KEY = 'kip-fired-reminders'
const CATCHUP_MS = 60 * 60 * 1000

export interface ReminderPayload {
  title: string
  body: string
  start?: string
  time?: string
}

function readFired(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[]
    return new Set(raw)
  } catch {
    return new Set()
  }
}

function writeFired(keys: Set<string>): void {
  const list = Array.from(keys).slice(-400)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function timePattern(): string {
  return useSettingsStore.getState().timeFormat === '24h' ? 'HH:mm' : 'h:mm a'
}

function formatEventTime(event: CalendarEvent): string {
  const pattern = timePattern()
  if (event.allDay) return 'All day'
  const start = parseISO(event.start)
  const end = parseISO(event.end)
  return `${format(start, pattern)} – ${format(end, pattern)}`
}

function formatTaskTime(due: string): string {
  const pattern = timePattern()
  if (!due.includes('T')) return 'Due today'
  return `Due ${format(parseISO(due), pattern)}`
}

export async function showSystemNotification(payload: ReminderPayload): Promise<void> {
  if (window.api) {
    await window.api.notify(payload)
    return
  }
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
  }
  if (Notification.permission === 'granted') new Notification(payload.title, { body: payload.body })
}

function markAndNotify(fired: Set<string>, key: string, payload: ReminderPayload): Promise<boolean> {
  if (fired.has(key)) return Promise.resolve(false)
  fired.add(key)
  return showSystemNotification(payload).then(() => true)
}

export async function scanReminders(
  events: CalendarEvent[],
  calendars: Calendar[],
  tasks: Task[] = [],
  timed: TimedReminder[] = [],
  countdowns: Countdown[] = [],
): Promise<void> {
  const visible = new Set(calendars.filter((calendar) => calendar.visible).map((calendar) => calendar.id))
  const fired = readFired()
  const now = Date.now()
  let changed = false
  const pattern = timePattern()

  for (const event of events) {
    if (!visible.has(event.calendarId)) continue
    if (parseISO(event.end).getTime() < now) continue
    const reminders = event.reminders?.length ? event.reminders : []
    const anchor = event.allDay ? new Date(startOfDay(parseISO(event.start)).setHours(9, 0, 0, 0)) : parseISO(event.start)
    for (const minutes of reminders) {
      const remindAt = addMinutes(anchor, -minutes).getTime()
      const delta = now - remindAt
      if (delta < 0 || delta > CATCHUP_MS) continue
      const when = minutes >= 60 ? `${Math.round(minutes / 60)} hr` : `${minutes} min`
      const time = formatEventTime(event)
      const body = event.location ? `Starts in ${when} · ${event.location}` : `Starts in ${when}`
      const key = `event|${event.id}|${event.start}|${minutes}`
      if (await markAndNotify(fired, key, { title: event.title, body, start: event.start, time: `${time} · starts in ${when}` })) {
        changed = true
      }
    }
  }

  for (const task of tasks) {
    if (task.completed || !task.due) continue
    const due = parseISO(task.due)
    const hasTime = task.due.includes('T')
    const remindAt = hasTime ? due.getTime() : new Date(startOfDay(due).setHours(9, 0, 0, 0)).getTime()
    const delta = now - remindAt
    if (delta < 0 || delta > CATCHUP_MS) continue
    const time = formatTaskTime(task.due)
    const key = `task|${task.id}|${task.due}`
    if (await markAndNotify(fired, key, { title: task.title, body: time, start: task.due, time })) changed = true
  }

  for (const reminder of timed) {
    if (reminder.done) continue
    const remindAt = Date.parse(reminder.at)
    if (Number.isNaN(remindAt)) continue
    const delta = now - remindAt
    if (delta < 0 || delta > CATCHUP_MS) continue
    const time = format(new Date(remindAt), pattern)
    const key = `timed|${reminder.id}|${reminder.at}`
    if (
      await markAndNotify(fired, key, {
        title: reminder.title,
        body: time,
        start: reminder.at,
        time,
      })
    ) {
      changed = true
    }
  }

  for (const item of countdowns) {
    const at = Date.parse(item.at)
    if (Number.isNaN(at)) continue
    const delta = now - at
    if (delta < 0 || delta > CATCHUP_MS) continue
    const time = format(new Date(at), pattern)
    const key = `countdown|${item.id}|${item.at}`
    if (
      await markAndNotify(fired, key, {
        title: item.name,
        body: "It's time",
        start: item.at,
        time: `It's time · ${time}`,
      })
    ) {
      changed = true
    }
  }

  if (changed) writeFired(fired)
}
