import { motion } from 'framer-motion'
import { EASE } from '@/lib/constants'
import { useCalendarStore } from '@/store/calendarStore'
import { ReminderList } from '@/components/reminders/ReminderList'
import { TaskList } from '@/components/tasks/TaskList'
import { WindowControls } from '@/components/layout/WindowControls'

export function RightPanel() {
  const open = useCalendarStore((state) => state.rightOpen)

  return (
    <motion.aside
      animate={{ width: open ? 300 : 0 }}
      transition={{ duration: 0.26, ease: EASE }}
      className="sidebar-surface h-full shrink-0 overflow-hidden border-l border-divider"
    >
      <div className="flex h-full w-[300px] flex-col">
        <div className="chrome drag flex h-[46px] shrink-0 items-center justify-end">
          <WindowControls />
        </div>
        <ReminderList />
        <TaskList />
      </div>
    </motion.aside>
  )
}
