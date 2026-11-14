import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type DeskId =
  | 'today'
  | 'projects'
  | 'finance'
  | 'habits'
  | 'goals'
  | 'notes'
  | 'journal'
  | 'library'
  | 'news'
  | 'links'
  | 'wishlist'

export function Desk({
  title,
  detail,
  extra,
  children,
}: {
  title: string
  detail?: string
  extra?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-end justify-between gap-4 px-6 pb-3 pt-5">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-[-0.03em]">{title}</h1>
          {detail && <p className="mt-0.5 truncate text-[12px] text-secondary">{detail}</p>}
        </div>
        {extra}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        <div className="flex min-h-full flex-col">{children}</div>
      </div>
    </div>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[14px] bg-primary shadow-card', className)}>{children}</div>
}

export function PanelLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-3 px-3 pt-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">{children}</h2>
      {aside}
    </div>
  )
}

export function taka(amount: number) {
  const abs = Math.abs(amount)
  const digits = Number.isInteger(abs) ? 0 : 2
  const body = new Intl.NumberFormat('en-BD', { minimumFractionDigits: digits, maximumFractionDigits: 2 }).format(abs)
  return `${amount < 0 ? '−' : ''}Tk ${body}`
}

export function readPrice(price: string): number | null {
  const match = price.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}
