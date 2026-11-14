import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { FieldTrigger, MenuSurface, useMenuOpen } from '@/components/ui/MenuSurface'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  hint?: string
  color?: string
}

interface Props<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  label?: string
  placeholder?: string
  className?: string
  menuWidth?: number
}

export function Select<T extends string>({ value, options, onChange, label, placeholder = 'Choose', className, menuWidth }: Props<T>) {
  const { open, setOpen, triggerRef, panelRef } = useMenuOpen()
  const current = options.find((option) => option.value === value)
  const display = current?.label ?? placeholder

  return (
    <>
      <FieldTrigger
        triggerRef={triggerRef}
        open={open}
        label={label}
        value={display}
        className={className}
        icon={current?.color ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: current.color }} /> : undefined}
        onClick={() => setOpen((state) => !state)}
      />
      <MenuSurface open={open} triggerRef={triggerRef} panelRef={panelRef} width={menuWidth}>
        <div className="max-h-64 overflow-auto py-0.5">
          {options.map((option) => {
            const active = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left transition-colors',
                  active ? 'bg-accent-blue text-white' : 'hover:bg-fill/10',
                )}
              >
                {option.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: option.color }} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{option.label}</span>
                  {option.hint && <span className={cn('block truncate text-[11px]', active ? 'text-white/75' : 'text-tertiary')}>{option.hint}</span>}
                </span>
                {active && <Check size={14} strokeWidth={2.4} className="shrink-0" />}
              </button>
            )
          })}
        </div>
      </MenuSurface>
    </>
  )
}

export function MenuItemButton({
  active,
  onClick,
  children,
  trailing,
}: {
  active?: boolean
  onClick: () => void
  children: ReactNode
  trailing?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors',
        active ? 'bg-accent-blue font-medium text-white' : 'hover:bg-fill/10',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </button>
  )
}
