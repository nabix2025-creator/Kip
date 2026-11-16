import { useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { formatFocusRemaining } from '@/lib/focusDuration'
import { accountabilityScore } from '@/lib/accountability'
import { useDashboardStore } from '@/store/dashboardStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTaskStore } from '@/store/taskStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useFocusModeStatus } from '@/hooks/useFocusModeStatus'
import { FocusDurationDialog, type FocusDurationChoice } from '@/components/ui/FocusDurationDialog'
import { CheckDot } from '@/components/dashboard/ui'
import { Panel, PanelLabel, readPrice, taka, type DeskId } from '@/components/dashboard/chrome'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { useHeadlines } from '@/components/dashboard/headlines'
import { habitStreak } from '@/components/dashboard/habits'
import { DESK_TONE, toneDot, toneText, toneWash, type DashTone } from '@/components/dashboard/tones'
import { projectNextLabel, projectProgress } from '@/lib/projects'

export function TodayDesk({ now, onOpen }: { now: Date; onOpen: (id: DeskId) => void }) {
  const day = toDateKey(now)
  const monthKey = format(startOfMonth(now), 'yyyy-MM')
  const projects = useDashboardStore((state) => state.projects)
  const toggleProject = useDashboardStore((state) => state.toggleProject)
  const habits = useDashboardStore((state) => state.habits)
  const toggleHabit = useDashboardStore((state) => state.toggleHabit)
  const focusMinutesOn = useDashboardStore((state) => state.focusMinutesOn)
  const morningSteps = useDashboardStore((state) => state.morningSteps)
  const eveningSteps = useDashboardStore((state) => state.eveningSteps)
  const routineChecks = useDashboardStore((state) => state.routineChecks)
  const toggleRoutine = useDashboardStore((state) => state.toggleRoutineStep)
  const goals = useDashboardStore((state) => state.goals)
  const ledger = useDashboardStore((state) => state.ledger)
  const journal = useDashboardStore((state) => state.journal[day] ?? '')
  const setJournal = useDashboardStore((state) => state.setJournal)
  const notes = useDashboardStore((state) => state.notes)
  const media = useDashboardStore((state) => state.media)
  const links = useDashboardStore((state) => state.links)
  const wishes = useDashboardStore((state) => state.wishes)
  const tasks = useTaskStore((state) => state.tasks)
  const { items: headlines } = useHeadlines()
  const [focusStatus, setFocusStatus] = useFocusModeStatus()
  const [focusBusy, setFocusBusy] = useState(false)
  const [focusPickerOpen, setFocusPickerOpen] = useState(false)
  const pushToast = useCalendarStore((state) => state.pushToast)
  const setFocusPreferred = useSettingsStore((state) => state.setFocusModePreferred)

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
  const focusMin = focusMinutesOn(day)
  const score = accountabilityScore({ now, habits, tasks, focusMinutesToday: focusMin })
  const dayChecks = routineChecks[day] ?? {}
  const routinePreview = [...morningSteps.slice(0, 3).map((s) => ({ ...s, kind: 'morning' as const })), ...eveningSteps.slice(0, 2).map((s) => ({ ...s, kind: 'evening' as const }))]

  const brief = [
    score.habitsTotal || score.todosTotal || focusMin ? `Accountability ${score.score}%` : '',
    openProjects.length ? `${openProjects.length} open ${openProjects.length === 1 ? 'project' : 'projects'}` : '',
    habits.length ? `${habitsLeft} ${habitsLeft === 1 ? 'habit' : 'habits'} left` : '',
    monthEntries.length ? `${taka(left)} left this month` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const startFocusWithDuration = async (choice: FocusDurationChoice) => {
    if (!window.api?.focusModeEnable) {
      pushToast('Focus Mode needs the desktop app')
      return
    }
    setFocusBusy(true)
    try {
      const next = await window.api.focusModeEnable(choice)
      setFocusStatus(next)
      setFocusPreferred(next.enabled)
      pushToast(next.message || (next.enabled ? 'Focus Mode on' : 'Pick a duration'))
    } catch {
      pushToast('Could not start Focus Mode')
    } finally {
      setFocusBusy(false)
    }
  }

  const toggleFocusMode = async () => {
    if (!window.api?.focusModeEnable || !window.api.focusModeDisable) {
      pushToast('Focus Mode needs the desktop app')
      return
    }
    if (!focusStatus?.enabled) {
      setFocusPickerOpen(true)
      return
    }
    setFocusBusy(true)
    try {
      // Disable is refused while the timer runs (popup + stays on).
      const next = await window.api.focusModeDisable()
      setFocusStatus(next)
      setFocusPreferred(next.enabled)
      if (next.enabled) {
        pushToast(next.message || "DON'T TURN OFF FOCUS MODE IF YOU ARE NOT GAY.")
      } else {
        pushToast(next.message || 'Focus Mode off')
      }
    } catch {
      pushToast('Could not toggle Focus Mode')
    } finally {
      setFocusBusy(false)
    }
  }

  const forceOffFocusMode = async () => {
    if (!window.api?.focusModeForceDisable) {
      pushToast('Focus Mode needs the desktop app')
      return
    }
    setFocusBusy(true)
    try {
      const next = await window.api.focusModeForceDisable()
      setFocusStatus(next)
      setFocusPreferred(next.enabled)
      pushToast(next.message || 'Distractions unlocked')
    } catch {
      pushToast('Could not unlock distractions')
    } finally {
      setFocusBusy(false)
    }
  }

  const focusLabel = focusStatus?.enabled
    ? `Focus · ${formatFocusRemaining(focusStatus.remainingMs)}`
    : 'Focus Mode'
  const showForceUnlock = Boolean(focusStatus?.enabled || focusStatus?.hostsActive)

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto grid max-w-[1040px] grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-2">
        <div className="lg:col-span-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[12px] font-medium text-accent-orange">{format(now, 'EEEE')}</div>
            <h1 className="text-[28px] font-semibold tracking-[-0.04em]">{format(now, 'MMMM d')}</h1>
            <p className="mt-1 text-[13px] text-secondary">{brief || 'A quiet day. Pick a section when you want to add something.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={focusBusy}
              onClick={() => void toggleFocusMode()}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-semibold tabular-nums',
                focusStatus?.enabled ? 'bg-accent-orange text-white' : 'bg-fill/10 text-secondary hover:bg-fill/15 hover:text-primary',
              )}
            >
              {focusLabel}
            </button>
            {showForceUnlock && (
              <button
                type="button"
                disabled={focusBusy}
                onClick={() => void forceOffFocusMode()}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-secondary underline-offset-2 hover:text-primary hover:underline disabled:opacity-60"
                title="Unlock distractions immediately"
              >
                Unlock distractions
              </button>
            )}
          </div>
        </div>

        <Panel tone="blue" className="lg:col-span-2">
          <PanelLabel tone="blue" aside={<TextLink tone="blue" onClick={() => onOpen('review')}>Weekly review</TextLink>}>
            Accountability
          </PanelLabel>
          <div className="grid gap-2 px-3 pb-3 sm:grid-cols-4">
            <ScoreTile label="Today" value={`${score.score}%`} hint="habits + todos + focus" />
            <ScoreTile label="Habits" value={score.habitsTotal ? `${score.habitsDone}/${score.habitsTotal}` : '—'} hint={score.habitsPct != null ? `${score.habitsPct}%` : 'none yet'} />
            <ScoreTile label="Todos" value={score.todosTotal ? `${score.todosDone}/${score.todosTotal}` : '—'} hint={score.todosPct != null ? `${score.todosPct}%` : 'none planned'} />
            <ScoreTile label="Focus" value={focusMin ? `${focusMin}m` : '—'} hint="logged today" onClick={() => onOpen('focus')} />
          </div>
        </Panel>

        <ActivityChart now={now} />

        <Panel tone="orange">
          <PanelLabel tone="orange" aside={<TextLink tone="orange" onClick={() => onOpen('projects')}>My projects</TextLink>}>
            Open projects
          </PanelLabel>
          <div className="px-2 pb-2">
            {openProjects.slice(0, 5).map((project) => {
              const progress = projectProgress(project)
              const next = projectNextLabel(project)
              return (
                <div key={project.id} className="rounded-lg px-1 py-1.5 hover:bg-fill/8">
                  <div className="flex items-center gap-2">
                    <CheckDot checked={false} onClick={() => toggleProject(project.id)} label={`Complete ${project.name}`} />
                    <button type="button" onClick={() => onOpen('projects')} className="min-w-0 flex-1 truncate text-left text-[13px]">
                      {project.name}
                    </button>
                    <span className="shrink-0 text-[11px] tabular-nums text-tertiary">{progress}%</span>
                  </div>
                  {(next || project.steps.length > 0) && (
                    <div className="ml-7 mt-1">
                      <div className="h-1 overflow-hidden rounded-full bg-fill/15">
                        <div className="h-full rounded-full bg-accent-orange transition-[width] duration-200 ease-ios" style={{ width: `${progress}%` }} />
                      </div>
                      {next && <p className="mt-0.5 truncate text-[11px] text-tertiary">{next}</p>}
                    </div>
                  )}
                </div>
              )
            })}
            {openProjects.length === 0 && <EmptyLine tone="orange">No open projects.</EmptyLine>}
          </div>
        </Panel>

        <Panel tone="orange">
          <PanelLabel tone="orange" aside={<TextLink tone="orange" onClick={() => onOpen('habits')}>Habits</TextLink>}>
            Today
          </PanelLabel>
          <div className="px-2 pb-2">
            {habits.slice(0, 6).map((habit) => {
              const done = !!habit.checks[day]
              const streak = habitStreak(habit.checks, now)
              return (
                <div key={habit.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-fill/8">
                  <CheckDot checked={done} onClick={() => toggleHabit(habit.id, day)} label={done ? `Uncheck ${habit.name}` : `Check ${habit.name}`} />
                  <span className={cn('min-w-0 flex-1 truncate text-[13px]', done && 'text-secondary')}>{habit.name}</span>
                  {streak > 0 && <span className="text-[11px] font-medium tabular-nums text-accent-orange">{streak}d</span>}
                </div>
              )
            })}
            {habits.length === 0 && <EmptyLine tone="orange">No habits yet.</EmptyLine>}
          </div>
        </Panel>

        {(morningSteps.length > 0 || eveningSteps.length > 0) && (
          <Panel tone="orange">
            <PanelLabel tone="orange" aside={<TextLink tone="orange" onClick={() => onOpen('routines')}>Routines</TextLink>}>
              Checklist
            </PanelLabel>
            <div className="px-2 pb-2">
              {routinePreview.map((step) => {
                const done = !!dayChecks[step.id]
                return (
                  <div key={step.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-fill/8">
                    <CheckDot checked={done} onClick={() => toggleRoutine(step.id, day)} label={done ? `Uncheck ${step.label}` : `Check ${step.label}`} />
                    <span className={cn('min-w-0 flex-1 truncate text-[13px]', done && 'text-secondary')}>{step.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-tertiary">{step.kind === 'morning' ? 'AM' : 'PM'}</span>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}

        <Panel tone="green">
          <PanelLabel tone="green" aside={<TextLink tone="green" onClick={() => onOpen('finance')}>Finance</TextLink>}>
            {format(now, 'MMMM')}
          </PanelLabel>
          <div className="grid grid-cols-3 gap-3 px-3 pb-2">
            <Money label="In" value={taka(income)} wash="green" />
            <Money label="Out" value={taka(expense)} wash="orange" />
            <Money label="Left" value={taka(left)} wash={left < 0 ? 'red' : 'blue'} tone={left < 0 ? 'bad' : left > 0 ? 'good' : undefined} />
          </div>
          <div className="px-2 pb-2">
            {monthEntries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 px-1 py-1">
                <span className="min-w-0 flex-1 truncate text-[12px]">{entry.description}</span>
                <span className={cn('text-[12px] font-medium tabular-nums', entry.kind === 'income' ? 'text-accent-green' : 'text-accent-orange')}>
                  {entry.kind === 'income' ? '+' : '−'}
                  {taka(entry.amount)}
                </span>
              </div>
            ))}
            {monthEntries.length === 0 && <EmptyLine tone="green">Nothing logged this month.</EmptyLine>}
          </div>
        </Panel>

        <Panel tone="indigo" className="flex min-h-[220px] flex-col">
          <PanelLabel tone="indigo" aside={<TextLink tone="indigo" onClick={() => onOpen('journal')}>Journal</TextLink>}>
            Today’s page
          </PanelLabel>
          <textarea
            value={journal}
            onChange={(event) => setJournal(day, event.target.value)}
            placeholder="Write about today."
            className="field mx-3 mb-3 min-h-[140px] flex-1 resize-none"
          />
        </Panel>

        <Panel tone="orange" className="lg:col-span-2">
          <PanelLabel tone="orange" aside={<TextLink tone="orange" onClick={() => onOpen('goals')}>Goals</TextLink>}>
            In progress
          </PanelLabel>
          <div className="grid gap-2 px-3 pb-3 sm:grid-cols-3">
            {unfinishedGoals.slice(0, 3).map((goal) => {
              const ratio = goal.target === 0 ? 0 : goal.current / goal.target
              return (
                <button key={goal.id} type="button" onClick={() => onOpen('goals')} className="rounded-xl bg-accent-orange/10 px-3 py-2 text-left hover:bg-accent-orange/15">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium">{goal.name}</span>
                    <span className="text-[11px] tabular-nums text-secondary">
                      {goal.current}/{goal.target}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-accent-orange/20">
                    <div className="h-full rounded-full bg-accent-orange" style={{ width: `${Math.round(ratio * 100)}%` }} />
                  </div>
                </button>
              )
            })}
            {unfinishedGoals.length === 0 && <EmptyLine tone="orange">No goals in progress.</EmptyLine>}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelLabel>Shelf</PanelLabel>
          <div className="grid gap-px px-2 pb-2 sm:grid-cols-2">
            <Shelf label="Notes" tone={DESK_TONE.notes} value={note?.text} empty="Nothing saved" onClick={() => onOpen('notes')} />
            <Shelf
              label="Watch & read"
              tone={DESK_TONE.library}
              value={nextMedia ? nextMedia.title : undefined}
              empty="Queue is empty"
              onClick={() => onOpen('library')}
            />
            <Shelf
              label="Local news"
              tone={DESK_TONE.news}
              value={headline?.title}
              empty="Headlines unavailable"
              href={headline?.link}
              onClick={() => onOpen('news')}
            />
            <Shelf
              label="Quick links"
              tone={DESK_TONE.links}
              value={link?.label}
              empty="No links yet"
              href={link ? link.url : undefined}
              onClick={() => onOpen('links')}
            />
            <Shelf
              label="Buy wishlist"
              tone={DESK_TONE.wishlist}
              value={wishLine(nextWish, wishes)}
              empty={wishes.length ? 'Nothing left to buy' : 'List is empty'}
              onClick={() => onOpen('wishlist')}
            />
          </div>
        </Panel>
      </div>
      <FocusDurationDialog
        open={focusPickerOpen}
        onClose={() => setFocusPickerOpen(false)}
        onConfirm={(choice) => void startFocusWithDuration(choice)}
        initialTargets={focusStatus?.targets}
        availableTargets={focusStatus?.availableTargets}
      />
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

function ScoreTile({
  label,
  value,
  hint,
  onClick,
}: {
  label: string
  value: string
  hint: string
  onClick?: () => void
}) {
  const body = (
    <>
      <div className="text-[11px] text-accent-blue">{label}</div>
      <div className="mt-0.5 text-[18px] font-semibold tabular-nums tracking-[-0.03em]">{value}</div>
      <div className="text-[11px] text-tertiary">{hint}</div>
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="rounded-xl bg-accent-blue/10 px-3 py-2.5 text-left hover:bg-accent-blue/15">
        {body}
      </button>
    )
  }
  return <div className="rounded-xl bg-accent-blue/10 px-3 py-2.5">{body}</div>
}

function TextLink({ children, onClick, tone = 'blue' }: { children: string; onClick: () => void; tone?: DashTone }) {
  return (
    <button type="button" onClick={onClick} className={cn('text-[11px] font-semibold normal-case tracking-normal', toneText[tone])}>
      {children}
    </button>
  )
}

function Money({
  label,
  value,
  tone,
  wash,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad'
  wash: DashTone
}) {
  return (
    <div className={cn('rounded-xl px-3 py-2', toneWash[wash])}>
      <div className={cn('text-[11px]', toneText[wash])}>{label}</div>
      <div
        className={cn(
          'text-[15px] font-semibold tabular-nums tracking-[-0.02em]',
          tone === 'good' && 'text-accent-green',
          tone === 'bad' && 'text-accent-red',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function Shelf({
  label,
  value,
  empty,
  onClick,
  href,
  tone,
}: {
  label: string
  value?: string
  empty: string
  onClick: () => void
  href?: string
  tone: DashTone
}) {
  const className = cn('block w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-fill/8')
  const body = (
    <>
      <div className={cn('flex items-center gap-1.5 text-[11px] font-medium', toneText[tone])}>
        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', toneDot[tone])} />
        {label}
      </div>
      <div className={cn('mt-0.5 line-clamp-2 text-[13px] leading-snug', value ? 'text-primary' : 'text-secondary')}>{value || empty}</div>
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

function EmptyLine({ children, tone }: { children: string; tone: DashTone }) {
  return (
    <p className={cn('mx-1 my-1 rounded-xl px-3 py-3 text-[12px]', toneWash[tone], toneText[tone])}>{children}</p>
  )
}
