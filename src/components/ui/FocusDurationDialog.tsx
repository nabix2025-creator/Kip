import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE } from '@/lib/constants'
import { endsAtFromLocalTime } from '@/lib/focusDuration'
import { cn } from '@/lib/cn'
import { TimeField } from '@/components/ui/TimeField'

const PRESETS = [
  { id: '25', label: '25m', minutes: 25 },
  { id: '45', label: '45m', minutes: 45 },
  { id: '60', label: '1h', minutes: 60 },
  { id: '120', label: '2h', minutes: 120 },
  { id: 'custom', label: 'Custom', minutes: null },
] as const

type PresetId = (typeof PRESETS)[number]['id']

export type FocusDurationChoice =
  | { minutes: number }
  | { endsAt: string }

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (choice: FocusDurationChoice) => void
}

export function FocusDurationDialog({ open, onClose, onConfirm }: Props) {
  const [preset, setPreset] = useState<PresetId>('25')
  const [customMinutes, setCustomMinutes] = useState('30')
  const [customMode, setCustomMode] = useState<'minutes' | 'until'>('minutes')
  const [untilTime, setUntilTime] = useState(() => defaultUntilTime())
  const [error, setError] = useState('')

  const start = () => {
    setError('')
    if (preset !== 'custom') {
      const found = PRESETS.find((item) => item.id === preset)
      if (found?.minutes) {
        onConfirm({ minutes: found.minutes })
        onClose()
      }
      return
    }
    if (customMode === 'minutes') {
      const minutes = Number(customMinutes)
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 24 * 60) {
        setError('Enter minutes between 1 and 1440.')
        return
      }
      onConfirm({ minutes: Math.round(minutes) })
      onClose()
      return
    }
    const endsAt = endsAtFromLocalTime(untilTime)
    if (!endsAt) {
      setError('Pick a valid end time.')
      return
    }
    onConfirm({ endsAt })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.button
            type="button"
            aria-label="Cancel"
            className="absolute inset-0"
            style={{ background: 'var(--scrim)' }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="focus-duration-title"
            className="glass relative z-10 w-full max-w-[360px] overflow-hidden rounded-[16px] p-5 shadow-sheet"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <h2 id="focus-duration-title" className="text-[17px] font-semibold tracking-[-0.02em]">
              Focus session
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">
              Pick how long Focus Mode stays locked. You can’t turn it off early.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreset(item.id)}
                  className={cn(
                    'h-8 rounded-[8px] px-3 text-[13px] font-medium transition-colors',
                    preset === item.id
                      ? 'bg-accent-orange text-white'
                      : 'bg-fill/10 text-secondary hover:bg-fill/15 hover:text-primary',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="mt-4 space-y-3">
                <div className="flex rounded-[8px] bg-fill/10 p-[2px]">
                  <button
                    type="button"
                    onClick={() => setCustomMode('minutes')}
                    className={cn(
                      'h-7 flex-1 rounded-[6px] text-[12px] font-medium',
                      customMode === 'minutes' ? 'bg-secondary text-primary shadow-[0_0.5px_1px_rgba(0,0,0,0.12)]' : 'text-secondary',
                    )}
                  >
                    Minutes
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomMode('until')}
                    className={cn(
                      'h-7 flex-1 rounded-[6px] text-[12px] font-medium',
                      customMode === 'until' ? 'bg-secondary text-primary shadow-[0_0.5px_1px_rgba(0,0,0,0.12)]' : 'text-secondary',
                    )}
                  >
                    Until
                  </button>
                </div>
                {customMode === 'minutes' ? (
                  <label className="block text-[13px] text-secondary">
                    Duration (minutes)
                    <input
                      className="field mt-1 w-full"
                      inputMode="numeric"
                      value={customMinutes}
                      onChange={(event) => setCustomMinutes(event.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                    />
                  </label>
                ) : (
                  <div>
                    <div className="mb-1 text-[13px] text-secondary">End time</div>
                    <TimeField value={untilTime} onChange={setUntilTime} label="End time" />
                  </div>
                )}
              </div>
            )}

            {error && <p className="mt-3 text-[12px] text-accent-orange">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 items-center rounded-[8px] px-3 text-[13px] font-medium text-secondary hover:bg-fill/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={start}
                className="flex h-8 items-center rounded-[8px] bg-accent-orange px-3 text-[13px] font-medium text-white"
              >
                Start Focus
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function defaultUntilTime(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() + 30)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
