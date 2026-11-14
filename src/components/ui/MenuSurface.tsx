import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export function useMenuOpen() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

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

  return { open, setOpen, triggerRef, panelRef }
}

export function MenuSurface({
  open,
  triggerRef,
  panelRef,
  align = 'start',
  width,
  className,
  children,
}: {
  open: boolean
  triggerRef: RefObject<HTMLElement>
  panelRef: RefObject<HTMLDivElement>
  align?: 'start' | 'end'
  width?: number
  className?: string
  children: ReactNode
}) {
  const [box, setBox] = useState({ top: 0, left: 0, width: 220 })

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const place = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const panelWidth = width ?? Math.max(rect.width, 180)
      const panelHeight = panelRef.current?.offsetHeight ?? 280
      const left = align === 'end' ? Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8) : Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8))
      const below = rect.bottom + 6
      const above = rect.top - panelHeight - 6
      const top = below + panelHeight > window.innerHeight - 8 && above > 8 ? above : below
      setBox({ top: Math.max(8, top), left: Math.max(8, left), width: panelWidth })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [align, open, panelRef, triggerRef, width])

  if (!open) return null

  return createPortal(
    <div
      ref={panelRef}
      className={cn(
        'fixed z-[120] overflow-hidden rounded-[12px] border border-divider bg-primary p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]',
        className,
      )}
      style={{ top: box.top, left: box.left, width: box.width }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  )
}

export function FieldTrigger({
  open,
  onClick,
  label,
  value,
  icon,
  className,
  triggerRef,
}: {
  open: boolean
  onClick: () => void
  label?: string
  value: string
  icon?: ReactNode
  className?: string
  triggerRef: RefObject<HTMLButtonElement>
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        'field flex w-full items-center gap-2 text-left transition-colors',
        open && 'border-accent-blue/45 bg-primary shadow-[0_0_0_3px_rgb(var(--accent-blue)/0.14)]',
        className,
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate text-[13px]">{value}</span>
      <ChevronMark open={open} />
    </button>
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
      <path d="M2.5 4.25 6 7.75l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
