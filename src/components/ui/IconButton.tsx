import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  active?: boolean
  tone?: 'ghost' | 'solid'
}

export function IconButton({ children, className, active, tone = 'ghost', ...props }: Props) {
  return (
    <button
      className={cn(
        'no-drag flex h-7 w-7 items-center justify-center rounded-[7px] text-primary/70 transition-colors duration-120 ease-ios hover:bg-fill/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/35',
        tone === 'solid' && 'bg-accent-blue text-white shadow-card hover:bg-accent-blue hover:text-white hover:brightness-105',
        active && 'bg-fill/12 text-primary',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
