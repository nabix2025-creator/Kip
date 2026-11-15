import { useEffect, useState } from 'react'
import { addDays, format, startOfDay, startOfWeek } from 'date-fns'
import { Check, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { projectAddonCounts, projectNextLabel, projectProgress } from '@/lib/projects'
import {
  useDashboardStore,
  type DashPriority,
  type Project,
  type ProjectAddonKind,
} from '@/store/dashboardStore'
import { useSettingsStore } from '@/store/settingsStore'
import { CheckDot, EmptyCopy, PRIORITY, PriorityDots, RemoveButton } from '@/components/dashboard/ui'
import { Desk, Panel } from '@/components/dashboard/chrome'
import { habitStreak } from '@/components/dashboard/habits'

const PRIORITIES: DashPriority[] = ['high', 'medium', 'low']
const STARTERS = ['Drink water', 'Exercise', 'Read 20 min', 'Meditate', 'No junk food', 'Sleep by 11']
const ADDON_KINDS: { id: ProjectAddonKind; label: string }[] = [
  { id: 'tool', label: 'Tool' },
  { id: 'dep', label: 'Dep' },
  { id: 'person', label: 'Person' },
  { id: 'resource', label: 'Resource' },
]
const PATHWAY_STARTERS = ['Define scope', 'Research', 'Build MVP', 'Review', 'Ship']

export function ProjectsDesk() {
  const projects = useDashboardStore((state) => state.projects)
  const add = useDashboardStore((state) => state.addProject)
  const toggle = useDashboardStore((state) => state.toggleProject)
  const remove = useDashboardStore((state) => state.removeProject)
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<DashPriority>('medium')
  const [selected, setSelected] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const current = projects.find((project) => project.id === selected) ?? projects.find((project) => !project.done) ?? projects[0]
  const open = projects.filter((project) => !project.done)
  const done = projects.filter((project) => project.done)
  const avg =
    open.length === 0 ? 0 : Math.round(open.reduce((sum, project) => sum + projectProgress(project), 0) / open.length)

  return (
    <Desk
      title="My projects"
      detail={
        projects.length
          ? `${open.length} open · ${done.length} finished${open.length ? ` · ${avg}% avg progress` : ''}`
          : 'Set a pathway, tick steps, track add-ons'
      }
    >
      <div className="grid min-h-[520px] flex-1 gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Panel className="flex flex-1 flex-col">
          <form
            className="flex flex-col gap-2 border-b border-divider p-3"
            onSubmit={(event) => {
              event.preventDefault()
              const id = add(name, priority)
              if (!id) return
              setName('')
              setSelected(id)
            }}
          >
            <div className="flex gap-2">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" className="field min-w-0 flex-1" />
              <button type="submit" className="btn-primary">
                Add
              </button>
            </div>
            <PriorityDots value={priority} onChange={setPriority} />
          </form>
          <div className="px-2 py-2">
            {PRIORITIES.map((level) => {
              const rows = open.filter((project) => project.priority === level)
              if (!rows.length) return null
              return (
                <div key={level} className="mb-2">
                  <div className="px-2 pb-1 pt-1 text-[11px] font-semibold text-tertiary">{PRIORITY[level].label}</div>
                  {rows.map((project) => (
                    <ProjectRow key={project.id} project={project} active={current?.id === project.id} onOpen={() => setSelected(project.id)} onToggle={() => toggle(project.id)} />
                  ))}
                </div>
              )
            })}
            {open.length === 0 && <EmptyCopy>No open projects. Add one and map its pathway.</EmptyCopy>}
            {done.length > 0 && (
              <div className="mt-1 border-t border-divider pt-1">
                <button type="button" onClick={() => setShowDone((value) => !value)} className="px-2 py-1.5 text-[12px] font-medium text-secondary">
                  Finished · {done.length}
                </button>
                {showDone &&
                  done.map((project) => (
                    <ProjectRow key={project.id} project={project} active={current?.id === project.id} onOpen={() => setSelected(project.id)} onToggle={() => toggle(project.id)} />
                  ))}
              </div>
            )}
          </div>
        </Panel>
        <Panel className="min-h-[320px]">
          {current ? (
            <ProjectDetail
              key={current.id}
              project={current}
              onRemove={() => {
                remove(current.id)
                setSelected(null)
              }}
            />
          ) : (
            <EmptyCopy>Add a project and it will open here.</EmptyCopy>
          )}
        </Panel>
      </div>
    </Desk>
  )
}

function ProjectRow({ project, active, onOpen, onToggle }: { project: Project; active: boolean; onOpen: () => void; onToggle: () => void }) {
  const progress = projectProgress(project)
  const next = projectNextLabel(project)
  const addons = projectAddonCounts(project)
  const target = formatTarget(project.targetDate)

  return (
    <div className={cn('rounded-lg px-2 py-1.5', active && 'bg-fill/10')}>
      <div className="flex items-center gap-2">
        <CheckDot checked={project.done} onClick={onToggle} label={project.done ? 'Reopen project' : 'Complete project'} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className={cn('block truncate text-[13px]', project.done && 'text-tertiary line-through')}>{project.name}</span>
          {!project.done && (
            <span className="mt-0.5 flex items-center gap-2 text-[11px] text-tertiary">
              <span className="tabular-nums">{progress}%</span>
              {next ? <span className="min-w-0 truncate">· {next}</span> : <span>· No next step</span>}
            </span>
          )}
        </button>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PRIORITY[project.priority].color }} />
      </div>
      {!project.done && (
        <div className="ml-7 mt-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-fill/15">
            <div className="h-full rounded-full bg-accent-blue transition-[width] duration-200 ease-ios" style={{ width: `${progress}%` }} />
          </div>
          {(target || addons.needed > 0) && (
            <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-tertiary">
              {target && <span>Target {target}</span>}
              {addons.needed > 0 && <span>{addons.needed} add-on{addons.needed === 1 ? '' : 's'} needed</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectDetail({ project, onRemove }: { project: Project; onRemove: () => void }) {
  const rename = useDashboardStore((state) => state.renameProject)
  const toggle = useDashboardStore((state) => state.toggleProject)
  const setTargetDate = useDashboardStore((state) => state.setProjectTargetDate)
  const addStep = useDashboardStore((state) => state.addProjectStep)
  const renameStep = useDashboardStore((state) => state.renameProjectStep)
  const toggleStep = useDashboardStore((state) => state.toggleProjectStep)
  const removeStep = useDashboardStore((state) => state.removeProjectStep)
  const moveStep = useDashboardStore((state) => state.moveProjectStep)
  const addAddon = useDashboardStore((state) => state.addProjectAddon)
  const toggleAddon = useDashboardStore((state) => state.toggleProjectAddon)
  const removeAddon = useDashboardStore((state) => state.removeProjectAddon)

  const [name, setName] = useState(project.name)
  const [stepDraft, setStepDraft] = useState('')
  const [addonDraft, setAddonDraft] = useState('')
  const [addonKind, setAddonKind] = useState<ProjectAddonKind>('tool')

  useEffect(() => {
    setName(project.name)
    setStepDraft('')
    setAddonDraft('')
  }, [project.id, project.name])

  const progress = projectProgress(project)
  const next = projectNextLabel(project)
  const addons = projectAddonCounts(project)
  const stepsDone = project.steps.filter((step) => step.done).length

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          const title = name.trim()
          if (!title) {
            setName(project.name)
            return
          }
          if (title !== project.name) rename(project.id, title)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
        }}
        aria-label="Project name"
        className="bg-transparent text-[20px] font-semibold tracking-[-0.03em] outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityEditor id={project.id} value={project.priority} />
        <button type="button" onClick={() => toggle(project.id)} className="btn-secondary">
          {project.done ? 'Reopen' : 'Mark done'}
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-[11px] text-tertiary">
          Target
          <input
            type="date"
            value={project.targetDate ?? ''}
            onChange={(event) => setTargetDate(project.id, event.target.value)}
            className="field h-8 w-auto px-2 text-[12px]"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-grouped p-3">
        <TrackStat label="Progress" value={`${progress}%`} hint={project.steps.length ? `${stepsDone}/${project.steps.length} steps` : 'No pathway yet'} />
        <TrackStat label="Next" value={next || (project.done ? 'Finished' : '—')} hint={project.done ? 'Project closed' : 'First open step'} />
        <TrackStat label="Add-ons" value={addons.total ? `${addons.done}/${addons.total}` : '—'} hint={addons.needed ? `${addons.needed} still needed` : addons.total ? 'All secured' : 'None listed'} />
      </div>

      <section className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Pathway</h3>
          {project.steps.length > 0 && (
            <span className="text-[11px] tabular-nums text-secondary">
              {stepsDone}/{project.steps.length}
            </span>
          )}
        </div>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            addStep(project.id, stepDraft)
            setStepDraft('')
          }}
        >
          <input value={stepDraft} onChange={(event) => setStepDraft(event.target.value)} placeholder="Add a milestone step" className="field min-w-0 flex-1" />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
        {project.steps.length === 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-[12px] text-tertiary">Map the full path — ordered steps you can check off.</p>
            <div className="flex flex-wrap gap-1.5">
              {PATHWAY_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => addStep(project.id, starter)}
                  className="rounded-full bg-fill/10 px-2.5 py-1 text-[12px] font-medium text-secondary hover:bg-fill/15 hover:text-primary"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mt-2 space-y-1">
            {project.steps.map((step, index) => (
              <li key={step.id} className="group flex items-center gap-1.5 rounded-lg px-1 py-1 hover:bg-fill/8">
                <CheckDot checked={step.done} onClick={() => toggleStep(project.id, step.id)} label={step.done ? `Reopen ${step.label}` : `Complete ${step.label}`} />
                <input
                  defaultValue={step.label}
                  key={`${step.id}:${step.label}`}
                  onBlur={(event) => {
                    const title = event.target.value.trim()
                    if (!title) {
                      event.target.value = step.label
                      return
                    }
                    if (title !== step.label) renameStep(project.id, step.id, title)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
                  }}
                  aria-label={`Step ${index + 1}`}
                  className={cn(
                    'min-w-0 flex-1 bg-transparent text-[13px] outline-none',
                    step.done && 'text-tertiary line-through',
                  )}
                />
                <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label="Move step up"
                    disabled={index === 0}
                    onClick={() => moveStep(project.id, step.id, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-tertiary hover:bg-fill/10 hover:text-primary disabled:opacity-30"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move step down"
                    disabled={index === project.steps.length - 1}
                    onClick={() => moveStep(project.id, step.id, 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-tertiary hover:bg-fill/10 hover:text-primary disabled:opacity-30"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <RemoveButton label={`Delete step ${step.label}`} onClick={() => removeStep(project.id, step.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Add-ons</h3>
          {addons.total > 0 && (
            <span className="text-[11px] text-secondary">
              {addons.needed} needed · {addons.done} done
            </span>
          )}
        </div>
        <form
          className="mt-2 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            addAddon(project.id, addonDraft, addonKind)
            setAddonDraft('')
          }}
        >
          <div className="flex flex-wrap gap-1">
            {ADDON_KINDS.map((kind) => (
              <button
                key={kind.id}
                type="button"
                onClick={() => setAddonKind(kind.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  addonKind === kind.id ? 'bg-fill/15 text-primary' : 'text-tertiary hover:text-secondary',
                )}
              >
                {kind.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={addonDraft}
              onChange={(event) => setAddonDraft(event.target.value)}
              placeholder="Tool, dependency, person, or resource"
              className="field min-w-0 flex-1"
            />
            <button type="submit" className="btn-primary">
              Add
            </button>
          </div>
        </form>
        {project.addons.length === 0 ? (
          <p className="mt-3 text-[12px] text-tertiary">List what this project still needs — people, tools, deps, resources.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {project.addons.map((addon) => (
              <li key={addon.id} className="group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-fill/8">
                <CheckDot
                  checked={addon.status === 'done'}
                  onClick={() => toggleAddon(project.id, addon.id)}
                  label={addon.status === 'done' ? `Mark ${addon.label} needed` : `Mark ${addon.label} done`}
                />
                <span className={cn('min-w-0 flex-1 truncate text-[13px]', addon.status === 'done' && 'text-tertiary line-through')}>
                  {addon.label}
                </span>
                <span className="rounded-full bg-fill/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-secondary">
                  {ADDON_KINDS.find((kind) => kind.id === addon.kind)?.label ?? addon.kind}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-tertiary">
                  {addon.status === 'done' ? 'Done' : 'Needed'}
                </span>
                <span className="opacity-0 group-hover:opacity-100">
                  <RemoveButton label={`Delete add-on ${addon.label}`} onClick={() => removeAddon(project.id, addon.id)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 flex justify-end border-t border-divider pt-3">
        <button
          type="button"
          onClick={() => {
            void import('@/store/confirmStore').then(({ askConfirm }) =>
              askConfirm({ title: 'Delete project?', body: project.name }).then((ok) => {
                if (ok) onRemove()
              }),
            )
          }}
          className="text-[12px] font-medium text-accent-red"
        >
          Delete project
        </button>
      </div>
    </div>
  )
}

function TrackStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tertiary">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-semibold tabular-nums">{value}</div>
      <div className="truncate text-[10px] text-tertiary">{hint}</div>
    </div>
  )
}

function formatTarget(value?: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return format(new Date(year, month - 1, day), 'MMM d')
}

function PriorityEditor({ id, value }: { id: string; value: DashPriority }) {
  const setPriority = useDashboardStore((state) => state.setProjectPriority)
  return <PriorityDots value={value} onChange={(priority) => setPriority(id, priority)} />
}

export function HabitsDesk({ now }: { now: Date }) {
  const habits = useDashboardStore((state) => state.habits)
  const add = useDashboardStore((state) => state.addHabit)
  const toggle = useDashboardStore((state) => state.toggleHabit)
  const remove = useDashboardStore((state) => state.removeHabit)
  const weekStartsOn = useSettingsStore((state) => state.weekStartsOn)
  const [name, setName] = useState('')
  const start = startOfWeek(now, { weekStartsOn })
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))
  const today = startOfDay(now)
  const dayKey = toDateKey(now)
  const doneToday = habits.filter((habit) => habit.checks[dayKey]).length
  const missed = habits.filter((habit) => !habit.checks[dayKey])
  const bestStreak = habits.reduce((max, habit) => Math.max(max, habitStreak(habit.checks, now)), 0)

  return (
    <Desk
      title="Habits"
      detail={
        habits.length
          ? `${doneToday} of ${habits.length} done today${bestStreak ? ` · best streak ${bestStreak}d` : ''}`
          : 'A week you can actually see'
      }
    >
      {missed.length > 0 && now.getHours() >= 18 && (
        <p className="mb-3 rounded-[12px] bg-accent-orange/10 px-3 py-2 text-[12px] text-accent-orange">
          {missed.length === 1
            ? `Still open tonight: ${missed[0].name}. A gentle check-in keeps the streak.`
            : `${missed.length} habits still open tonight — check one when you can.`}
        </p>
      )}
      <Panel>
        <form
          className="flex gap-2 border-b border-divider p-3"
          onSubmit={(event) => {
            event.preventDefault()
            add(name)
            setName('')
          }}
        >
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Add a habit" className="field min-w-0 flex-1" />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
        {habits.length === 0 ? (
          <div className="px-3 py-4">
            <p className="mb-3 text-[12px] text-tertiary">Start with one you already do.</p>
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((starter) => (
                <button key={starter} type="button" onClick={() => add(starter)} className="rounded-full bg-fill/10 px-2.5 py-1 text-[12px] font-medium text-secondary hover:bg-fill/15 hover:text-primary">
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-auto">
            <div className="max-w-[720px]">
              <div className="grid grid-cols-[minmax(140px,1fr)_repeat(7,36px)_44px] items-end gap-1 px-3 py-2 text-[11px] text-tertiary">
                <span>Habit</span>
                {days.map((day) => {
                  const isToday = startOfDay(day).getTime() === today.getTime()
                  return (
                    <span key={day.toISOString()} className={cn('text-center', isToday && 'font-semibold text-accent-red')}>
                      <span className="block">{format(day, 'EEEEE')}</span>
                      <span className="block tabular-nums">{format(day, 'd')}</span>
                    </span>
                  )
                })}
                <span className="text-right">Streak</span>
              </div>
              {habits.map((habit) => {
                const streak = habitStreak(habit.checks, now)
                return (
                  <div key={habit.id} className="group grid grid-cols-[minmax(140px,1fr)_repeat(7,36px)_44px] items-center gap-1 px-3 py-1.5 hover:bg-fill/8">
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="min-w-0 flex-1 truncate text-[13px]">{habit.name}</span>
                      <span className="opacity-0 group-hover:opacity-100">
                        <RemoveButton label={`Delete ${habit.name}`} onClick={() => remove(habit.id)} />
                      </span>
                    </div>
                    {days.map((day) => {
                      const key = toDateKey(day)
                      const future = startOfDay(day).getTime() > today.getTime()
                      const checked = !!habit.checks[key]
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={future}
                          aria-label={`${checked ? 'Uncheck' : 'Check'} ${habit.name} on ${format(day, 'EEEE MMM d')}`}
                          onClick={() => toggle(habit.id, key)}
                          className={cn(
                            'mx-auto flex h-5 w-5 items-center justify-center rounded-full border text-white',
                            checked ? 'border-accent-blue bg-accent-blue' : 'border-fill/30',
                            future && 'cursor-default opacity-30',
                          )}
                        >
                          {checked && <Check size={11} strokeWidth={3} />}
                        </button>
                      )
                    })}
                    <span className="text-right text-[12px] font-medium tabular-nums text-secondary">{streak > 0 ? `${streak}d` : '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Panel>
    </Desk>
  )
}

export function GoalsDesk() {
  const goals = useDashboardStore((state) => state.goals)
  const add = useDashboardStore((state) => state.addGoal)
  const step = useDashboardStore((state) => state.stepGoal)
  const remove = useDashboardStore((state) => state.removeGoal)
  const [name, setName] = useState('')
  const [target, setTarget] = useState(10)
  const ordered = [...goals].sort((a, b) => Number(a.current >= a.target) - Number(b.current >= b.target))

  return (
    <Desk title="Goals" detail={goals.length ? `${goals.filter((goal) => goal.current < goal.target).length} still open` : 'Count toward something specific'}>
      <Panel>
        <form
          className="flex flex-wrap items-center gap-2 border-b border-divider p-3"
          onSubmit={(event) => {
            event.preventDefault()
            add(name, target)
            setName('')
          }}
        >
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Goal name" className="field min-w-[180px] flex-1" />
          <div className="flex h-8 items-center rounded-[8px] bg-fill/10 px-1">
            <button type="button" aria-label="Lower target" onClick={() => setTarget((value) => Math.max(1, value - 1))} className="flex h-6 w-6 items-center justify-center text-secondary">
              <Minus size={12} />
            </button>
            <span className="w-8 text-center text-[12px] font-semibold tabular-nums">{target}</span>
            <button type="button" aria-label="Raise target" onClick={() => setTarget((value) => Math.min(999, value + 1))} className="flex h-6 w-6 items-center justify-center text-secondary">
              <Plus size={12} />
            </button>
          </div>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
        <div className="space-y-2 p-3">
          {ordered.map((goal) => {
            const ratio = goal.target === 0 ? 0 : Math.min(1, goal.current / goal.target)
            const complete = goal.current >= goal.target
            return (
              <div key={goal.id} className="rounded-xl bg-grouped px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn('min-w-0 flex-1 truncate text-[14px] font-medium', complete && 'text-secondary')}>{goal.name}</span>
                  <span className="text-[12px] tabular-nums text-secondary">
                    {goal.current}/{goal.target}
                  </span>
                  <button type="button" aria-label="Decrease progress" onClick={() => step(goal.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-secondary">
                    <Minus size={13} />
                  </button>
                  <button type="button" aria-label="Increase progress" onClick={() => step(goal.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-secondary">
                    <Plus size={13} />
                  </button>
                  <RemoveButton label="Delete goal" onClick={() => remove(goal.id)} />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill/15">
                  <div className={cn('h-full rounded-full', complete ? 'bg-accent-green' : 'bg-accent-blue')} style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
              </div>
            )
          })}
          {goals.length === 0 && <EmptyCopy>Name a goal, set how many times it counts, then add it.</EmptyCopy>}
        </div>
      </Panel>
    </Desk>
  )
}
