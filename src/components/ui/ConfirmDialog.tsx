import { AnimatePresence, motion } from 'framer-motion'
import { EASE } from '@/lib/constants'
import { useConfirmStore } from '@/store/confirmStore'

export function ConfirmDialog() {
  const request = useConfirmStore((state) => state.request)
  const close = useConfirmStore((state) => state.close)

  return (
    <AnimatePresence>
      {request && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.button
            type="button"
            aria-label="Cancel"
            className="absolute inset-0"
            style={{ background: 'var(--scrim)' }}
            onClick={() => close(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="glass relative z-10 w-full max-w-[340px] overflow-hidden rounded-[16px] p-5 shadow-sheet"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <h2 id="confirm-title" className="text-[17px] font-semibold tracking-[-0.02em]">
              {request.title}
            </h2>
            {request.body && <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">{request.body}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex h-8 items-center rounded-[8px] px-3 text-[13px] font-medium text-secondary hover:bg-fill/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={
                  request.danger === false
                    ? 'flex h-8 items-center rounded-[8px] bg-accent-blue px-3 text-[13px] font-medium text-white'
                    : 'flex h-8 items-center rounded-[8px] bg-accent-red px-3 text-[13px] font-medium text-white'
                }
              >
                {request.confirmLabel ?? 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
