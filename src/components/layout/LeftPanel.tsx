import { motion } from 'framer-motion'
import { EASE } from '@/lib/constants'
import { MiniCalendar } from '@/components/calendar/MiniCalendar'
import { NamazFlash } from '@/components/calendar/NamazFlash'
import { CalendarMenu } from '@/components/calendar/CalendarMenu'
import { CalendarList } from '@/components/calendar/CalendarList'
import { useCalendar } from '@/hooks/useCalendar'
import { useCalendarStore } from '@/store/calendarStore'

export function LeftPanel() {
  const open = useCalendarStore((state) => state.leftOpen)
  const { selected, selectDay } = useCalendar()
  return (
    <motion.aside
      animate={{ width: open ? 236 : 0 }}
      transition={{ duration: 0.26, ease: EASE }}
      className="sidebar-surface h-full shrink-0 overflow-hidden border-r border-divider"
    >
      <div className="flex h-full w-[236px] flex-col">
        <div className="chrome drag relative z-30 flex h-[46px] shrink-0 items-center px-2">
          <CalendarMenu />
        </div>
        <CalendarList />
        <div className="relative mt-auto border-t border-divider px-1 pb-2 pt-1">
          <MiniCalendar selected={selected} onSelect={selectDay} />
          <NamazFlash />
        </div>
      </div>
    </motion.aside>
  )
}
