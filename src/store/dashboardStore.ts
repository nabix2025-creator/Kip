import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toDateKey } from '@/lib/dates'
import { uid } from '@/lib/id'
import { QUOTES } from '@/lib/quotes'
import { makeAddon, makeStep, normalizeProject, syncProjectNext } from '@/lib/projects'

export type DashPriority = 'low' | 'medium' | 'high'
export type MediaKind = 'books' | 'movies' | 'anime'
export type MoneyKind = 'income' | 'expense'
export type ProjectAddonKind = 'tool' | 'dep' | 'person' | 'resource'
export type ProjectAddonStatus = 'needed' | 'done'

export interface DashTask {
  id: string
  title: string
  priority: DashPriority
  done: boolean
  day: string
}

export interface ProjectStep {
  id: string
  label: string
  done: boolean
}

export interface ProjectAddon {
  id: string
  label: string
  kind: ProjectAddonKind
  status: ProjectAddonStatus
}

export interface Project {
  id: string
  name: string
  priority: DashPriority
  done: boolean
  /** Derived from first open pathway step; kept for list/today summaries. */
  next?: string
  /** YYYY-MM-DD target, optional. */
  targetDate?: string
  steps: ProjectStep[]
  addons: ProjectAddon[]
}

export interface Countdown {
  id: string
  name: string
  at: string
}

export interface CallReminder {
  id: string
  who: string
  phone: string
  at: string
  reminded: boolean
}

export interface Habit {
  id: string
  name: string
  checks: Record<string, boolean>
}

export interface Goal {
  id: string
  name: string
  target: number
  current: number
}

export interface Workout {
  id: string
  name: string
  minutes: number
  day: string
}

export interface Note {
  id: string
  text: string
  color: string
  createdAt: string
}

export interface MediaItem {
  id: string
  title: string
  kind: MediaKind
  done: boolean
}

export interface QuickLink {
  id: string
  label: string
  url: string
}

export interface LedgerEntry {
  id: string
  description: string
  amount: number
  kind: MoneyKind
  day: string
}

export interface Wish {
  id: string
  title: string
  price: string
  url: string
  bought: boolean
}

export interface PomodoroState {
  running: boolean
  endsAt: number | null
  remaining: number
  sessions: Record<string, number>
}

export type RoutineKind = 'morning' | 'evening'

export interface RoutineStep {
  id: string
  label: string
}

export interface FocusSessionLog {
  id: string
  at: string
  durationMin: number
  kind: 'pomodoro' | 'deep'
  label?: string
}

export interface WeeklyReview {
  weekKey: string
  top3: string[]
  notes: string
  completedAt?: string
}

const FOCUS_SECONDS = 25 * 60

interface DashboardState {
  taskPriority: DashPriority
  tasks: DashTask[]
  projects: Project[]
  countdowns: Countdown[]
  calls: CallReminder[]
  habits: Habit[]
  goals: Goal[]
  workouts: Workout[]
  waterGoal: number
  water: Record<string, number>
  notes: Note[]
  noteColor: string
  journal: Record<string, string>
  quoteIndex: number
  savedQuotes: number[]
  media: MediaItem[]
  starredWords: string[]
  links: QuickLink[]
  ledger: LedgerEntry[]
  wishes: Wish[]
  pomodoro: PomodoroState
  morningSteps: RoutineStep[]
  eveningSteps: RoutineStep[]
  routineChecks: Record<string, Record<string, boolean>>
  focusLogs: FocusSessionLog[]
  weeklyReviews: WeeklyReview[]
  reviewDay: 0 | 1 | 2 | 3 | 4 | 5 | 6
  setTaskPriority: (priority: DashPriority) => void
  addTask: (title: string) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
  addProject: (name: string, priority: DashPriority) => string
  toggleProject: (id: string) => void
  renameProject: (id: string, name: string) => void
  setProjectPriority: (id: string, priority: DashPriority) => void
  setProjectNext: (id: string, next: string) => void
  setProjectTargetDate: (id: string, targetDate: string) => void
  removeProject: (id: string) => void
  addProjectStep: (projectId: string, label: string) => void
  renameProjectStep: (projectId: string, stepId: string, label: string) => void
  toggleProjectStep: (projectId: string, stepId: string) => void
  removeProjectStep: (projectId: string, stepId: string) => void
  moveProjectStep: (projectId: string, stepId: string, direction: -1 | 1) => void
  addProjectAddon: (projectId: string, label: string, kind: ProjectAddonKind) => void
  toggleProjectAddon: (projectId: string, addonId: string) => void
  removeProjectAddon: (projectId: string, addonId: string) => void
  addCountdown: (name: string, at: string) => void
  removeCountdown: (id: string) => void
  addCall: (input: { who: string; phone: string; at: string }) => void
  removeCall: (id: string) => void
  markCallReminded: (id: string) => void
  addHabit: (name: string) => void
  toggleHabit: (id: string, day: string) => void
  removeHabit: (id: string) => void
  addGoal: (name: string, target: number) => void
  stepGoal: (id: string, delta: number) => void
  removeGoal: (id: string) => void
  addWorkout: (name: string, minutes: number, day: string) => void
  removeWorkout: (id: string) => void
  setWaterGoal: (goal: number) => void
  addWater: (day: string, delta: number) => void
  setNoteColor: (color: string) => void
  addNote: (text: string) => void
  removeNote: (id: string) => void
  setJournal: (day: string, text: string) => void
  cycleQuote: (direction: 1 | -1) => void
  setQuote: (index: number) => void
  toggleSavedQuote: (index: number) => void
  addMedia: (title: string, kind: MediaKind) => void
  toggleMedia: (id: string) => void
  removeMedia: (id: string) => void
  toggleStar: (en: string) => void
  addLink: (label: string, url: string) => void
  removeLink: (id: string) => void
  addLedger: (entry: Omit<LedgerEntry, 'id'>) => void
  removeLedger: (id: string) => void
  addWish: (wish: Omit<Wish, 'id' | 'bought'>) => void
  toggleWish: (id: string) => void
  removeWish: (id: string) => void
  startPomodoro: () => void
  pausePomodoro: () => void
  resetPomodoro: () => void
  syncPomodoro: () => boolean
  addRoutineStep: (kind: RoutineKind, label: string) => void
  removeRoutineStep: (kind: RoutineKind, id: string) => void
  toggleRoutineStep: (stepId: string, day: string) => void
  logFocusSession: (input: { durationMin: number; kind: 'pomodoro' | 'deep'; label?: string; at?: string }) => void
  removeFocusLog: (id: string) => void
  setReviewDay: (day: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void
  saveWeeklyReview: (weekKey: string, top3: string[], notes: string) => void
  focusMinutesOn: (day: string) => number
}

function today() {
  return toDateKey(new Date())
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
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
      pomodoro: { running: false, endsAt: null, remaining: FOCUS_SECONDS, sessions: {} },
      morningSteps: [],
      eveningSteps: [],
      routineChecks: {},
      focusLogs: [],
      weeklyReviews: [],
      reviewDay: 0,
      setTaskPriority: (taskPriority) => set({ taskPriority }),
      addTask: (title) => {
        const name = title.trim()
        if (!name) return
        const day = today()
        set((state) => ({
          tasks: [{ id: uid(), title: name, priority: state.taskPriority, done: false, day }, ...state.tasks.filter((task) => task.day === day)],
        }))
      },
      toggleTask: (id) =>
        set((state) => ({ tasks: state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)) })),
      removeTask: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
      addProject: (name, priority) => {
        const title = name.trim()
        if (!title) return ''
        const id = uid()
        set((state) => ({
          projects: [{ id, name: title, priority, done: false, next: '', targetDate: '', steps: [], addons: [] }, ...state.projects],
        }))
        return id
      },
      toggleProject: (id) =>
        set((state) => ({ projects: state.projects.map((project) => (project.id === id ? { ...project, done: !project.done } : project)) })),
      renameProject: (id, name) => {
        const title = name.trim()
        if (!title) return
        set((state) => ({ projects: state.projects.map((project) => (project.id === id ? { ...project, name: title } : project)) }))
      },
      setProjectPriority: (id, priority) =>
        set((state) => ({ projects: state.projects.map((project) => (project.id === id ? { ...project, priority } : project)) })),
      setProjectNext: (id, next) =>
        set((state) => ({ projects: state.projects.map((project) => (project.id === id ? { ...project, next } : project)) })),
      setProjectTargetDate: (id, targetDate) =>
        set((state) => ({
          projects: state.projects.map((project) => (project.id === id ? { ...project, targetDate: targetDate.trim() } : project)),
        })),
      removeProject: (id) => set((state) => ({ projects: state.projects.filter((project) => project.id !== id) })),
      addProjectStep: (projectId, label) => {
        const title = label.trim()
        if (!title) return
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project
            return syncProjectNext({ ...project, steps: [...project.steps, makeStep(title)] })
          }),
        }))
      },
      renameProjectStep: (projectId, stepId, label) => {
        const title = label.trim()
        if (!title) return
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project
            return syncProjectNext({
              ...project,
              steps: project.steps.map((step) => (step.id === stepId ? { ...step, label: title } : step)),
            })
          }),
        }))
      },
      toggleProjectStep: (projectId, stepId) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project
            return syncProjectNext({
              ...project,
              steps: project.steps.map((step) => (step.id === stepId ? { ...step, done: !step.done } : step)),
            })
          }),
        })),
      removeProjectStep: (projectId, stepId) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project
            return syncProjectNext({ ...project, steps: project.steps.filter((step) => step.id !== stepId) })
          }),
        })),
      moveProjectStep: (projectId, stepId, direction) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project
            const index = project.steps.findIndex((step) => step.id === stepId)
            const nextIndex = index + direction
            if (index < 0 || nextIndex < 0 || nextIndex >= project.steps.length) return project
            const steps = [...project.steps]
            const [item] = steps.splice(index, 1)
            steps.splice(nextIndex, 0, item)
            return syncProjectNext({ ...project, steps })
          }),
        })),
      addProjectAddon: (projectId, label, kind) => {
        const title = label.trim()
        if (!title) return
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId ? { ...project, addons: [...project.addons, makeAddon(title, kind)] } : project,
          ),
        }))
      },
      toggleProjectAddon: (projectId, addonId) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project
            return {
              ...project,
              addons: project.addons.map((addon) =>
                addon.id === addonId ? { ...addon, status: addon.status === 'done' ? 'needed' : 'done' } : addon,
              ),
            }
          }),
        })),
      removeProjectAddon: (projectId, addonId) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId ? { ...project, addons: project.addons.filter((addon) => addon.id !== addonId) } : project,
          ),
        })),
      addCountdown: (name, at) => {
        const title = name.trim()
        if (!title || !at) return
        set((state) => ({ countdowns: [...state.countdowns, { id: uid(), name: title, at }] }))
      },
      removeCountdown: (id) => set((state) => ({ countdowns: state.countdowns.filter((item) => item.id !== id) })),
      addCall: (input) => {
        const who = input.who.trim()
        if (!who || !input.at) return
        set((state) => ({
          calls: [...state.calls, { id: uid(), who, phone: input.phone.trim(), at: input.at, reminded: false }],
        }))
      },
      removeCall: (id) => set((state) => ({ calls: state.calls.filter((call) => call.id !== id) })),
      markCallReminded: (id) =>
        set((state) => ({ calls: state.calls.map((call) => (call.id === id ? { ...call, reminded: true } : call)) })),
      addHabit: (name) => {
        const title = name.trim()
        if (!title) return
        if (get().habits.some((habit) => habit.name.toLowerCase() === title.toLowerCase())) return
        set((state) => ({ habits: [...state.habits, { id: uid(), name: title, checks: {} }] }))
      },
      toggleHabit: (id, day) =>
        set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === id ? { ...habit, checks: { ...habit.checks, [day]: !habit.checks[day] } } : habit,
          ),
        })),
      removeHabit: (id) => set((state) => ({ habits: state.habits.filter((habit) => habit.id !== id) })),
      addGoal: (name, target) => {
        const title = name.trim()
        const size = Math.max(1, Math.round(target) || 1)
        if (!title) return
        set((state) => ({ goals: [...state.goals, { id: uid(), name: title, target: size, current: 0 }] }))
      },
      stepGoal: (id, delta) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id ? { ...goal, current: Math.max(0, Math.min(goal.target, goal.current + delta)) } : goal,
          ),
        })),
      removeGoal: (id) => set((state) => ({ goals: state.goals.filter((goal) => goal.id !== id) })),
      addWorkout: (name, minutes, day) => {
        const title = name.trim()
        const length = Math.max(1, Math.round(minutes) || 1)
        if (!title) return
        set((state) => ({ workouts: [{ id: uid(), name: title, minutes: length, day }, ...state.workouts] }))
      },
      removeWorkout: (id) => set((state) => ({ workouts: state.workouts.filter((workout) => workout.id !== id) })),
      setWaterGoal: (goal) =>
        set((state) => {
          const day = today()
          const current = state.water[day] ?? 0
          return { waterGoal: goal, water: { ...state.water, [day]: Math.min(current, goal) } }
        }),
      addWater: (day, delta) =>
        set((state) => {
          const current = state.water[day] ?? 0
          return { water: { ...state.water, [day]: Math.max(0, Math.min(state.waterGoal, current + delta)) } }
        }),
      setNoteColor: (noteColor) => set({ noteColor }),
      addNote: (text) => {
        const body = text.trim()
        if (!body) return
        set((state) => ({ notes: [{ id: uid(), text: body, color: state.noteColor, createdAt: new Date().toISOString() }, ...state.notes] }))
      },
      removeNote: (id) => set((state) => ({ notes: state.notes.filter((note) => note.id !== id) })),
      setJournal: (day, text) => set((state) => ({ journal: { ...state.journal, [day]: text } })),
      cycleQuote: (direction) =>
        set((state) => ({ quoteIndex: (state.quoteIndex + direction + QUOTES.length) % QUOTES.length })),
      setQuote: (quoteIndex) => set({ quoteIndex }),
      toggleSavedQuote: (index) =>
        set((state) => ({
          savedQuotes: state.savedQuotes.includes(index) ? state.savedQuotes.filter((item) => item !== index) : [...state.savedQuotes, index],
        })),
      addMedia: (title, kind) => {
        const name = title.trim()
        if (!name) return
        set((state) => ({ media: [{ id: uid(), title: name, kind, done: false }, ...state.media] }))
      },
      toggleMedia: (id) =>
        set((state) => ({ media: state.media.map((item) => (item.id === id ? { ...item, done: !item.done } : item)) })),
      removeMedia: (id) => set((state) => ({ media: state.media.filter((item) => item.id !== id) })),
      toggleStar: (en) =>
        set((state) => ({
          starredWords: state.starredWords.includes(en) ? state.starredWords.filter((word) => word !== en) : [...state.starredWords, en],
        })),
      addLink: (label, url) => {
        const name = label.trim()
        const href = url.trim()
        if (!name || !href) return
        set((state) => ({ links: [{ id: uid(), label: name, url: href }, ...state.links] }))
      },
      removeLink: (id) => set((state) => ({ links: state.links.filter((link) => link.id !== id) })),
      addLedger: (entry) => {
        if (!entry.amount || entry.amount <= 0) return
        set((state) => ({ ledger: [{ ...entry, id: uid(), description: entry.description.trim() || (entry.kind === 'income' ? 'Income' : 'Expense') }, ...state.ledger] }))
      },
      removeLedger: (id) => set((state) => ({ ledger: state.ledger.filter((entry) => entry.id !== id) })),
      addWish: (wish) => {
        const title = wish.title.trim()
        if (!title) return
        set((state) => ({ wishes: [{ id: uid(), title, price: wish.price.trim(), url: wish.url.trim(), bought: false }, ...state.wishes] }))
      },
      toggleWish: (id) =>
        set((state) => ({ wishes: state.wishes.map((wish) => (wish.id === id ? { ...wish, bought: !wish.bought } : wish)) })),
      removeWish: (id) => set((state) => ({ wishes: state.wishes.filter((wish) => wish.id !== id) })),
      startPomodoro: () =>
        set((state) => ({
          pomodoro: { ...state.pomodoro, running: true, endsAt: Date.now() + state.pomodoro.remaining * 1000 },
        })),
      pausePomodoro: () =>
        set((state) => {
          const left = state.pomodoro.endsAt ? Math.max(0, Math.ceil((state.pomodoro.endsAt - Date.now()) / 1000)) : state.pomodoro.remaining
          return { pomodoro: { ...state.pomodoro, running: false, endsAt: null, remaining: left } }
        }),
      resetPomodoro: () => set((state) => ({ pomodoro: { ...state.pomodoro, running: false, endsAt: null, remaining: FOCUS_SECONDS } })),
      syncPomodoro: () => {
        const current = get().pomodoro
        if (!current.running || !current.endsAt) return false
        const left = Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000))
        if (left <= 0) {
          const day = today()
          const stamp = new Date().toISOString()
          set({
            pomodoro: {
              running: false,
              endsAt: null,
              remaining: FOCUS_SECONDS,
              sessions: { ...current.sessions, [day]: (current.sessions[day] ?? 0) + 1 },
            },
            focusLogs: [
              { id: uid(), at: stamp, durationMin: 25, kind: 'pomodoro' as const, label: 'Pomodoro' },
              ...get().focusLogs,
            ].slice(0, 200),
          })
          return true
        }
        if (left !== current.remaining) set({ pomodoro: { ...current, remaining: left } })
        return false
      },
      addRoutineStep: (kind, label) => {
        const title = label.trim()
        if (!title) return
        const key = kind === 'morning' ? 'morningSteps' : 'eveningSteps'
        const list = get()[key]
        if (list.some((step) => step.label.toLowerCase() === title.toLowerCase())) return
        set({ [key]: [...list, { id: uid(), label: title }] })
      },
      removeRoutineStep: (kind, id) => {
        const key = kind === 'morning' ? 'morningSteps' : 'eveningSteps'
        set((state) => ({ [key]: state[key].filter((step) => step.id !== id) }))
      },
      toggleRoutineStep: (stepId, day) =>
        set((state) => {
          const dayChecks = { ...(state.routineChecks[day] ?? {}) }
          dayChecks[stepId] = !dayChecks[stepId]
          return { routineChecks: { ...state.routineChecks, [day]: dayChecks } }
        }),
      logFocusSession: (input) => {
        const durationMin = Math.max(1, Math.round(input.durationMin) || 1)
        set((state) => ({
          focusLogs: [
            {
              id: uid(),
              at: input.at ?? new Date().toISOString(),
              durationMin,
              kind: input.kind,
              label: input.label?.trim() || (input.kind === 'deep' ? 'Deep work' : 'Pomodoro'),
            },
            ...state.focusLogs,
          ].slice(0, 200),
        }))
      },
      removeFocusLog: (id) => set((state) => ({ focusLogs: state.focusLogs.filter((item) => item.id !== id) })),
      setReviewDay: (reviewDay) => set({ reviewDay }),
      saveWeeklyReview: (weekKey, top3, notes) => {
        const cleaned = top3.map((item) => item.trim()).filter(Boolean).slice(0, 3)
        const entry: WeeklyReview = {
          weekKey,
          top3: cleaned,
          notes: notes.trim(),
          completedAt: new Date().toISOString(),
        }
        set((state) => ({
          weeklyReviews: [entry, ...state.weeklyReviews.filter((item) => item.weekKey !== weekKey)].slice(0, 52),
        }))
      },
      focusMinutesOn: (day) =>
        get().focusLogs.filter((log) => log.at.slice(0, 10) === day).reduce((sum, log) => sum + log.durationMin, 0),
    }),
    {
      name: 'kip-dashboard',
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<DashboardState>
        return {
          ...current,
          ...saved,
          projects: Array.isArray(saved.projects)
            ? saved.projects.map((project) => normalizeProject(project as Project))
            : current.projects,
        }
      },
    },
  ),
)

export const FOCUS_LENGTH = FOCUS_SECONDS
