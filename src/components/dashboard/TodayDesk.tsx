import { format, startOfMonth } from 'date-fns'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { useDashboardStore } from '@/store/dashboardStore'
import { CheckDot } from '@/components/dashboard/ui'
import { Panel, PanelLabel, readPrice, taka, type DeskId } from '@/components/dashboard/chrome'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { useHeadlines } from '@/components/dashboard/headlines'
import { habitStreak } from '@/components/dashboard/habits'

export function TodayDesk({ now, onOpen }: { now: Date; onOpen: (id: DeskId) => void }) {
  const day = toDateKey(now)
  const monthKey = format(startOfMonth(now), 'yyyy-MM')
  const projects = useDashboardStore((state) => state.projects)
  const toggleProject = useDashboardStore((state) => state.toggleProject)
  const habits = useDashboardStore((state) => state.habits)
  const toggleHabit = useDashboardStore((state) => state.toggleHabit)
  const goals = useDashboardStore((state) => state.goals)
  const ledger = useDashboardStore((state) => state.ledger)
  const journal = useDashboardStore((state) => state.journal[day] ?? '')
  const setJournal = useDashboardStore((state) => state.setJournal)
  const notes = useDashboardStore((state) => state.notes)
  const media = useDashboardStore((state) => state.media)
  const links = useDashboardStore((state) => state.links)
  const wishes = useDashboardStore((state) => state.wishes)
  const { items: headlines } = useHeadlines()

  const openProjects = projects.filter((project) => !project.done)
  const habitsLeft = habits.filter((habit) => !habit.checks[day]).length
  const monthEntries = ledger.filter((entry) => entry.day.startsWith(monthKey))
  const income = monthEntries.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amount : 0), 0)
  const expense = monthEntries.reduce((sum, entry) => sum + (entry.kind === 'expense' ? entry.amount : 0), 0)
  const left = income - expense
  const unfinishedGoals = goals.filter((goal) => goal.current < goal.target)
  const nextMedia = media.find((item) => !item.done)
  const nextWish = wishes.find((wish) => !wish.bought)
  const headline = headlines[0]
  const note = notes[0]
  const link = links[0]

  const brief = [
    openProjects.length ? `${openProjects.length} open ${openProjects.length === 1 ? 'project' : 'projects'}` : '',
    habits.length ? `${habitsLeft} ${habitsLeft === 1 ? 'habit' : 'habits'} left` : '',
    monthEntries.length ? `${taka(left)} left this month` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto grid max-w-[1040px] grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <div className="text-[12px] font-medium text-secondary">{format(now, 'EEEE')}</div>
          <h1 className="text-[28px] font-semibold tracking-[-0.04em]">{format(now, 'MMMM d')}</h1>
          <p className="mt-1 text-[13px] text-secondary">{brief || 'A quiet day. Pick a section when you want to add something.'}</p>
        </div>

        <ActivityChart now={now} />

        <Panel>
          <PanelLabel aside={<TextLink onClick={() => onOpen('projects')}>My projects</TextLink>}>Open projects</PanelLabel>
          <div className="px-2 pb-2">
            {openProjects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-fill/8">
                <CheckDot checked={false} onClick={() => toggleProject(project.id)} label={`Complete ${project.name}`} />
                <button type="button" onClick={() => onOpen('projects')} className="min-w-0 flex-1 truncate text-left text-[13px]">
                  {project.name}
                </button>
                {project.next && <span className="hidden max-w-[140px] truncate text-[11px] text-tertiary sm:block">{project.next}</span>}
              </div>
            ))}
            {openProjects.length === 0 && <EmptyLine>No open projects.</EmptyLine>}
          </div>
        </Panel>

        <Panel>
          <PanelLabel aside={<TextLink onClick={() => onOpen('habits')}>Habits</TextLink>}>Today</PanelLabel>
          <div className="px-2 pb-2">
            {habits.slice(0, 6).map((habit) => {
              const done = !!habit.checks[day]
              const streak = habitStreak(habit.checks, now)
              return (
                <div key={habit.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-fill/8">
                  <CheckDot checked={done} onClick={() => toggleHabit(habit.id, day)} label={done ? `Uncheck ${habit.name}` : `Check ${habit.name}`} />
                  <span className={cn('min-w-0 flex-1 truncate text-[13px]', done && 'text-secondary')}>{habit.name}</span>
                  {streak > 0 && <span className="text-[11px] font-medium tabular-nums text-secondary">{streak}d</span>}
                </div>
              )
            })}
            {habits.length === 0 && <EmptyLine>No habits yet.</EmptyLine>}
          </div>
        </Panel>

        <Panel>
          <PanelLabel aside={<TextLink onClick={() => onOpen('finance')}>Finance</TextLink>}>{format(now, 'MMMM')}</PanelLabel>
          <div className="grid grid-cols-3 gap-2 px-3 pb-2">
            <Money label="In" value={taka(income)} />
            <Money label="Out" value={taka(expense)} />
            <Money label="Left" value={taka(left)} tone={left < 0 ? 'bad' : left > 0 ? 'good' : undefined} />
          </div>
          <div className="px-2 pb-2">
            {monthEntries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 px-1 py-1">
                <span className="min-w-0 flex-1 truncate text-[12px]">{entry.description}</span>
                <span className={cn('text-[12px] font-medium tabular-nums', entry.kind === 'income' ? 'text-accent-green' : 'text-secondary')}>
                  {entry.kind === 'income' ? '+' : '−'}
                  {taka(entry.amount)}
                </span>
              </div>
            ))}
            {monthEntries.length === 0 && <EmptyLine>Nothing logged this month.</EmptyLine>}
          </div>
        </Panel>

        <Panel className="flex min-h-[220px] flex-col">
          <PanelLabel aside={<TextLink onClick={() => onOpen('journal')}>Journal</TextLink>}>Today’s page</PanelLabel>
          <textarea
            value={journal}
            onChange={(event) => setJournal(day, event.target.value)}
            placeholder="Write about today."
            className="field mx-3 mb-3 min-h-[140px] flex-1 resize-none"
          />
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelLabel aside={<TextLink onClick={() => onOpen('goals')}>Goals</TextLink>}>In progress</PanelLabel>
          <div className="grid gap-2 px-3 pb-3 sm:grid-cols-3">
            {unfinishedGoals.slice(0, 3).map((goal) => {
              const ratio = goal.target === 0 ? 0 : goal.current / goal.target
              return (
                <button key={goal.id} type="button" onClick={() => onOpen('goals')} className="rounded-xl bg-grouped px-3 py-2 text-left hover:bg-fill/10">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium">{goal.name}</span>
                    <span className="text-[11px] tabular-nums text-secondary">
                      {goal.current}/{goal.target}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-fill/15">
                    <div className="h-full rounded-full bg-accent-blue" style={{ width: `${Math.round(ratio * 100)}%` }} />
                  </div>
                </button>
              )
            })}
            {unfinishedGoals.length === 0 && <EmptyLine>No goals in progress.</EmptyLine>}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelLabel>Shelf</PanelLabel>
          <div className="grid gap-px px-2 pb-2 sm:grid-cols-2">
            <Shelf label="Notes" value={note?.text} empty="Nothing saved" onClick={() => onOpen('notes')} />
            <Shelf
              label="Watch & read"
              value={nextMedia ? nextMedia.title : undefined}
              empty="Queue is empty"
              onClick={() => onOpen('library')}
            />
            <Shelf label="Local news" value={headline?.title} empty="Headlines unavailable" href={headline?.link} onClick={() => onOpen('news')} />
            <Shelf label="Quick links" value={link?.label} empty="No links yet" href={link ? link.url : undefined} onClick={() => onOpen('links')} />
            <Shelf
              label="Buy wishlist"
              value={wishLine(nextWish, wishes)}
              empty={wishes.length ? 'Nothing left to buy' : 'List is empty'}
              onClick={() => onOpen('wishlist')}
            />
          </div>
        </Panel>
      </div>
    </div>
  )
}

function wishLine(next: { title: string; price: string } | undefined, wishes: { price: string; bought: boolean }[]) {
  const total = pricedWishLine(wishes)
  if (!next) return total
  const price = next.price ? ` · ${next.price}` : ''
  return total ? `${next.title}${price} · ${total}` : `${next.title}${price}`
}

function pricedWishLine(wishes: { price: string; bought: boolean }[]) {
  const open = wishes.filter((wish) => !wish.bought)
  const priced = open.map((wish) => readPrice(wish.price)).filter((value): value is number => value != null)
  if (!priced.length) return undefined
  const total = priced.reduce((sum, value) => sum + value, 0)
  return `${taka(total)} across ${priced.length} ${priced.length === 1 ? 'item' : 'items'}`
}

function TextLink({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-[11px] font-semibold normal-case tracking-normal text-accent-blue">
      {children}
    </button>
  )
}

function Money({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl bg-grouped px-3 py-2">
      <div className="text-[11px] text-tertiary">{label}</div>
      <div className={cn('text-[15px] font-semibold tabular-nums tracking-[-0.02em]', tone === 'good' && 'text-accent-green', tone === 'bad' && 'text-accent-red')}>{value}</div>
    </div>
  )
}

function Shelf({
  label,
  value,
  empty,
  onClick,
  href,
}: {
  label: string
  value?: string
  empty: string
  onClick: () => void
  href?: string
}) {
  const className = 'block w-full rounded-lg px-2 py-2 text-left hover:bg-fill/8'
  const body = (
    <>
      <div className="text-[11px] text-tertiary">{label}</div>
      <div className={cn('line-clamp-2 text-[13px] leading-snug', value ? 'text-primary' : 'text-tertiary')}>{value || empty}</div>
    </>
  )
  if (href && value) {
    const url = /^https?:\/\//i.test(href) ? href : `https://${href}`
    return (
      <a href={url} target="_blank" rel="noreferrer" className={className}>
        {body}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  )
}

function EmptyLine({ children }: { children: string }) {
  return <p className="px-1 py-3 text-[12px] text-tertiary">{children}</p>
}
