import { ChevronLeft, ChevronRight, Menu, PanelRight, Plus, Search, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE } from '@/lib/constants'
import { IconButton } from '@/components/ui/IconButton'
import { ViewSwitcher } from '@/components/ui/ViewSwitcher'
import { WindowControls } from '@/components/layout/WindowControls'
import { DayView } from '@/components/calendar/DayView'
import { WeekView } from '@/components/calendar/WeekView'
import { MonthView } from '@/components/calendar/MonthView'
import { QuarterView } from '@/components/calendar/QuarterView'
import { YearView } from '@/components/calendar/YearView'
import { useCalendar } from '@/hooks/useCalendar'
import { useCalendarStore } from '@/store/calendarStore'
import { blankDraft } from '@/lib/draft'

const views = {
  day: DayView,
  week: WeekView,
  month: MonthView,
  quarter: QuarterView,
  year: YearView,
}

export function MainPanel() {
  const { view, title, navDirection, range, go, goToday, changeView } = useCalendar()
  const toggleLeft = useCalendarStore((state) => state.toggleLeft)
  const toggleRight = useCalendarStore((state) => state.toggleRight)
  const rightOpen = useCalendarStore((state) => state.rightOpen)
  const openSearch = useCalendarStore((state) => state.openSearch)
  const openNl = useCalendarStore((state) => state.openNl)
  const openSettings = useCalendarStore((state) => state.openSettings)
  const [menu, setMenu] = useState(false)
  const View = views[view]
  const choose = (action: () => void) => () => {
    action()
    setMenu(false)
  }

  useEffect(() => {
    document.title = `${title} — Kip`
  }, [title])

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-primary">
      <header
        className="chrome drag relative z-20 grid h-[46px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3"
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest('button')) return
          window.api?.maximize()
        }}
      >
        <div className="no-drag flex min-w-0 items-center justify-start gap-1">
          <IconButton aria-label="Menu" onClick={() => setMenu((open) => !open)}>
            <Menu size={16} strokeWidth={1.8} />
          </IconButton>
          <IconButton aria-label="New event" onClick={openNl}>
            <Plus size={17} strokeWidth={2} />
          </IconButton>
          <div className="ml-1 min-w-0 truncate text-[13px] font-semibold tracking-[-0.02em] text-primary/80">{title}</div>
        </div>

        <div className="no-drag flex items-center justify-center">
          <ViewSwitcher value={view} onChange={changeView} />
        </div>

        <div className="no-drag flex min-w-0 items-center justify-end gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <IconButton aria-label="Previous" onClick={() => go(-1)}>
            <ChevronLeft size={18} strokeWidth={1.8} />
          </IconButton>
          <button type="button" onClick={goToday} className="mac-toolbar-btn">
            Today
          </button>
          <IconButton aria-label="Next" onClick={() => go(1)}>
            <ChevronRight size={18} strokeWidth={1.8} />
          </IconButton>
          <IconButton aria-label="Search" onClick={openSearch}>
            <Search size={16} strokeWidth={1.8} />
          </IconButton>
          <IconButton aria-label="Agenda" active={rightOpen} onClick={toggleRight}>
            <PanelRight size={16} strokeWidth={1.8} />
          </IconButton>
          {!rightOpen && <WindowControls />}
        </div>

        {menu && (
          <div className="glass no-drag absolute left-3 top-11 z-40 w-56 overflow-hidden p-1.5" onMouseLeave={() => setMenu(false)}>
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
      </header>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${view}-${range.start.toISOString()}`}
            className="absolute inset-0"
            initial={{ opacity: 0, x: navDirection * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: navDirection * -20 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
          >
            <View />
          </motion.div>
        </AnimatePresence>
      </div>
      <button type="button" className="sr-only" onClick={openSettings}>
        <Settings size={1} />
      </button>
    </section>
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
