import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, CheckCircle2, Flag, FolderKanban, LayoutDashboard, NotebookPen, Plus, Presentation, StickyNote, Target, Wallet } from 'lucide-react'
import { parseNaturalLanguage } from '@/lib/nlpParser'
import { EASE } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { dueForPeriod, inferPeriod, TASK_PERIODS } from '@/lib/taskPeriod'
import { Segmented } from '@/components/ui/Segmented'
import { TaskItem } from '@/components/tasks/TaskItem'
import { useTasks } from '@/hooks/useTasks'
import { useTaskStore } from '@/store/taskStore'
import { useCalendarStore } from '@/store/calendarStore'
import type { DeskId } from '@/components/dashboard/chrome'
import type { TaskPeriod } from '@/types'

const QUICK: { id: DeskId; label: string; icon: typeof StickyNote }[] = [
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'journal', label: 'Journal', icon: NotebookPen },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'habits', label: 'Habits', icon: Target },
  { id: 'routines', label: 'Routines', icon: CheckCircle2 },
  { id: 'goals', label: 'Goals', icon: Flag },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'library', label: 'Shelf', icon: BookOpen },
]

export function TaskList() {
  const [period, setPeriod] = useState<TaskPeriod>('today')
  const [title, setTitle] = useState('')
  const [listId, setListId] = useState('')
  const [scope, setScope] = useState<'all' | string>('all')
  const lists = useTaskStore((state) => state.lists)
  const addTask = useTaskStore((state) => state.addTask)
  const addList = useTaskStore((state) => state.addList)
  const openDashboard = useCalendarStore((state) => state.openDashboard)
  const openWhiteboard = useCalendarStore((state) => state.openWhiteboard)
  const filtered = useTasks(period)
  const activeList = listId || lists[0]?.id || ''
  const tasks = useMemo(
    () => (scope === 'all' ? filtered : filtered.filter((task) => task.listId === scope)),
    [filtered, scope],
  )
  const listColor = (id: string) => lists.find((list) => list.id === id)?.color ?? '#0A84FF'
  const openCount = tasks.filter((task) => !task.completed).length

  return (
    <section className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
      <div className="mb-3 flex items-baseline justify-between px-0.5">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Todo</h2>
        {tasks.length > 0 && (
          <span className="text-[11px] tabular-nums text-tertiary">{openCount} open</span>
        )}
      </div>

      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault()
          const parsed = parseNaturalLanguage(title)
          const name = !parsed.start || parsed.title === 'New Event' ? title.trim() : parsed.title
          if (!name) return
          const nextPeriod = parsed.start ? inferPeriod(parsed.start) : period
          const due = parsed.start?.toISOString() ?? dueForPeriod(nextPeriod)
          addTask({ title: name, listId: activeList, period: nextPeriod, due })
          setTitle('')
          if (nextPeriod !== period) setPeriod(nextPeriod)
        }}
      >
        <Plus size={14} strokeWidth={2.2} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary" />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a Todo"
          className="field w-full pl-8"
        />
      </form>

      <div className="mt-3">
        <Segmented
          value={period}
          onChange={setPeriod}
          className="[&_button]:min-w-0 [&_button]:flex-1 [&_button]:px-1 [&_button]:text-[11px]"
          options={TASK_PERIODS.map((item) => ({ value: item.value, label: item.label }))}
        />
      </div>

      <div className="mt-2.5 flex gap-1 overflow-auto px-0.5 pb-0.5">
        <FilterChip active={scope === 'all'} onClick={() => setScope('all')} label="All" />
        {lists.map((list) => (
          <FilterChip
            key={list.id}
            active={scope === list.id}
            onClick={() => {
              setScope(list.id)
              setListId(list.id)
            }}
            label={list.name}
            color={list.color}
          />
        ))}
        <button
          type="button"
          className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-medium text-accent-blue hover:bg-fill/8"
          onClick={() => {
            const name = window.prompt('List name')
            if (name?.trim()) addList(name.trim(), '#AF52DE')
          }}
        >
          <Plus size={11} strokeWidth={2.4} />
          List
        </button>
      </div>

      <div className="mt-1 min-h-0 flex-1 divide-y divide-divider overflow-auto">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} accent={listColor(task.listId)} />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex flex-col items-center gap-2 border-none py-10 text-center"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fill/8">
              <CheckCircle2 size={16} strokeWidth={1.7} className="text-tertiary" />
            </div>
            <div className="text-[13px] text-secondary">No Todos</div>
            <div className="max-w-[170px] text-[11px] leading-relaxed text-tertiary">
              Todos for {TASK_PERIODS.find((item) => item.value === period)?.label.toLowerCase()} stay in this bucket
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-2 shrink-0 space-y-1.5">
        <div className="grid grid-cols-4 gap-1">
          {QUICK.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openDashboard(item.id)}
                className="flex flex-col items-center gap-1 rounded-[9px] bg-fill/8 px-1 py-1.5 text-secondary transition-colors hover:bg-fill/12 hover:text-primary"
              >
                <Icon size={13} strokeWidth={2} />
                <span className="truncate text-[9px] font-medium leading-none">{item.label}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={openWhiteboard}
            className="flex flex-col items-center gap-1 rounded-[9px] bg-fill/8 px-1 py-1.5 text-secondary transition-colors hover:bg-fill/12 hover:text-primary"
          >
            <Presentation size={13} strokeWidth={2} />
            <span className="truncate text-[9px] font-medium leading-none">Board</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => openDashboard('today')}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[9px] bg-fill/10 text-[12px] font-medium text-secondary transition-colors hover:bg-fill/14 hover:text-primary"
        >
          <LayoutDashboard size={13} strokeWidth={2} />
          Dashboard
        </button>
      </div>
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean
  onClick: () => void
  label: string
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ease-ios',
        active ? 'bg-fill/14 text-primary' : 'text-secondary hover:bg-fill/8',
      )}
    >
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {label}
    </button>
  )
}
