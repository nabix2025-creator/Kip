import { useState } from 'react'
import { Menu, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { EASE } from '@/lib/constants'
import { MiniCalendar } from '@/components/calendar/MiniCalendar'
import { NamazFlash } from '@/components/calendar/NamazFlash'
import { CalendarList } from '@/components/calendar/CalendarList'
import { IconButton } from '@/components/ui/IconButton'
import { useCalendar } from '@/hooks/useCalendar'
import { useCalendarStore } from '@/store/calendarStore'
import { blankDraft } from '@/lib/draft'

export function LeftPanel() {
  const open = useCalendarStore((state) => state.leftOpen)
  const toggleLeft = useCalendarStore((state) => state.toggleLeft)
  const toggleRight = useCalendarStore((state) => state.toggleRight)
  const openNl = useCalendarStore((state) => state.openNl)
  const openSettings = useCalendarStore((state) => state.openSettings)
  const { selected, selectDay, title, goToday } = useCalendar()
  const [menu, setMenu] = useState(false)
  const choose = (action: () => void) => () => {
    action()
    setMenu(false)
  }

  return (
    <motion.aside
      animate={{ width: open ? 236 : 0 }}
      transition={{ duration: 0.26, ease: EASE }}
      className="sidebar-surface h-full shrink-0 overflow-hidden border-r border-divider"
    >
      <div className="flex h-full w-[236px] flex-col">
        <div className="chrome drag relative z-30 flex h-[46px] shrink-0 items-center gap-1 px-2">
          <div className="no-drag flex min-w-0 items-center gap-1">
            <IconButton aria-label="Menu" onClick={() => setMenu((value) => !value)}>
              <Menu size={16} strokeWidth={1.8} />
            </IconButton>
            <IconButton aria-label="New event" onClick={openNl}>
              <Plus size={17} strokeWidth={2} />
            </IconButton>
            <div className="ml-1 min-w-0 truncate text-[13px] font-semibold tracking-[-0.02em] text-primary/80">{title}</div>
          </div>

          {menu && (
            <div className="glass no-drag absolute left-2 top-11 z-40 w-56 overflow-hidden p-1.5" onMouseLeave={() => setMenu(false)}>
              <MenuButton label="Hide sidebar" hint="Ctrl \\" onClick={choose(toggleLeft)} />
              <MenuButton label="Show agenda" onClick={choose(toggleRight)} />
              <MenuButton label="Go to today" hint="Ctrl T" onClick={choose(goToday)} />
              <MenuButton label="New event" hint="Ctrl K" onClick={choose(openNl)} />
              <MenuButton label="Whiteboard" onClick={choose(() => useCalendarStore.getState().openWhiteboard())} />
              <MenuButton
                label="New from slot"
                onClick={choose(() => useCalendarStore.getState().openEventModal({ mode: 'create', series: false, draft: blankDraft() }))}
              />
              <div className="ios-hairline my-1" />
              <MenuButton label="Settings" onClick={choose(openSettings)} />
              {window.api && <MenuButton label="Quit" onClick={choose(() => window.api?.quit())} />}
            </div>
          )}
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

function MenuButton({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-[13px] tracking-[-0.01em] hover:bg-fill/10"
      onClick={onClick}
    >
      <span>{label}</span>
      {hint && <span className="text-[11px] text-tertiary">{hint}</span>}
    </button>
  )
}
