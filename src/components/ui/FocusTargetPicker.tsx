import { cn } from '@/lib/cn'
import type { FocusTargetId } from '@/vite-env'

const DEFAULT_TARGETS: { id: FocusTargetId; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'netflix', label: 'Netflix' },
  { id: 'discord', label: 'Discord' },
]

interface Props {
  selected: FocusTargetId[]
  onChange: (next: FocusTargetId[]) => void
  available?: { id: FocusTargetId; label: string }[]
  disabled?: boolean
  className?: string
}

export function FocusTargetPicker({ selected, onChange, available = DEFAULT_TARGETS, disabled, className }: Props) {
  const toggle = (id: FocusTargetId) => {
    if (disabled) return
    if (selected.includes(id)) {
      if (selected.length <= 1) return
      onChange(selected.filter((item) => item !== id))
      return
    }
    onChange([...selected, id])
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {available.map((item) => {
        const on = selected.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled || (on && selected.length <= 1)}
            onClick={() => toggle(item.id)}
            aria-pressed={on}
            className={cn(
              'h-8 rounded-[8px] px-3 text-[13px] font-medium transition-colors',
              on
                ? 'bg-accent-orange text-white'
                : 'bg-fill/10 text-secondary line-through decoration-fill/40 hover:bg-fill/15 hover:text-primary',
              disabled && 'opacity-60',
            )}
            title={on ? `Block ${item.label}` : `Allow ${item.label} during Focus`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export function defaultFocusTargets(): FocusTargetId[] {
  return DEFAULT_TARGETS.map((item) => item.id)
}
