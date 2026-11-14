import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { EASE } from '@/lib/constants'
import type { Anchor } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: number
  anchor?: Anchor
}

function clampAnchor(anchor: Anchor, width: number, height: number) {
  const maxLeft = Math.max(12, window.innerWidth - width - 12)
  const maxTop = Math.max(12, window.innerHeight - height - 12)
  let left = Math.min(Math.max(12, anchor.x), maxLeft)
  let top = anchor.y
  if (top + height > window.innerHeight - 12) top = Math.max(12, anchor.y - height)
  top = Math.min(Math.max(12, top), maxTop)
  return { left, top }
}

export function Modal({ open, onClose, children, width = 480, anchor }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(() =>
    anchor ? clampAnchor(anchor, width, Math.min(520, window.innerHeight - 24)) : null,
  )

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPos(null)
      return
    }
    const place = () => {
      const measured = sheetRef.current?.offsetHeight || Math.min(520, window.innerHeight - 24)
      setPos(clampAnchor(anchor, width, measured))
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, anchor, width])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0"
            style={{ background: 'var(--scrim)' }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          />
          <div className={anchor ? '' : 'flex h-full items-center justify-center p-6'}>
            <motion.div
              ref={sheetRef}
              role="dialog"
              className="glass no-drag relative z-10 max-h-[calc(100vh-24px)] overflow-auto rounded-sheet shadow-sheet"
              style={
                anchor
                  ? {
                      position: 'fixed',
                      left: (pos ?? clampAnchor(anchor, width, Math.min(520, window.innerHeight - 24))).left,
                      top: (pos ?? clampAnchor(anchor, width, Math.min(520, window.innerHeight - 24))).top,
                      width,
                      transformOrigin: 'top left',
                      borderRadius: 16,
                    }
                  : { width, maxWidth: '100%', transformOrigin: 'center' }
              }
              initial={{ opacity: 0, scale: 0.92, y: anchor ? 0 : 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: anchor ? 0 : 8 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
