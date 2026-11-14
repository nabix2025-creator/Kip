import { TimeGrid } from '@/components/calendar/TimeGrid'
import { useCalendar } from '@/hooks/useCalendar'

export function DayView() {
  const { selected } = useCalendar()
  return <TimeGrid days={[selected]} />
}
