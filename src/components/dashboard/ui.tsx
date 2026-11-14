import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { DashPriority } from '@/store/dashboardStore'

export const PRIORITY: Record<DashPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#34C759' },
  medium: { label: 'Medium', color: '#FF9500' },
  high: { label: 'High', color: '#FF3B30' },
}

export const NOTE_COLORS = ['#FFCC00', '#34C759', '#64D2FF', '#FF2D55', '#BF5AF2', '#FF9F0A']

export function RemoveButton({
  label,
  onClick,
  confirmTitle,
  confirmBody,
}: {
  label: string
  onClick: () => void
  confirmTitle?: string
  confirmBody?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        void import('@/store/confirmStore').then(({ askConfirm }) =>
          askConfirm({
            title: confirmTitle ?? label,
            body: confirmBody ?? 'This cannot be undone.',
            confirmLabel: 'Delete',
          }).then((ok) => {
            if (ok) onClick()
          }),
        )
      }}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-tertiary hover:bg-fill/10 hover:text-primary"
    >
      <X size={13} />
    </button>
  )
}

export function CheckDot({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150',
        checked ? 'border-accent-blue bg-accent-blue text-white' : 'border-fill/35 hover:border-accent-blue/70',
      )}
    >
      {checked && <Check size={11} strokeWidth={3} />}
    </button>
  )
}

export function EmptyCopy({ children }: { children: ReactNode }) {
  return <p className="px-1 py-6 text-center text-[12px] leading-relaxed text-tertiary">{children}</p>
}

export function PriorityDots({ value, onChange }: { value: DashPriority; onChange: (priority: DashPriority) => void }) {
  return (
    <div className="flex gap-1">
      {(Object.keys(PRIORITY) as DashPriority[]).map((priority) => {
        const active = value === priority
        return (
          <button
            key={priority}
            type="button"
            onClick={() => onChange(priority)}
            className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium', active ? 'bg-fill/10 text-primary' : 'text-tertiary hover:text-secondary')}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY[priority].color }} />
            {PRIORITY[priority].label}
          </button>
        )
      })}
    </div>
  )
}

export function combineDateTime(date: string, time: string): string | null {
  if (!date) return null
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = (time || '09:00').split(':').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0).toISOString()
}

export function withProtocol(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
