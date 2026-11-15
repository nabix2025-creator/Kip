import { addMinutes, format, isBefore, isToday, parseISO, startOfDay } from 'date-fns'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarPlus, Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE } from '@/lib/constants'
import { blankDraft } from '@/lib/draft'
import { formatTime } from '@/lib/dates'
import { periodLabel, resolveTaskPeriod, TASK_PERIODS } from '@/lib/taskPeriod'
import type { Priority, Task } from '@/types'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { askConfirm } from '@/store/confirmStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useTaskStore } from '@/store/taskStore'
import { useSettingsStore } from '@/store/settingsStore'

const PRIORITY: Record<Priority, string> = {
  none: 'transparent',
  low: '#0A84FF',
  medium: '#FF9500',
  high: '#FF3B30',
}

export function TaskItem({ task, accent }: { task: Task; accent?: string }) {
  const toggle = useTaskStore((state) => state.toggleTask)
  const remove = useTaskStore((state) => state.deleteTask)
  const setTaskPeriod = useTaskStore((state) => state.setTaskPeriod)
  const update = useTaskStore((state) => state.updateTask)
  const addEvent = useEventStore((state) => state.addEvent)
  const pushToast = useCalendarStore((state) => state.pushToast)
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const period = resolveTaskPeriod(task)
  const overdue =
    task.due &&
    !task.completed &&
    period === 'today' &&
    isBefore(startOfDay(parseISO(task.due)), startOfDay(new Date())) &&
    !isToday(parseISO(task.due))
  const hasClock = Boolean(task.due && format(parseISO(task.due), 'HH:mm') !== '00:00')

  const blockOnCalendar = () => {
    const start = new Date()
    start.setSeconds(0, 0)
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15)
    const end = addMinutes(start, 60)
    addEvent(
      blankDraft({
        title: task.title,
        start: start.toISOString(),
        end: end.toISOString(),
        notes: task.notes ? `From todo · ${task.notes}` : 'Blocked from Todo',
      }),
    )
    pushToast(`Blocked “${task.title}” for 1 hour`)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="group relative flex items-start gap-2.5 px-1 py-2.5 hover:bg-fill/[0.06]"
      onContextMenu={(event) => {
        event.preventDefault()
        setMenu({ x: event.clientX, y: event.clientY })
      }}
    >
      <button
        type="button"
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        onClick={() => toggle(task.id)}
        className={cn(
          'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150 ease-ios',
          task.completed ? 'border-accent-blue bg-accent-blue text-white' : 'border-fill/30 hover:border-accent-blue/60',
        )}
      >
        <AnimateCheck checked={task.completed} />
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="w-full text-left"
          onDoubleClick={() => {
            const next = window.prompt('Task', task.title)
            if (next !== null) update(task.id, { title: next.trim() || task.title })
          }}
        >
          <span className="flex items-center gap-1.5">
            {accent && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />}
            {task.priority !== 'none' && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PRIORITY[task.priority] }} />
            )}
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-[13px] tracking-[-0.01em]',
                task.completed && 'text-tertiary line-through',
              )}
            >
              {task.title}
            </span>
          </span>
          <span className={cn('mt-0.5 block pl-3 text-[11px]', overdue ? 'text-accent-red' : 'text-tertiary')}>
            {periodLabel(period)}
            {hasClock && task.due ? ` · ${formatTime(parseISO(task.due), timeFormat)}` : ''}
            {overdue ? ' · Overdue' : ''}
          </span>
        </button>
      </div>
      {!task.completed && (
        <button
          type="button"
          aria-label="Block on calendar"
          title="Block on calendar"
          onClick={blockOnCalendar}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-tertiary opacity-0 transition-opacity hover:bg-fill/10 hover:text-accent-blue group-hover:opacity-100"
        >
          <CalendarPlus size={12} strokeWidth={2} />
        </button>
      )}
      <button
        type="button"
        aria-label="Delete todo"
        onClick={() => {
          void askConfirm({ title: 'Delete todo?', body: task.title }).then((ok) => {
            if (ok) remove(task.id)
          })
        }}
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-tertiary opacity-0 transition-opacity hover:bg-fill/10 hover:text-accent-red group-hover:opacity-100"
      >
        <Trash2 size={12} strokeWidth={2} />
      </button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            ...TASK_PERIODS.map((item) => ({
              label: item.label,
              onClick: () => setTaskPeriod(task.id, item.value),
            })),
            {
              label: 'Block on calendar',
              onClick: blockOnCalendar,
            },
            {
              label: task.priority === 'high' ? 'Priority: high' : 'Set high priority',
              onClick: () => update(task.id, { priority: 'high' }),
            },
            {
              label: 'Delete',
              danger: true,
              onClick: () => {
                void askConfirm({ title: 'Delete todo?', body: task.title }).then((ok) => {
                  if (ok) remove(task.id)
                })
              },
            },
          ]}
        />
      )}
    </motion.div>
  )
}

function AnimateCheck({ checked }: { checked: boolean }) {
  return (
    <motion.span
      initial={false}
      animate={checked ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
      transition={{ duration: 0.18, ease: EASE }}
      className="flex"
    >
      <Check size={11} strokeWidth={3} />
    </motion.span>
  )
}
