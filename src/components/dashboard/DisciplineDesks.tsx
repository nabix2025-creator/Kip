import { useMemo, useState } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { Check, Focus, Moon, Sun, Trash2 } from 'lucide-react'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { EVENING_STARTERS, MORNING_STARTERS, routineDayComplete, routineStreak } from '@/lib/routines'
import { useDashboardStore, type RoutineKind } from '@/store/dashboardStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTaskStore } from '@/store/taskStore'
import { CheckDot, EmptyCopy, RemoveButton } from '@/components/dashboard/ui'
import { Desk, Panel } from '@/components/dashboard/chrome'

export function RoutinesDesk({ now }: { now: Date }) {
  const morning = useDashboardStore((state) => state.morningSteps)
  const evening = useDashboardStore((state) => state.eveningSteps)
  const checks = useDashboardStore((state) => state.routineChecks)
  const day = toDateKey(now)
  const morningDone = routineDayComplete(morning, checks, day)
  const eveningDone = routineDayComplete(evening, checks, day)
  const mStreak = routineStreak('morning', morning, checks, now)
  const eStreak = routineStreak('evening', evening, checks, now)

  return (
    <Desk
      title="Routines"
      detail={
        morning.length || evening.length
          ? `Morning ${morningDone ? '✓' : '…'} · Evening ${eveningDone ? '✓' : '…'}`
          : 'Fixed morning & evening steps with streaks'
      }
    >
      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        <RoutineColumn kind="morning" title="Morning" icon="sun" steps={morning} day={day} streak={mStreak} starters={MORNING_STARTERS} />
        <RoutineColumn kind="evening" title="Evening" icon="moon" steps={evening} day={day} streak={eStreak} starters={EVENING_STARTERS} />
      </div>
    </Desk>
  )
}

function RoutineColumn({
  kind,
  title,
  icon,
  steps,
  day,
  streak,
  starters,
}: {
  kind: RoutineKind
  title: string
  icon: 'sun' | 'moon'
  steps: { id: string; label: string }[]
  day: string
  streak: number
  starters: string[]
}) {
  const checks = useDashboardStore((state) => state.routineChecks)
  const add = useDashboardStore((state) => state.addRoutineStep)
  const remove = useDashboardStore((state) => state.removeRoutineStep)
  const toggle = useDashboardStore((state) => state.toggleRoutineStep)
  const [name, setName] = useState('')
  const dayChecks = checks[day] ?? {}
  const done = steps.filter((step) => dayChecks[step.id]).length

  return (
    <Panel>
      <div className="flex items-center gap-2 border-b border-divider px-3 py-3">
        {icon === 'sun' ? <Sun size={15} className="text-accent-orange" /> : <Moon size={15} className="text-accent-indigo" />}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">{title}</div>
          <div className="text-[11px] text-tertiary">
            {steps.length ? `${done}/${steps.length} today` : 'Add steps'}
            {streak > 0 ? ` · ${streak}d streak` : ''}
          </div>
        </div>
      </div>
      <form
        className="flex gap-2 border-b border-divider p-3"
        onSubmit={(event) => {
          event.preventDefault()
          add(kind, name)
          setName('')
        }}
      >
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={`Add ${title.toLowerCase()} step`} className="field min-w-0 flex-1" />
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>
      {steps.length === 0 ? (
        <div className="px-3 py-4">
          <p className="mb-3 text-[12px] text-tertiary">Start with a short checklist.</p>
          <div className="flex flex-wrap gap-1.5">
            {starters.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => add(kind, starter)}
                className="rounded-full bg-fill/10 px-2.5 py-1 text-[12px] font-medium text-secondary hover:bg-fill/15 hover:text-primary"
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-2 py-2">
          {steps.map((step) => {
            const checked = !!dayChecks[step.id]
            return (
              <div key={step.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fill/8">
                <CheckDot checked={checked} onClick={() => toggle(step.id, day)} label={checked ? `Uncheck ${step.label}` : `Check ${step.label}`} />
                <span className={cn('min-w-0 flex-1 truncate text-[13px]', checked && 'text-secondary')}>{step.label}</span>
                <span className="opacity-0 group-hover:opacity-100">
                  <RemoveButton label={`Delete ${step.label}`} onClick={() => remove(kind, step.id)} />
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

export function FocusDesk({ now }: { now: Date }) {
  const logs = useDashboardStore((state) => state.focusLogs)
  const log = useDashboardStore((state) => state.logFocusSession)
  const remove = useDashboardStore((state) => state.removeFocusLog)
  const focusMinutesOn = useDashboardStore((state) => state.focusMinutesOn)
  const day = toDateKey(now)
  const todayMin = focusMinutesOn(day)
  const [minutes, setMinutes] = useState(50)
  const [label, setLabel] = useState('')
  const recent = logs.slice(0, 24)

  return (
    <Desk title="Focus sessions" detail={todayMin ? `${todayMin} min logged today` : 'Pomodoro + deep-work log'}>
      <Panel>
        <form
          className="flex flex-wrap items-end gap-2 border-b border-divider p-3"
          onSubmit={(event) => {
            event.preventDefault()
            log({ durationMin: minutes, kind: 'deep', label: label || 'Deep work' })
            setLabel('')
          }}
        >
          <label className="text-[11px] font-semibold text-tertiary">
            Minutes
            <input
              type="number"
              min={5}
              max={240}
              value={minutes}
              onChange={(event) => setMinutes(Math.max(5, Number(event.target.value) || 5))}
              className="field mt-1 w-20"
            />
          </label>
          <label className="min-w-[160px] flex-1 text-[11px] font-semibold text-tertiary">
            Label
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Deep work" className="field mt-1 w-full" />
          </label>
          <button type="submit" className="btn-primary">
            Log session
          </button>
        </form>
        <div className="space-y-1 p-2">
          {recent.map((item) => (
            <div key={item.id} className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-fill/8">
              <Focus size={14} className={item.kind === 'deep' ? 'text-accent-indigo' : 'text-accent-orange'} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{item.label ?? item.kind}</div>
                <div className="text-[11px] text-tertiary">
                  {format(new Date(item.at), 'EEE MMM d · HH:mm')} · {item.durationMin} min
                </div>
              </div>
              <button
                type="button"
                aria-label="Delete session"
                onClick={() => remove(item.id)}
                className="hidden h-6 w-6 items-center justify-center rounded-full text-tertiary hover:bg-fill/10 hover:text-accent-red group-hover:flex"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {recent.length === 0 && <EmptyCopy>Finish a Pomodoro or log a deep-work block.</EmptyCopy>}
        </div>
      </Panel>
    </Desk>
  )
}

export function WeeklyReviewDesk({ now }: { now: Date }) {
  const weekStartsOn = useSettingsStore((state) => state.weekStartsOn)
  const reviewDay = useDashboardStore((state) => state.reviewDay)
  const setReviewDay = useDashboardStore((state) => state.setReviewDay)
  const save = useDashboardStore((state) => state.saveWeeklyReview)
  const reviews = useDashboardStore((state) => state.weeklyReviews)
  const habits = useDashboardStore((state) => state.habits)
  const focusLogs = useDashboardStore((state) => state.focusLogs)
  const tasks = useTaskStore((state) => state.tasks)

  const weekStart = startOfWeek(now, { weekStartsOn })
  const weekKey = toDateKey(weekStart)
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const existing = reviews.find((item) => item.weekKey === weekKey)
  const [top1, setTop1] = useState(existing?.top3[0] ?? '')
  const [top2, setTop2] = useState(existing?.top3[1] ?? '')
  const [top3, setTop3] = useState(existing?.top3[2] ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const isReviewToday = now.getDay() === reviewDay

  const todosPlanned = tasks.filter((task) => {
    if (!task.due && task.period !== 'today' && task.period !== 'week') return false
    const due = task.due?.slice(0, 10)
    if (task.period === 'week' || task.period === 'today') {
      if (!due) return task.period === 'week' || task.period === 'today'
      return days.some((day) => toDateKey(day) === due)
    }
    return due ? days.some((day) => toDateKey(day) === due) : false
  })
  const todosDone = todosPlanned.filter((task) => task.completed).length

  let habitChecks = 0
  let habitSlots = 0
  for (const habit of habits) {
    for (const day of days) {
      const key = toDateKey(day)
      if (startOfWeek(day, { weekStartsOn }).getTime() > now.getTime()) continue
      if (day.getTime() > now.getTime()) continue
      habitSlots += 1
      if (habit.checks[key]) habitChecks += 1
    }
  }

  const focusMin = focusLogs
    .filter((log) => {
      const key = log.at.slice(0, 10)
      return days.some((day) => toDateKey(day) === key)
    })
    .reduce((sum, log) => sum + log.durationMin, 0)

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

  return (
    <Desk
      title="Weekly review"
      detail={isReviewToday ? `Today is review day (${dayNames[reviewDay]})` : `Review day: ${dayNames[reviewDay]} · week of ${format(weekStart, 'MMM d')}`}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel>
          <div className="space-y-3 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">This week</div>
            <StatRow label="Todos done / planned" value={`${todosDone} / ${todosPlanned.length || 0}`} />
            <StatRow
              label="Habit checks"
              value={habitSlots ? `${habitChecks} / ${habitSlots} (${Math.round((habitChecks / habitSlots) * 100)}%)` : 'No habits'}
            />
            <StatRow label="Focus minutes" value={`${focusMin} min`} />
            <label className="block pt-2 text-[11px] font-semibold text-tertiary">
              Review day
              <select
                className="field mt-1 w-full"
                value={reviewDay}
                onChange={(event) => setReviewDay(Number(event.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6)}
              >
                {dayNames.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Panel>
        <Panel>
          <form
            className="space-y-3 p-4"
            onSubmit={(event) => {
              event.preventDefault()
              save(weekKey, [top1, top2, top3], notes)
            }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Next week · top 3</div>
            <input value={top1} onChange={(event) => setTop1(event.target.value)} placeholder="1." className="field w-full" />
            <input value={top2} onChange={(event) => setTop2(event.target.value)} placeholder="2." className="field w-full" />
            <input value={top3} onChange={(event) => setTop3(event.target.value)} placeholder="3." className="field w-full" />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What worked? What to change?"
              className="field min-h-[100px] w-full resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              {existing?.completedAt ? (
                <span className="flex items-center gap-1 text-[11px] text-accent-green">
                  <Check size={12} /> Saved {format(new Date(existing.completedAt), 'MMM d')}
                </span>
              ) : (
                <span className="text-[11px] text-tertiary">Optional — saves for this week</span>
              )}
              <button type="submit" className="btn-primary">
                Save review
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </Desk>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-xl bg-grouped px-3 py-2.5">
      <span className="text-[12px] text-secondary">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  )
}
