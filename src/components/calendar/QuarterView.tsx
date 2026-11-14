import { addMonths } from 'date-fns'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { useCalendar } from '@/hooks/useCalendar'
import { useEventsByDay } from '@/hooks/useEvents'
import { useTheme } from '@/hooks/useTheme'
import { endOfMonth, startOfQuarter } from '@/lib/dates'
import { useCalendarStore } from '@/store/calendarStore'
import { useSettingsStore } from '@/store/settingsStore'

export function QuarterView() {
  const { selected, weekStartsOn, selectDay } = useCalendar()
  const theme = useTheme()
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const calendars = useCalendarStore((state) => state.calendars)
  const start = startOfQuarter(selected)
  const months = [0, 1, 2].map((offset) => addMonths(start, offset))
  const byDay = useEventsByDay(start, endOfMonth(months[2]))
  const colorOf = (id: string) => calendars.find((calendar) => calendar.id === id)?.color ?? '#0A84FF'
  return (
    <div className="grid h-full min-h-0 grid-cols-3 gap-3 overflow-auto p-4">
      {months.map((month) => (
        <MonthGrid key={month.toISOString()} month={month} variant="quarter" byDay={byDay} weekStartsOn={weekStartsOn} selected={selected} timeFormat={timeFormat} theme={theme} colorOf={colorOf} onSelect={selectDay} />
      ))}
    </div>
  )
}
