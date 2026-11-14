import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, Plus, X } from 'lucide-react'
import { PALETTE } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'

export function CalendarMenu() {
  const calendars = useCalendarStore((state) => state.calendars)
  const toggle = useCalendarStore((state) => state.toggleCalendar)
  const addCalendar = useCalendarStore((state) => state.addCalendar)
  const remove = useCalendarStore((state) => state.removeCalendar)
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[4].value)
  const root = useRef<HTMLDivElement>(null)
  const others = calendars.filter((calendar) => calendar.group === 'Other')
  const visibleCount = others.filter((calendar) => calendar.visible).length

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false)
        setAdding(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setAdding(false)
      }
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative no-drag">
      <button
        type="button"
        aria-label="Calendars"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
          open ? 'bg-fill/15 text-primary' : 'text-secondary hover:bg-fill/10 hover:text-primary',
        )}
      >
        <CalendarDays size={15} strokeWidth={2} />
      </button>
      {visibleCount > 0 && (
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent-blue px-1 text-[9px] font-semibold text-white">
          {visibleCount}
        </span>
      )}

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[210px] overflow-hidden rounded-[12px] border border-divider bg-[rgb(var(--bg-primary))] shadow-sheet">
          <div className="border-b border-divider px-3 py-2">
            <div className="text-[11px] font-semibold tracking-[-0.01em]">Calendars</div>
            <div className="text-[10px] text-tertiary">Toggle what shows on the grid</div>
          </div>
          <div className="max-h-[240px] overflow-auto py-1">
            {others.map((calendar) => (
              <div key={calendar.id} className="group flex items-center gap-2 px-2.5 py-1.5 hover:bg-fill/8">
                <button
                  type="button"
                  aria-label={calendar.visible ? `Hide ${calendar.name}` : `Show ${calendar.name}`}
                  onClick={() => toggle(calendar.id)}
                  className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border"
                  style={{
                    borderColor: calendar.color,
                    background: calendar.visible ? calendar.color : 'transparent',
                  }}
                >
                  {calendar.visible && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>
                <button type="button" onClick={() => toggle(calendar.id)} className="min-w-0 flex-1 truncate text-left text-[13px]">
                  {calendar.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${calendar.name}`}
                  onClick={() => {
                    void import('@/store/confirmStore').then(({ askConfirm }) =>
                      askConfirm({
                        title: 'Delete calendar?',
                        body: `“${calendar.name}” and its events will be removed.`,
                      }).then((ok) => {
                        if (!ok) return
                        useEventStore.getState().removeByCalendar(calendar.id)
                        remove(calendar.id)
                      }),
                    )
                  }}
                  className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-tertiary hover:bg-fill/10 hover:text-accent-red group-hover:flex"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {others.length === 0 && <div className="px-3 py-3 text-[12px] text-tertiary">No calendars yet</div>}
          </div>

          <div className="border-t border-divider p-2">
            {adding ? (
              <form
                className="space-y-1.5"
                onSubmit={(event) => {
                  event.preventDefault()
                  const title = name.trim()
                  if (!title) return
                  addCalendar({ name: title, color, provider: 'local', group: 'Other', visible: true })
                  setName('')
                  setAdding(false)
                }}
              >
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Calendar name"
                  className="field w-full"
                />
                <div className="flex flex-wrap gap-1">
                  {PALETTE.map((swatch) => (
                    <button
                      key={swatch.id}
                      type="button"
                      aria-label={swatch.label}
                      onClick={() => setColor(swatch.value)}
                      className={cn('h-4 w-4 rounded-full', color === swatch.value && 'ring-2 ring-accent-blue ring-offset-1')}
                      style={{ background: swatch.value }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setAdding(false)} className="flex h-7 flex-1 items-center justify-center rounded-lg bg-fill/10 text-[11px] font-medium text-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="flex h-7 flex-1 items-center justify-center rounded-lg bg-accent-blue text-[11px] font-semibold text-white">
                    Add
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex h-7 w-full items-center justify-center gap-1 rounded-lg text-[12px] font-medium text-accent-blue hover:bg-fill/8"
              >
                <Plus size={13} strokeWidth={2.2} />
                Add calendar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
