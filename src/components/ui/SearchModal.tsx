import { format, parseISO } from 'date-fns'
import { useMemo, useState } from 'react'
import * as chrono from 'chrono-node'
import { formatTime, toDateKey } from '@/lib/dates'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useTaskStore } from '@/store/taskStore'
import { useSettingsStore } from '@/store/settingsStore'

type Kind = 'all' | 'events' | 'tasks'

export function SearchModal() {
  const open = useCalendarStore((state) => state.searchOpen)
  const close = () => useCalendarStore.setState({ searchOpen: false })
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const [calendarId, setCalendarId] = useState('all')
  const events = useEventStore((state) => state.events)
  const tasks = useTaskStore((state) => state.tasks)
  const calendars = useCalendarStore((state) => state.calendars)
  const timeFormat = useSettingsStore((state) => state.timeFormat)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const parsed = q ? chrono.parse(query, new Date(), { forwardDate: true })[0] : undefined
    const dateKey = parsed ? toDateKey(parsed.start.date()) : ''
    const eventHits = events
      .filter((event) => calendarId === 'all' || event.calendarId === calendarId)
      .filter((event) => {
        if (!q) return false
        const hay = `${event.title} ${event.notes ?? ''} ${event.location ?? ''}`.toLowerCase()
        return hay.includes(q) || (dateKey && event.start.slice(0, 10).includes(dateKey)) || toDateKey(parseISO(event.start)) === dateKey
      })
      .slice(0, 20)
      .map((event) => ({
        id: event.id,
        type: 'event' as const,
        title: event.title,
        meta: event.allDay ? format(parseISO(event.start), 'EEE, MMM d') : `${format(parseISO(event.start), 'EEE, MMM d')} · ${formatTime(parseISO(event.start), timeFormat)}`,
        date: toDateKey(parseISO(event.start)),
      }))
    const taskHits = tasks
      .filter((task) => {
        if (!q) return false
        return `${task.title} ${task.notes ?? ''}`.toLowerCase().includes(q) || (task.due && dateKey && toDateKey(parseISO(task.due)) === dateKey)
      })
      .slice(0, 20)
      .map((task) => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        meta: task.due ? format(parseISO(task.due), 'EEE, MMM d') : 'No due date',
        date: task.due ? toDateKey(parseISO(task.due)) : toDateKey(new Date()),
      }))
    return [...(kind === 'tasks' ? [] : eventHits), ...(kind === 'events' ? [] : taskHits)]
  }, [query, kind, calendarId, events, tasks, timeFormat])

  return (
    <Modal open={open} onClose={close} width={560}>
      <div className="p-5">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="w-full bg-transparent text-[28px] font-bold tracking-[-0.03em] outline-none placeholder:text-tertiary"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(['all', 'events', 'tasks'] as Kind[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setKind(item)}
              className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold capitalize ${kind === item ? 'bg-accent-blue text-white' : 'bg-fill/12 text-accent-blue'}`}
            >
              {item}
            </button>
          ))}
          <Select
            className="ml-auto max-w-[180px]"
            value={calendarId}
            onChange={setCalendarId}
            label="Filter calendar"
            options={[
              { value: 'all', label: 'All calendars' },
              ...calendars.map((calendar) => ({ value: calendar.id, label: calendar.name, color: calendar.color })),
            ]}
          />
        </div>
        <div className="mt-4 max-h-80 overflow-auto">
          <div className="ios-card">
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                className="ios-row w-full flex-col items-start gap-0.5 text-left"
                onClick={() => {
                  useCalendarStore.getState().setSelectedDate(result.date)
                  useCalendarStore.getState().setView('day')
                  close()
                }}
              >
                <span className="text-[15px] font-medium tracking-[-0.01em]">{result.title}</span>
                <span className="text-[12px] text-secondary">
                  {result.type === 'task' ? 'Reminder' : 'Event'} · {result.meta}
                </span>
              </button>
            ))}
            {query && results.length === 0 && <div className="py-10 text-center text-[15px] text-tertiary">No Results</div>}
          </div>
        </div>
      </div>
    </Modal>
  )
}
