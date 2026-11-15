import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { toneDot, toneText, toneWash, type DashTone } from '@/components/dashboard/tones'

export type DeskId =
  | 'today'
  | 'projects'
  | 'finance'
  | 'habits'
  | 'goals'
  | 'routines'
  | 'focus'
  | 'review'
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

export function Panel({ children, className, tone }: { children: ReactNode; className?: string; tone?: DashTone }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[14px] bg-primary shadow-card',
        tone && 'ring-1 ring-inset ring-black/[0.03]',
        className,
      )}
    >
      {tone && <div aria-hidden className={cn('pointer-events-none absolute inset-x-0 top-0 h-10', toneWash[tone])} />}
      <div className="relative">{children}</div>
    </div>
  )
}

export function PanelLabel({ children, aside, tone }: { children: ReactNode; aside?: ReactNode; tone?: DashTone }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-3 px-3 pt-3">
      <h2 className={cn('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]', tone ? toneText[tone] : 'text-tertiary')}>
        {tone && <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', toneDot[tone])} />}
        {children}
      </h2>
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
