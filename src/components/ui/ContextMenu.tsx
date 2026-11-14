import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export interface MenuItem {
  label: string
  danger?: boolean
  onClick: () => void
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  useEffect(() => {
    const close = () => onClose()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const left = Math.min(x, window.innerWidth - 228)
  const top = Math.min(y, window.innerHeight - items.length * 42 - 20)

  return createPortal(
    <div className="glass fixed z-[80] min-w-[220px] overflow-hidden p-1.5 shadow-sheet" style={{ left, top }} onPointerDown={(event) => event.stopPropagation()}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={cn(
            'flex w-full rounded-[10px] px-3 py-2.5 text-left text-[14px] tracking-[-0.01em] transition-colors hover:bg-fill/12',
            item.danger ? 'text-accent-red hover:bg-accent-red/10' : 'text-primary',
          )}
          onClick={() => {
            item.onClick()
            onClose()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
