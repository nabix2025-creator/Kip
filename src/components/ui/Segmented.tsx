import { cn } from '@/lib/cn'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  className?: string
}

export function Segmented<T extends string>({ value, options, onChange, className }: Props<T>) {
  return (
    <div className={cn('no-drag flex rounded-[8px] bg-fill/10 p-[2px]', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'h-[24px] rounded-[6px] px-3 text-[12px] font-medium tracking-[-0.01em] text-secondary transition-all duration-150 ease-ios',
              active && 'bg-secondary text-primary shadow-[0_0.5px_1px_rgba(0,0,0,0.12)]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
