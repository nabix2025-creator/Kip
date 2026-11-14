import { MonthGrid } from '@/components/calendar/MonthGrid'
import { useCalendar } from '@/hooks/useCalendar'
import { useEventsByDay } from '@/hooks/useEvents'
import { useTheme } from '@/hooks/useTheme'
import { getMonthGrid } from '@/lib/dates'
import { useCalendarStore } from '@/store/calendarStore'
import { useSettingsStore } from '@/store/settingsStore'

export function MonthView() {
  const { selected, weekStartsOn, selectDay } = useCalendar()
  const theme = useTheme()
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const calendars = useCalendarStore((state) => state.calendars)
  const grid = getMonthGrid(selected, weekStartsOn)
  const byDay = useEventsByDay(grid[0], grid[grid.length - 1])
  const colorOf = (id: string) => calendars.find((calendar) => calendar.id === id)?.color ?? '#0A84FF'
  return (
    <div className="h-full min-h-0 p-2">
      <MonthGrid month={selected} variant="month" byDay={byDay} weekStartsOn={weekStartsOn} selected={selected} timeFormat={timeFormat} theme={theme} colorOf={colorOf} onSelect={selectDay} />
    </div>
  )
}
