import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { cn } from '@/lib/cn'
import { useSettingsStore } from '@/store/settingsStore'

interface Props {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
  /** Kept for callers; picker always allows every minute. */
  step?: number
}

interface Parts {
  hour12: number
  hour24: number
  minute: number
  period: 'AM' | 'PM'
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const PANEL_H = 236

export function TimeField({ value, onChange, label, className }: Props) {
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState({ top: 0, left: 0, width: 210 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const parts = useMemo(() => parseValue(value), [value])
  const display = formatTimeLabel(value, timeFormat)
  const panelWidth = timeFormat === '24h' ? 168 : 210

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const place = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const below = rect.bottom + 6
      const above = rect.top - PANEL_H - 6
      const top = below + PANEL_H > window.innerHeight - 8 && above > 8 ? above : below
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelWidth - 8)
      setBox({ top: Math.max(8, top), left, width: panelWidth })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, panelWidth])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const commit = (next: Partial<Parts>) => {
    const hour12 = next.hour12 ?? parts.hour12
    const minute = next.minute ?? parts.minute
    const period = next.period ?? parts.period
    if (timeFormat === '24h' && next.hour24 !== undefined) {
      onChange(toValue24(next.hour24, minute))
      return
    }
    onChange(toValue12(hour12, minute, period))
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
        className={cn(
          'field flex w-full items-center gap-2 text-left',
          open && 'border-accent-blue/45 bg-primary shadow-[0_0_0_3px_rgb(var(--accent-blue)/0.14)]',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] tabular-nums">{display}</span>
        <ChevronMark open={open} />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[120] overflow-hidden rounded-[12px] border border-divider bg-primary p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
            style={{ top: box.top, left: box.left, width: box.width }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex gap-1">
              {timeFormat === '24h' ? (
                <Column
                  label="Hour"
                  items={HOURS_24}
                  active={parts.hour24}
                  format={(n) => String(n).padStart(2, '0')}
                  onPick={(hour24) => commit({ hour24, minute: parts.minute })}
                />
              ) : (
                <Column
                  label="Hour"
                  items={HOURS_12}
                  active={parts.hour12}
                  format={(n) => String(n)}
                  onPick={(hour12) => commit({ hour12 })}
                />
              )}
              <Column
                label="Min"
                items={MINUTES}
                active={parts.minute}
                format={(n) => String(n).padStart(2, '0')}
                onPick={(minute) => commit({ minute })}
              />
              {timeFormat === '12h' && (
                <Column
                  label="Period"
                  items={['AM', 'PM'] as const}
                  active={parts.period}
                  format={(n) => String(n)}
                  onPick={(period) => commit({ period })}
                />
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

function Column<T extends string | number>({
  label,
  items,
  active,
  format,
  onPick,
}: {
  label: string
  items: readonly T[]
  active: T
  format: (value: T) => string
  onPick: (value: T) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    node?.scrollIntoView({ block: 'center' })
  }, [active])

  return (
    <div className="min-w-0 flex-1">
      <div className="px-1 pb-1 text-center text-[10px] font-semibold tracking-[0.06em] text-tertiary">{label}</div>
      <div ref={listRef} className="max-h-[196px] overflow-auto rounded-[9px] bg-fill/[0.06] py-0.5">
        {items.map((item) => {
          const selected = item === active
          return (
            <button
              key={String(item)}
              type="button"
              data-active={selected ? 'true' : undefined}
              onClick={() => onPick(item)}
              className={cn(
                'flex h-7 w-full items-center justify-center rounded-[7px] text-[13px] tabular-nums transition-colors',
                selected ? 'bg-accent-blue font-semibold text-white' : 'text-primary hover:bg-fill/10',
              )}
            >
              {format(item)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ChevronMark({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className={cn('shrink-0 text-tertiary transition-transform duration-150', open && 'rotate-180')}
      aria-hidden
    >
      <path
        d="M2.5 4.25 6 7.75l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function parseValue(value: string): Parts {
  const [rawHour, rawMinute] = value.split(':').map(Number)
  const hour24 = Number.isFinite(rawHour) ? Math.min(23, Math.max(0, rawHour)) : 9
  const minute = Number.isFinite(rawMinute) ? Math.min(59, Math.max(0, rawMinute)) : 0
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour12, hour24, minute, period }
}

function toValue12(hour12: number, minute: number, period: 'AM' | 'PM') {
  let hour24 = hour12 % 12
  if (period === 'PM') hour24 += 12
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function toValue24(hour24: number, minute: number) {
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatTimeLabel(value: string, timeFormat: '12h' | '24h') {
  const [hour, minute] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(hour || 0, minute || 0, 0, 0)
  return format(date, timeFormat === '12h' ? 'h:mm a' : 'HH:mm')
}
