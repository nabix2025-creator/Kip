import { addMonths, startOfYear, endOfYear } from 'date-fns'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { useCalendar } from '@/hooks/useCalendar'
import { useEventsByDay } from '@/hooks/useEvents'
import { useTheme } from '@/hooks/useTheme'
import { useCalendarStore } from '@/store/calendarStore'
import { useSettingsStore } from '@/store/settingsStore'

export function YearView() {
  const { selected, weekStartsOn, selectDay } = useCalendar()
  const theme = useTheme()
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const calendars = useCalendarStore((state) => state.calendars)
  const start = startOfYear(selected)
  const byDay = useEventsByDay(start, endOfYear(selected))
  const colorOf = (id: string) => calendars.find((calendar) => calendar.id === id)?.color ?? '#0A84FF'
  return (
    <div className="grid h-full content-start gap-x-4 gap-y-5 overflow-auto p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
      {Array.from({ length: 12 }, (_, index) => (
        <MonthGrid
          key={index}
          month={addMonths(start, index)}
          variant="year"
          byDay={byDay}
          weekStartsOn={weekStartsOn}
          selected={selected}
          timeFormat={timeFormat}
          theme={theme}
          colorOf={colorOf}
          onSelect={selectDay}
        />
      ))}
    </div>
  )
}
