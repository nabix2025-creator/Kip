import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Anchor, Calendar, CalendarEvent, CalendarSet, EventDraft, ViewMode } from '@/types'
import type { DeskId } from '@/components/dashboard/chrome'
import { toDateKey } from '@/lib/dates'
import { uid } from '@/lib/id'
import { EXTRA_SEED_CALENDARS, seedCalendars } from '@/store/seed'

export interface Toast {
  id: string
  message: string
  tone: 'info' | 'error'
}

interface CalendarState {
  calendars: Calendar[]
  sets: CalendarSet[]
  view: ViewMode
  selectedDate: string
  navDirection: 1 | -1
  leftOpen: boolean
  rightOpen: boolean
  focusTick: number
  nlOpen: boolean
  searchOpen: boolean
  settingsOpen: boolean
  addCalendarOpen: boolean
  dashboardOpen: boolean
  whiteboardOpen: boolean
  dashboardSection: DeskId
  popover: { event: CalendarEvent; x: number; y: number } | null
  eventModal: { mode: 'create' | 'edit'; draft: EventDraft; anchor?: Anchor; series: boolean } | null
  toasts: Toast[]
  syncStatus: string
  setView: (view: ViewMode) => void
  setSelectedDate: (isoDate: string) => void
  shiftSelected: (next: Date, direction: 1 | -1) => void
  goToday: () => void
  toggleLeft: () => void
  toggleRight: () => void
  openNl: () => void
  openSearch: () => void
  openSettings: () => void
  openAddCalendar: () => void
  openDashboard: (section?: DeskId) => void
  closeDashboard: () => void
  openWhiteboard: () => void
  closeWhiteboard: () => void
  setDashboardSection: (section: DeskId) => void
  openPopover: (event: CalendarEvent, x: number, y: number) => void
  openEventModal: (modal: NonNullable<CalendarState['eventModal']>) => void
  closeTransient: () => void
  closeTop: () => void
  addCalendar: (calendar: Omit<Calendar, 'id'> & { id?: string }) => string
  updateCalendar: (id: string, patch: Partial<Calendar>) => void
  removeCalendar: (id: string) => void
  toggleCalendar: (id: string) => void
  saveSet: (name: string) => void
  applySet: (id: string) => void
  removeSet: (id: string) => void
  replaceCalendars: (calendars: Calendar[]) => void
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  setSyncStatus: (syncStatus: string) => void
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      calendars: seedCalendars(),
      sets: [],
      view: 'week',
      selectedDate: toDateKey(new Date()),
      navDirection: 1,
      leftOpen: true,
      rightOpen: true,
      focusTick: 0,
      nlOpen: false,
      searchOpen: false,
      settingsOpen: false,
      addCalendarOpen: false,
      dashboardOpen: false,
      whiteboardOpen: false,
      dashboardSection: 'today',
      popover: null,
      eventModal: null,
      toasts: [],
      syncStatus: 'Off',
      setView: (view) => set({ view, navDirection: 1 }),
      setSelectedDate: (selectedDate) => set({ selectedDate }),
      shiftSelected: (next, direction) => set({ selectedDate: toDateKey(next), navDirection: direction }),
      goToday: () => set((state) => ({ selectedDate: toDateKey(new Date()), navDirection: 1, focusTick: state.focusTick + 1 })),
      toggleLeft: () => set((state) => ({ leftOpen: !state.leftOpen })),
      toggleRight: () => set((state) => ({ rightOpen: !state.rightOpen })),
      openNl: () => set({ nlOpen: true, searchOpen: false, settingsOpen: false, addCalendarOpen: false, popover: null }),
      openSearch: () => set({ searchOpen: true, nlOpen: false, settingsOpen: false, addCalendarOpen: false, popover: null }),
      openSettings: () => set({ settingsOpen: true, nlOpen: false, searchOpen: false, addCalendarOpen: false, popover: null }),
      openAddCalendar: () => set({ addCalendarOpen: true, popover: null }),
      openDashboard: (section = 'today') =>
        set({
          dashboardOpen: true,
          whiteboardOpen: false,
          dashboardSection: section,
          nlOpen: false,
          searchOpen: false,
          settingsOpen: false,
          addCalendarOpen: false,
          popover: null,
          eventModal: null,
        }),
      closeDashboard: () => set({ dashboardOpen: false }),
      openWhiteboard: () =>
        set({
          whiteboardOpen: true,
          dashboardOpen: false,
          nlOpen: false,
          searchOpen: false,
          settingsOpen: false,
          addCalendarOpen: false,
          popover: null,
          eventModal: null,
        }),
      closeWhiteboard: () => set({ whiteboardOpen: false }),
      setDashboardSection: (dashboardSection) => set({ dashboardSection }),
      openPopover: (event, x, y) => set({ popover: { event, x, y }, eventModal: null }),
      openEventModal: (eventModal) => set({ eventModal, popover: null, nlOpen: false }),
      closeTransient: () => set({ nlOpen: false, searchOpen: false, settingsOpen: false, addCalendarOpen: false, popover: null, eventModal: null }),
      closeTop: () => {
        const state = get()
        if (state.whiteboardOpen) return set({ whiteboardOpen: false })
        if (state.dashboardOpen) return set({ dashboardOpen: false })
        if (state.popover) return set({ popover: null })
        if (state.nlOpen) return set({ nlOpen: false })
        if (state.searchOpen) return set({ searchOpen: false })
        if (state.addCalendarOpen) return set({ addCalendarOpen: false })
        if (state.eventModal) return set({ eventModal: null })
        if (state.settingsOpen) return set({ settingsOpen: false })
      },
      addCalendar: (calendar) => {
        const id = calendar.id ?? uid()
        set((state) => ({ calendars: [...state.calendars, { ...calendar, id }] }))
        return id
      },
      updateCalendar: (id, patch) =>
        set((state) => ({ calendars: state.calendars.map((calendar) => (calendar.id === id ? { ...calendar, ...patch } : calendar)) })),
      removeCalendar: (id) =>
        set((state) => ({
          calendars: state.calendars.filter((calendar) => calendar.id !== id),
          sets: state.sets.map((entry) => ({ ...entry, visibleIds: entry.visibleIds.filter((calendarId) => calendarId !== id) })),
        })),
      toggleCalendar: (id) =>
        set((state) => ({
          calendars: state.calendars.map((calendar) => (calendar.id === id ? { ...calendar, visible: !calendar.visible } : calendar)),
        })),
      saveSet: (name) =>
        set((state) => ({
          sets: [
            ...state.sets,
            { id: uid(), name: name.trim() || 'Untitled set', visibleIds: state.calendars.filter((calendar) => calendar.visible).map((calendar) => calendar.id) },
          ],
        })),
      applySet: (id) => {
        const entry = get().sets.find((setItem) => setItem.id === id)
        if (!entry) return
        const visible = new Set(entry.visibleIds)
        set((state) => ({ calendars: state.calendars.map((calendar) => ({ ...calendar, visible: visible.has(calendar.id) })) }))
      },
      removeSet: (id) => set((state) => ({ sets: state.sets.filter((entry) => entry.id !== id) })),
      replaceCalendars: (calendars) => set({ calendars }),
      pushToast: (message, tone = 'info') => {
        const id = uid()
        set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
        window.setTimeout(() => get().dismissToast(id), 4200)
      },
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
    }),
    {
      name: 'kip-calendars',
      version: 3,
      migrate: (persisted) => {
        const state = persisted as { calendars?: import('@/types').Calendar[] } | undefined
        if (!state?.calendars) return state as never
        const names = new Set(state.calendars.map((calendar) => calendar.name.trim().toLowerCase()))
        const ids = new Set(state.calendars.map((calendar) => calendar.id))
        const missing = EXTRA_SEED_CALENDARS.filter(
          (calendar) => !ids.has(calendar.id) && !names.has(calendar.name.trim().toLowerCase()),
        )
        const merged = missing.length ? [...state.calendars, ...missing] : state.calendars
        const seen = new Set<string>()
        const calendars = merged.filter((calendar) => {
          const key = calendar.name.trim().toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        return { ...state, calendars } as never
      },
      partialize: (state) => ({
        calendars: state.calendars,
        sets: state.sets,
        view: state.view,
        leftOpen: state.leftOpen,
        rightOpen: state.rightOpen,
      }),
    },
  ),
)
