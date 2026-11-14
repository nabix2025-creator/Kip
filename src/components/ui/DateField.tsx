import { addMonths, format, isSameDay, isSameMonth, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { getMonthGrid, parseDateKey, toDateKey, weekdayLabels } from '@/lib/dates'
import { useSettingsStore } from '@/store/settingsStore'
import { FieldTrigger, MenuSurface, useMenuOpen } from '@/components/ui/MenuSurface'

interface Props {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
  display?: 'short' | 'long'
}

export function DateField({ value, onChange, label, className, display = 'short' }: Props) {
  const weekStartsOn = useSettingsStore((state) => state.weekStartsOn)
  const { open, setOpen, triggerRef, panelRef } = useMenuOpen()
  const selected = value ? parseDateKey(value) : new Date()
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const grid = getMonthGrid(month, weekStartsOn)
  const labels = weekdayLabels(weekStartsOn)
  const text = value
    ? format(selected, display === 'long' ? 'EEE, MMM d, yyyy' : 'MMM d, yyyy')
    : 'Pick a date'

  useEffect(() => {
    if (!open || !value) return
    setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
  }, [open, value])

  return (
    <>
      <FieldTrigger
        triggerRef={triggerRef}
        open={open}
        label={label}
        value={text}
        className={className}
        onClick={() => setOpen((state) => !state)}
      />
      <MenuSurface open={open} triggerRef={triggerRef} panelRef={panelRef} width={276} className="p-2.5">
        <div className="mb-2 flex items-center justify-between px-0.5">
          <div className="text-[13px] font-semibold tracking-[-0.01em]">{format(month, 'MMMM yyyy')}</div>
          <div className="flex gap-0.5">
            <NavButton label="Previous month" onClick={() => setMonth((current) => addMonths(current, -1))}>
              <ChevronLeft size={14} strokeWidth={1.8} />
            </NavButton>
            <NavButton label="Next month" onClick={() => setMonth((current) => addMonths(current, 1))}>
              <ChevronRight size={14} strokeWidth={1.8} />
            </NavButton>
          </div>
        </div>
        <div className="mb-1 grid grid-cols-7 text-center">
          {labels.map((item) => (
            <div key={item} className="pb-1 text-[10px] font-medium text-tertiary">
              {item.slice(0, 1)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day) => {
            const key = toDateKey(day)
            const inMonth = isSameMonth(day, month)
            const today = isToday(day)
            const active = value ? isSameDay(day, selected) : false
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key)
                  setOpen(false)
                }}
                className="flex h-8 items-center justify-center"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium tracking-[-0.02em] transition-colors',
                    !inMonth && 'text-tertiary',
                    inMonth && !today && !active && 'hover:bg-fill/10',
                    today && !active && 'bg-accent-red font-semibold text-white',
                    active && !today && 'bg-accent-blue font-semibold text-white',
                    active && today && 'bg-accent-red font-semibold text-white',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-divider pt-2">
          <button
            type="button"
            className="rounded-full px-2.5 py-1 text-[12px] font-medium text-accent-blue hover:bg-fill/10"
            onClick={() => {
              onChange(toDateKey(new Date()))
              setOpen(false)
            }}
          >
            Today
          </button>
          <button type="button" className="rounded-full px-2.5 py-1 text-[12px] font-medium text-secondary hover:bg-fill/10" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </MenuSurface>
    </>
  )
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex h-6 w-6 items-center justify-center rounded text-secondary hover:bg-fill/10 hover:text-primary">
      {children}
    </button>
  )
}
