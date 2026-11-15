import { useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarCheck2,
  ChevronLeft,
  Flag,
  Focus,
  FolderKanban,
  Link2,
  ListChecks,
  Newspaper,
  NotebookPen,
  ShoppingBag,
  StickyNote,
  Sun,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { useCalendarStore } from '@/store/calendarStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { WindowControls } from '@/components/layout/WindowControls'
import { TodayDesk } from '@/components/dashboard/TodayDesk'
import { FocusDesk, RoutinesDesk, WeeklyReviewDesk } from '@/components/dashboard/DisciplineDesks'
import { GoalsDesk, HabitsDesk, ProjectsDesk } from '@/components/dashboard/WorkDesks'
import { JournalDesk, LibraryDesk, NotesDesk } from '@/components/dashboard/CaptureDesks'
import { FinanceDesk, LinksDesk, NewsDesk, WishlistDesk } from '@/components/dashboard/LifeDesks'
import type { DeskId } from '@/components/dashboard/chrome'
import { DESK_TONE, GROUP_TONE, toneIcon, toneText, toneWashStrong, type DashTone } from '@/components/dashboard/tones'

const GROUPS: { label: keyof typeof GROUP_TONE; items: { id: DeskId; label: string; icon: LucideIcon }[] }[] = [
  {
    label: 'Work',
    items: [
      { id: 'projects', label: 'My projects', icon: FolderKanban },
      { id: 'habits', label: 'Habits', icon: Target },
      { id: 'routines', label: 'Routines', icon: ListChecks },
      { id: 'focus', label: 'Focus', icon: Focus },
      { id: 'review', label: 'Weekly review', icon: CalendarCheck2 },
      { id: 'goals', label: 'Goals', icon: Flag },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'finance', label: 'Finance', icon: Wallet },
      { id: 'wishlist', label: 'Buy wishlist', icon: ShoppingBag },
    ],
  },
  {
    label: 'Personal',
    items: [
      { id: 'notes', label: 'Notes', icon: StickyNote },
      { id: 'journal', label: 'Journal', icon: NotebookPen },
      { id: 'library', label: 'Watch & read', icon: BookOpen },
    ],
  },
  {
    label: 'Browse',
    items: [
      { id: 'news', label: 'Local news', icon: Newspaper },
      { id: 'links', label: 'Quick links', icon: Link2 },
    ],
  },
]

export function Dashboard() {
  const close = useCalendarStore((state) => state.closeDashboard)
  const section = useCalendarStore((state) => state.dashboardSection)
  const setSection = useCalendarStore((state) => state.setDashboardSection)
  const now = useNow()
  const meta = useMeta(now)

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-grouped">
      <header className="chrome drag flex h-[46px] shrink-0 items-center gap-2 px-2">
        <button
          type="button"
          onClick={close}
          className="no-drag flex h-7 items-center gap-0.5 rounded-[7px] px-2 text-[13px] font-medium text-secondary hover:bg-fill/10 hover:text-primary"
        >
          <ChevronLeft size={16} />
          Calendar
        </button>
        <div className="text-[13px] font-semibold tracking-[-0.01em]">Dashboard</div>
        <div className="ml-auto">
          <WindowControls />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="sidebar-surface flex w-[236px] shrink-0 flex-col border-r border-divider">
          <div className="min-h-0 flex-1 overflow-auto px-2.5 py-3">
            <button
              type="button"
              onClick={() => setSection('today')}
              aria-current={section === 'today' ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left transition-colors duration-150 ease-ios',
                section === 'today' ? 'bg-accent-blue text-white' : 'hover:bg-fill/10',
              )}
            >
              <Sun size={16} strokeWidth={1.8} className={section === 'today' ? 'text-white' : 'text-accent-orange'} />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-4">Today</span>
                <span className={cn('block text-[11px] leading-4', section === 'today' ? 'text-white/75' : 'text-secondary')}>{format(now, 'EEEE, MMM d')}</span>
              </span>
            </button>
            {GROUPS.map((group) => {
              const groupTone: DashTone = GROUP_TONE[group.label]
              return (
                <section key={group.label} className="mt-4">
                  <div className={cn('mb-1 px-2 text-[11px] font-semibold tracking-[0.02em]', toneText[groupTone])}>{group.label}</div>
                  {group.items.map((item) => {
                    const active = section === item.id
                    const count = meta[item.id]
                    const Icon = item.icon
                    const deskTone = DESK_TONE[item.id]
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSection(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2 text-left text-[13px] transition-colors duration-150 ease-ios',
                          active ? 'bg-accent-blue font-medium text-white' : 'hover:bg-fill/10',
                        )}
                      >
                        <Icon size={15} strokeWidth={1.8} className={cn('shrink-0', active ? 'text-white' : toneIcon[deskTone])} />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.id === 'journal' && count ? (
                          <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-white' : 'bg-accent-indigo')} />
                        ) : (
                          count && (
                            <span
                              className={cn(
                                'min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-semibold tabular-nums leading-4',
                                active ? 'bg-white/20 text-white' : cn(toneWashStrong[deskTone], toneText[deskTone]),
                              )}
                            >
                              {count}
                            </span>
                          )
                        )}
                      </button>
                    )
                  })}
                </section>
              )
            })}
          </div>
        </nav>
        <main className="min-h-0 flex-1 overflow-hidden">
          {section === 'today' && <TodayDesk now={now} onOpen={setSection} />}
          {section === 'projects' && <ProjectsDesk />}
          {section === 'habits' && <HabitsDesk now={now} />}
          {section === 'routines' && <RoutinesDesk now={now} />}
          {section === 'focus' && <FocusDesk now={now} />}
          {section === 'review' && <WeeklyReviewDesk now={now} />}
          {section === 'goals' && <GoalsDesk />}
          {section === 'finance' && <FinanceDesk now={now} />}
          {section === 'wishlist' && <WishlistDesk />}
          {section === 'notes' && <NotesDesk />}
          {section === 'journal' && <JournalDesk now={now} />}
          {section === 'library' && <LibraryDesk />}
          {section === 'news' && <NewsDesk />}
          {section === 'links' && <LinksDesk />}
        </main>
      </div>
    </div>
  )
}

function useMeta(now: Date): Partial<Record<DeskId, string>> {
  const day = toDateKey(now)
  const monthKey = format(startOfMonth(now), 'yyyy-MM')
  const projects = useDashboardStore((state) => state.projects)
  const habits = useDashboardStore((state) => state.habits)
  const morningSteps = useDashboardStore((state) => state.morningSteps)
  const eveningSteps = useDashboardStore((state) => state.eveningSteps)
  const routineChecks = useDashboardStore((state) => state.routineChecks)
  const focusMinutesOn = useDashboardStore((state) => state.focusMinutesOn)
  const goals = useDashboardStore((state) => state.goals)
  const notes = useDashboardStore((state) => state.notes)
  const journal = useDashboardStore((state) => state.journal[day] ?? '')
  const media = useDashboardStore((state) => state.media)
  const links = useDashboardStore((state) => state.links)
  const wishes = useDashboardStore((state) => state.wishes)
  const ledger = useDashboardStore((state) => state.ledger)
  const openProjects = projects.filter((project) => !project.done).length
  const openGoals = goals.filter((goal) => goal.current < goal.target).length
  const waiting = media.filter((item) => !item.done).length
  const unbought = wishes.filter((wish) => !wish.bought).length
  const monthCount = ledger.filter((entry) => entry.day.startsWith(monthKey)).length
  const habitsDone = habits.filter((habit) => habit.checks[day]).length
  const routineTotal = morningSteps.length + eveningSteps.length
  const dayChecks = routineChecks[day] ?? {}
  const routineDone = [...morningSteps, ...eveningSteps].filter((step) => dayChecks[step.id]).length
  const focusMin = focusMinutesOn(day)
  return {
    projects: openProjects ? String(openProjects) : undefined,
    habits: habits.length ? `${habitsDone}/${habits.length}` : undefined,
    routines: routineTotal ? `${routineDone}/${routineTotal}` : undefined,
    focus: focusMin ? `${focusMin}m` : undefined,
    goals: openGoals ? String(openGoals) : undefined,
    finance: monthCount ? String(monthCount) : undefined,
    wishlist: unbought ? String(unbought) : undefined,
    notes: notes.length ? String(notes.length) : undefined,
    journal: journal.trim() ? '·' : undefined,
    library: waiting ? String(waiting) : undefined,
    links: links.length ? String(links.length) : undefined,
  }
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}
