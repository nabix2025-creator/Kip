import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ChevronRight, Droplets, Hourglass, Minus, Pause, Phone, Play, Plus, Quote, RotateCcw, Star, Timer, X } from 'lucide-react'
import { formatTime, toDateKey } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { QUOTES } from '@/lib/quotes'
import { combineDateTime } from '@/components/dashboard/ui'
import { DateField } from '@/components/ui/DateField'
import { TimeField } from '@/components/ui/TimeField'
import { FOCUS_LENGTH, useDashboardStore } from '@/store/dashboardStore'
import { useSettingsStore } from '@/store/settingsStore'

export function SidebarPomodoro() {
  const pomodoro = useDashboardStore((state) => state.pomodoro)
  const start = useDashboardStore((state) => state.startPomodoro)
  const pause = useDashboardStore((state) => state.pausePomodoro)
  const reset = useDashboardStore((state) => state.resetPomodoro)
  const sessions = pomodoro.sessions[toDateKey(new Date())] ?? 0
  const minutes = Math.floor(pomodoro.remaining / 60)
  const seconds = pomodoro.remaining % 60
  const progress = 1 - pomodoro.remaining / FOCUS_LENGTH
  const radius = 36
  const circumference = 2 * Math.PI * radius

  return (
    <section className="mx-2 mb-2 rounded-[14px] border border-divider bg-primary/70 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Timer size={12} strokeWidth={2.2} className="text-secondary" />
        <span className="text-[11px] font-semibold tracking-[-0.01em]">Pomodoro</span>
        <span className="ml-auto text-[10px] tabular-nums text-tertiary">{sessions} today</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-[76px] w-[76px] shrink-0">
          <svg viewBox="0 0 90 90" className="h-full w-full">
            <circle cx="45" cy="45" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-fill/15" />
            <circle
              cx="45"
              cy="45"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              className="text-primary"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform="rotate(-90 45 45)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[15px] font-semibold tabular-nums tracking-[-0.03em]">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <button
            type="button"
            onClick={pomodoro.running ? pause : start}
            className="flex h-7 items-center justify-center gap-1 rounded-full bg-[rgb(var(--fg))] px-2.5 text-[11px] font-semibold text-[rgb(var(--bg-primary))]"
          >
            {pomodoro.running ? <Pause size={11} /> : <Play size={11} />}
            {pomodoro.running ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            aria-label="Reset timer"
            onClick={reset}
            className="flex h-7 items-center justify-center gap-1 rounded-full bg-fill/10 text-[11px] font-medium text-secondary hover:text-primary"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        </div>
      </div>
    </section>
  )
}

export function SidebarCountdown() {
  const items = useDashboardStore((state) => state.countdowns)
  const add = useDashboardStore((state) => state.addCountdown)
  const remove = useDashboardStore((state) => state.removeCountdown)
  const [name, setName] = useState('')
  const [date, setDate] = useState(() => toDateKey(new Date()))
  const [time, setTime] = useState('09:00')
  const [open, setOpen] = useState(false)
  const now = useNow()
  const ordered = [...items].sort((a, b) => a.at.localeCompare(b.at)).slice(0, 4)

  return (
    <section className="mx-2 mb-2 rounded-[14px] border border-divider bg-primary/70 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Hourglass size={12} strokeWidth={2.2} className="text-secondary" />
        <span className="text-[11px] font-semibold tracking-[-0.01em]">Countdown</span>
        <button
          type="button"
          aria-label="Add countdown"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-secondary hover:bg-fill/10 hover:text-primary"
        >
          <Plus size={12} />
        </button>
      </div>

      {open && (
        <form
          className="mt-2 space-y-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            const at = combineDateTime(date, time)
            if (!at) return
            add(name, at)
            setName('')
            setOpen(false)
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Event name"
            className="field w-full"
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <DateField value={date} onChange={setDate} label="Target date" />
            <TimeField value={time} onChange={setTime} label="Target time" />
          </div>
          <button type="submit" className="flex h-7 w-full items-center justify-center rounded-full bg-[rgb(var(--fg))] text-[11px] font-semibold text-[rgb(var(--bg-primary))]">
            Add
          </button>
        </form>
      )}

      <div className="mt-2 space-y-1.5">
        {ordered.map((item) => {
          const left = new Date(item.at).getTime() - now.getTime()
          return (
            <div key={item.id} className="group flex items-start gap-1.5 rounded-lg px-0.5 py-1">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium">{item.name}</div>
                <div
                  className={cn(
                    'mt-0.5 text-[15px] font-semibold tabular-nums tracking-[-0.03em]',
                    left <= 0 ? 'text-accent-red' : 'text-primary',
                  )}
                >
                  {left <= 0 ? 'It’s time' : countdownLabel(left)}
                </div>
              </div>
              <button
                type="button"
                aria-label="Delete countdown"
                onClick={() => {
                  void import('@/store/confirmStore').then(({ askConfirm }) =>
                    askConfirm({ title: 'Delete countdown?', body: item.name }).then((ok) => {
                      if (ok) remove(item.id)
                    }),
                  )
                }}
                className="mt-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-tertiary hover:bg-fill/10 hover:text-primary group-hover:flex"
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
        {ordered.length === 0 && !open && <p className="py-1 text-[11px] text-tertiary">Add a date to count down to</p>}
      </div>
    </section>
  )
}

export function SidebarWater() {
  const day = toDateKey(new Date())
  const goal = useDashboardStore((state) => state.waterGoal)
  const count = useDashboardStore((state) => state.water[day] ?? 0)
  const add = useDashboardStore((state) => state.addWater)
  const ratio = goal === 0 ? 0 : count / goal

  return (
    <section className="mx-2 mb-2 rounded-[14px] border border-divider bg-primary/70 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Droplets size={12} strokeWidth={2.2} className="text-secondary" />
        <span className="text-[11px] font-semibold tracking-[-0.01em]">Water</span>
        <span className="ml-auto text-[10px] tabular-nums text-tertiary">{Math.round(ratio * 100)}%</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="min-w-0 flex-1 text-[22px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
          {count}
          <span className="text-[13px] text-tertiary">/{goal}</span>
        </div>
        <button
          type="button"
          aria-label="Remove a glass"
          onClick={() => add(day, -1)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-fill/10 text-secondary hover:text-primary"
        >
          <Minus size={12} />
        </button>
        <button
          type="button"
          aria-label="Add a glass"
          onClick={() => add(day, 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--fg))] text-[rgb(var(--bg-primary))]"
        >
          <Plus size={12} />
        </button>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-fill/10">
        <div className="h-full rounded-full bg-accent-blue transition-[width] duration-200" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </section>
  )
}

export function SidebarQuotes() {
  const index = useDashboardStore((state) => state.quoteIndex)
  const saved = useDashboardStore((state) => state.savedQuotes)
  const cycle = useDashboardStore((state) => state.cycleQuote)
  const toggle = useDashboardStore((state) => state.toggleSavedQuote)
  const quote = QUOTES[index] ?? QUOTES[0]
  const kept = saved.includes(index)

  return (
    <section className="mx-2 mb-2 rounded-[14px] border border-divider bg-primary/70 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Quote size={12} strokeWidth={2.2} className="text-secondary" />
        <span className="text-[11px] font-semibold tracking-[-0.01em]">Quotes</span>
        <button
          type="button"
          aria-label="Next quote"
          onClick={() => cycle(1)}
          className="ml-auto flex h-5 items-center gap-0.5 rounded-full px-1.5 text-[10px] font-medium text-secondary hover:bg-fill/10 hover:text-primary"
        >
          Next
          <ChevronRight size={11} />
        </button>
      </div>
      <blockquote className="mt-2">
        <p className="text-[12px] font-medium leading-snug tracking-[-0.01em]">“{quote.text}”</p>
        <footer className="mt-1.5 text-[10px] text-tertiary">— {quote.author}</footer>
      </blockquote>
      <button
        type="button"
        onClick={() => toggle(index)}
        className={cn('mt-2 flex items-center gap-1 text-[11px] font-medium', kept ? 'text-accent-orange' : 'text-secondary hover:text-primary')}
      >
        <Star size={11} fill={kept ? 'currentColor' : 'none'} />
        {kept ? 'Saved' : 'Save'}
      </button>
    </section>
  )
}

export function SidebarCall() {
  const calls = useDashboardStore((state) => state.calls)
  const add = useDashboardStore((state) => state.addCall)
  const remove = useDashboardStore((state) => state.removeCall)
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(() => toDateKey(new Date()))
  const [time, setTime] = useState('09:00')
  const now = useNow()
  const ordered = [...calls].sort((a, b) => a.at.localeCompare(b.at)).slice(0, 4)

  return (
    <section className="mx-2 mb-2 rounded-[14px] border border-divider bg-primary/70 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Phone size={12} strokeWidth={2.2} className="text-secondary" />
        <span className="text-[11px] font-semibold tracking-[-0.01em]">Call</span>
        <button
          type="button"
          aria-label="Add call reminder"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-secondary hover:bg-fill/10 hover:text-primary"
        >
          <Plus size={12} />
        </button>
      </div>

      {open && (
        <form
          className="mt-2 space-y-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            const at = combineDateTime(date, time)
            if (!at) return
            add({ who, phone, at })
            setWho('')
            setPhone('')
            setOpen(false)
          }}
        >
          <input value={who} onChange={(event) => setWho(event.target.value)} placeholder="Who to call" className="field w-full" autoFocus />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone (optional)" className="field w-full" />
          <div className="flex flex-col gap-1">
            <DateField value={date} onChange={setDate} label="Due date" />
            <TimeField value={time} onChange={setTime} label="Reminder time" />
          </div>
          <button type="submit" className="flex h-7 w-full items-center justify-center rounded-full bg-[rgb(var(--fg))] text-[11px] font-semibold text-[rgb(var(--bg-primary))]">
            Add
          </button>
        </form>
      )}

      <div className="mt-2 space-y-1">
        {ordered.map((call) => {
          const when = new Date(call.at)
          const soon = when.getTime() - now.getTime() < 30 * 60 * 1000 && when.getTime() >= now.getTime()
          return (
            <div key={call.id} className="group flex items-start gap-1.5 rounded-lg px-0.5 py-1">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium">{call.who}</div>
                <div className={cn('truncate text-[10px]', soon ? 'text-accent-orange' : 'text-tertiary')}>
                  {format(when, 'MMM d')} · {formatTime(when, timeFormat)}
                  {call.phone ? ` · ${call.phone}` : ''}
                </div>
              </div>
              <button
                type="button"
                aria-label="Delete call reminder"
                onClick={() => {
                  void import('@/store/confirmStore').then(({ askConfirm }) =>
                    askConfirm({ title: 'Delete call reminder?', body: call.who }).then((ok) => {
                      if (ok) remove(call.id)
                    }),
                  )
                }}
                className="mt-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-tertiary hover:bg-fill/10 hover:text-primary group-hover:flex"
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
        {ordered.length === 0 && !open && <p className="py-1 text-[11px] text-tertiary">Remind 5 min before a call</p>}
      </div>
    </section>
  )
}

function countdownLabel(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}
