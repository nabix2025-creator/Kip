import { AnimatePresence, motion } from 'framer-motion'
import { useCalendarStore } from '@/store/calendarStore'

export function Toasts() {
  const toasts = useCalendarStore((state) => state.toasts)
  const dismiss = useCalendarStore((state) => state.dismissToast)
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex w-[min(360px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="pointer-events-auto glass rounded-pill px-5 py-3 text-center text-[15px] font-medium tracking-[-0.01em] text-primary shadow-sheet"
          >
            <span className={toast.tone === 'error' ? 'text-accent-red' : ''}>{toast.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
