import { clearHeadlinesCache } from '@/components/dashboard/headlines'
import { uid } from '@/lib/id'
import { seedCalendars, seedLists } from '@/store/seed'
import { useCalendarStore } from '@/store/calendarStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { useEventStore } from '@/store/eventStore'
import { useReminderStore } from '@/store/reminderStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTaskStore } from '@/store/taskStore'
import { useWhiteboardStore } from '@/store/whiteboardStore'

const OWNER_KEY = 'kip-data-owner'
const CLEAR_KEYS = ['kip-cloud-sync-at', 'kip-sync-at', 'kip-fired-reminders'] as const

/** Wipe local calendar/dashboard data to a clean slate for a new or switched account. */
export function resetLocalUserData(): void {
  useEventStore.setState({ events: [], statuses: {} })
  useTaskStore.setState({ lists: seedLists(), tasks: [] })
  useCalendarStore.setState({ calendars: seedCalendars(), sets: [] })
  useReminderStore.setState({ reminders: [] })

  useDashboardStore.setState({
    taskPriority: 'medium',
    tasks: [],
    projects: [],
    countdowns: [],
    calls: [],
    habits: [],
    goals: [],
    workouts: [],
    waterGoal: 8,
    water: {},
    notes: [],
    noteColor: '#FFCC00',
    journal: {},
    quoteIndex: 0,
    savedQuotes: [],
    media: [],
    starredWords: [],
    links: [],
    ledger: [],
    wishes: [],
    pomodoro: { running: false, endsAt: null, remaining: 25 * 60, sessions: {} },
  })

  const board = { id: uid(), title: 'Untitled', items: [], updatedAt: Date.now() }
  useWhiteboardStore.setState({
    boards: [board],
    activeId: board.id,
    past: {},
    future: {},
  })

  useSettingsStore.setState({ weatherCity: '' })
  clearHeadlinesCache()

  for (const key of CLEAR_KEYS) localStorage.removeItem(key)
}

/**
 * Scope local stores to the signed-in user.
 * - Same user: keep data.
 * - First login (not onboarded) or account switch: clear to empty.
 * - Upgrade with no owner yet + already onboarded: claim without wiping.
 */
export function bindLocalDataToUser(userId: string, onboarded: boolean): void {
  const owner = localStorage.getItem(OWNER_KEY)
  if (owner === userId) return

  if (owner && owner !== userId) {
    resetLocalUserData()
  } else if (!owner && !onboarded) {
    resetLocalUserData()
  }

  localStorage.setItem(OWNER_KEY, userId)
}
