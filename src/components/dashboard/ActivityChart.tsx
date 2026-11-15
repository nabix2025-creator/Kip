import { eachDayOfInterval, endOfMonth, format, isSameMonth, isToday, startOfMonth } from 'date-fns'
import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { toDateKey } from '@/lib/dates'
import { useDashboardStore } from '@/store/dashboardStore'
import { useEventStore } from '@/store/eventStore'
import { useTaskStore } from '@/store/taskStore'
import { Panel, PanelLabel } from '@/components/dashboard/chrome'

export function ActivityChart({ now }: { now: Date }) {
  const events = useEventStore((state) => state.events)
  const statuses = useEventStore((state) => state.statuses)
  const tasks = useTaskStore((state) => state.tasks)
  const habits = useDashboardStore((state) => state.habits)
  const ledger = useDashboardStore((state) => state.ledger)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const days = useMemo(() => {
    const scores = new Map<string, number>()
    for (const day of eachDayOfInterval({ start: monthStart, end: monthEnd })) {
      scores.set(toDateKey(day), 0)
    }

    for (const event of events) {
      const key = toDateKey(new Date(event.start))
      if (!scores.has(key)) continue
      const status = statuses[event.id] ?? event.status ?? 'open'
      let points = 1
      if (status === 'done') points = 2
      if (status === 'missed') points = 0.5
      scores.set(key, (scores.get(key) ?? 0) + points)
    }

    for (const task of tasks) {
      if (!task.completed) continue
      const stamp = task.updatedAt || task.createdAt
      const key = toDateKey(new Date(stamp))
      if (!scores.has(key)) continue
      scores.set(key, (scores.get(key) ?? 0) + 1.5)
    }

    for (const habit of habits) {
      for (const [day, checked] of Object.entries(habit.checks)) {
        if (!checked || !scores.has(day)) continue
        scores.set(day, (scores.get(day) ?? 0) + 1)
      }
    }

    for (const entry of ledger) {
      if (!scores.has(entry.day)) continue
      scores.set(entry.day, (scores.get(entry.day) ?? 0) + 0.75)
    }

    const list = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((day) => {
      const key = toDateKey(day)
      return { day, key, value: scores.get(key) ?? 0 }
    })
    const max = Math.max(1, ...list.map((item) => item.value))
    return list.map((item) => ({ ...item, ratio: item.value / max }))
  }, [events, statuses, tasks, habits, ledger, monthStart, monthEnd])

  const total = days.reduce((sum, item) => sum + item.value, 0)
  const activeDays = days.filter((item) => item.value > 0).length
  const quiet = activeDays === 0

  return (
    <Panel tone="blue" className="lg:col-span-2">
      <PanelLabel
        tone="blue"
        aside={
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              quiet ? 'bg-accent-blue/10 text-accent-blue' : 'bg-accent-blue/15 text-accent-blue',
            )}
          >
            {activeDays} active · {Math.round(total)} pts
          </span>
        }
      >
        {format(now, 'MMMM')} activity
      </PanelLabel>
      <div
        className={cn(
          'relative mx-3 mb-1 flex items-end gap-[3px] overflow-hidden rounded-xl px-2 pb-2 pt-3',
          quiet ? 'bg-accent-blue/10' : 'bg-accent-blue/5',
        )}
        style={{ height: 112 }}
      >
        {days.map((item) => {
          const today = isToday(item.day)
          return (
            <div key={item.key} className="group relative flex min-w-0 flex-1 flex-col items-center justify-end">
              <div
                className={cn(
                  'w-full rounded-[3px] transition-colors',
                  item.value === 0 && (today ? 'bg-accent-red/35' : 'bg-accent-blue/15'),
                  item.value > 0 && 'bg-accent-blue/50',
                  item.ratio > 0.45 && 'bg-accent-blue/75',
                  item.ratio > 0.75 && 'bg-accent-blue',
                  today && 'ring-2 ring-accent-red/70 ring-offset-1 ring-offset-primary',
                )}
                style={{ height: `${Math.max(item.value === 0 ? (today ? 10 : 6) : 10, Math.round(item.ratio * 84))}px` }}
                title={`${format(item.day, 'MMM d')}: ${item.value === 0 ? 'quiet' : `${Math.round(item.value * 10) / 10} activity`}`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between px-3 pb-3 text-[10px] text-tertiary">
        <span>{format(monthStart, 'MMM d')}</span>
        <span className={cn(isSameMonth(now, new Date()) && 'font-semibold text-accent-red')}>
          {isSameMonth(now, new Date()) ? 'Today' : format(monthEnd, 'MMM d')}
        </span>
        <span>{format(monthEnd, 'MMM d')}</span>
      </div>
    </Panel>
  )
}
