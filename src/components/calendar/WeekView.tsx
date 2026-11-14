import { TimeGrid } from '@/components/calendar/TimeGrid'
import { useCalendar } from '@/hooks/useCalendar'

export function WeekView() {
  const { weekDays } = useCalendar()
  return <TimeGrid days={weekDays} />
}
