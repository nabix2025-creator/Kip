import { useMemo } from 'react'
import { useCalendarStore } from '@/store/calendarStore'
import { useSettingsStore } from '@/store/settingsStore'
import { formatPeriodTitle, getViewRange, getWeekDays, parseDateKey, shiftDate, toDateKey } from '@/lib/dates'
import type { ViewMode } from '@/types'

export function useCalendar() {
  const view = useCalendarStore((state) => state.view)
  const selectedDate = useCalendarStore((state) => state.selectedDate)
  const navDirection = useCalendarStore((state) => state.navDirection)
  const weekStartsOn = useSettingsStore((state) => state.weekStartsOn)
  const setView = useCalendarStore((state) => state.setView)
  const shiftSelected = useCalendarStore((state) => state.shiftSelected)
  const goToday = useCalendarStore((state) => state.goToday)
  const setSelectedDate = useCalendarStore((state) => state.setSelectedDate)

  const selected = useMemo(() => parseDateKey(selectedDate), [selectedDate])
  const range = useMemo(() => getViewRange(view, selected, weekStartsOn), [view, selected, weekStartsOn])
  const title = useMemo(() => formatPeriodTitle(view, selected, weekStartsOn), [view, selected, weekStartsOn])
  const weekDays = useMemo(() => getWeekDays(selected, weekStartsOn), [selected, weekStartsOn])

  const go = (direction: 1 | -1) => shiftSelected(shiftDate(view, selected, direction), direction)
  const selectDay = (date: Date) => setSelectedDate(toDateKey(date))
  const changeView = (next: ViewMode) => setView(next)

  return { view, selected, range, title, weekDays, weekStartsOn, navDirection, go, goToday, selectDay, changeView }
}
