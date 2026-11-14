import { cn } from '@/lib/cn'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[31px] w-[51px] shrink-0 rounded-full p-[2px] transition-colors duration-200 ease-ios',
        checked ? 'bg-accent-green' : 'bg-fill/32',
      )}
    >
      <span
        className={cn(
          'block h-[27px] w-[27px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.28),0_2px_1px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-ios',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}
