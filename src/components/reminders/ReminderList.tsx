import { useMemo, useState } from 'react'
import { format, isBefore, isToday, parseISO } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { toDateKey, formatTime } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { useCalendar } from '@/hooks/useCalendar'
import { TimeField } from '@/components/ui/TimeField'
import { askConfirm } from '@/store/confirmStore'
import { useReminderStore } from '@/store/reminderStore'
import { useSettingsStore } from '@/store/settingsStore'

export function ReminderList() {
  const { selected } = useCalendar()
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const reminders = useReminderStore((state) => state.reminders)
  const addReminder = useReminderStore((state) => state.addReminder)
  const toggleReminder = useReminderStore((state) => state.toggleReminder)
  const removeReminder = useReminderStore((state) => state.removeReminder)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')
  const dayKey = toDateKey(selected)

  const items = useMemo(
    () =>
      reminders
        .filter((item) => toDateKey(parseISO(item.at)) === dayKey)
        .sort((a, b) => Number(a.done) - Number(b.done) || a.at.localeCompare(b.at)),
    [reminders, dayKey],
  )

  return (
    <section className="border-b border-divider px-3 pb-3 pt-3">
      <div className="px-0.5">
        <div className="text-[12px] font-semibold text-accent-red">{isToday(selected) ? 'Today' : format(selected, 'EEEE')}</div>
        <div className="text-[20px] font-semibold tracking-[-0.02em]">{format(selected, 'MMMM d')}</div>
        <div className="mt-0.5 text-[11px] text-tertiary">Reminders</div>
      </div>

      <form
        className="mt-3 space-y-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          const name = title.trim()
          if (!name) return
          const [hours, minutes] = time.split(':').map(Number)
          const at = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), hours || 0, minutes || 0, 0, 0)
          addReminder(name, at.toISOString())
          setTitle('')
        }}
      >
        <div className="relative">
          <Plus size={14} strokeWidth={2.2} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary" />
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a reminder"
            className="field w-full pl-8"
          />
        </div>
        <div className="flex gap-1.5">
          <TimeField value={time} onChange={setTime} label="Reminder time" className="min-w-0 flex-1" />
          <button
            type="submit"
            className="flex h-8 shrink-0 items-center rounded-[8px] bg-accent-blue px-3 text-[12px] font-medium text-white hover:opacity-90"
          >
            Set
          </button>
        </div>
      </form>

      <div className="mt-2 max-h-40 divide-y divide-divider overflow-auto">
        {items.length === 0 && (
          <div className="border-none py-5 text-center text-[12px] text-tertiary">No reminders for this day</div>
        )}
        {items.map((item) => {
          const at = parseISO(item.at)
          const overdue = !item.done && isBefore(at, new Date())
          return (
            <div key={item.id} className="group flex items-start gap-2.5 px-0.5 py-2 hover:bg-fill/[0.04]">
              <button
                type="button"
                aria-label={item.done ? 'Mark open' : 'Mark done'}
                onClick={() => toggleReminder(item.id)}
                className={cn(
                  'mt-0.5 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
                  item.done ? 'border-accent-blue bg-accent-blue' : 'border-fill/30',
                )}
              >
                {item.done && <span className="h-1 w-1 rounded-full bg-white" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className={cn('truncate text-[13px]', item.done && 'text-tertiary line-through')}>{item.title}</div>
                <div className={cn('text-[11px]', overdue ? 'text-accent-red' : 'text-tertiary')}>
                  {formatTime(at, timeFormat)}
                  {overdue ? ' · Overdue' : ''}
                </div>
              </div>
              <button
                type="button"
                aria-label="Delete reminder"
                onClick={() => {
                  void askConfirm({ title: 'Delete reminder?', body: item.title }).then((ok) => {
                    if (ok) removeReminder(item.id)
                  })
                }}
                className="mt-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-tertiary hover:bg-fill/10 hover:text-primary group-hover:flex"
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
