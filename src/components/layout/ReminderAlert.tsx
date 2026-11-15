import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { EASE } from '@/lib/constants'
import { useTheme } from '@/hooks/useTheme'

interface AlertPayload {
  title: string
  body: string
  start?: string
  time?: string
}

function playCoolChime(): void {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.03)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.1)
    master.connect(ctx.destination)

    const notes: [number, number, number][] = [
      [523.25, 0, 0.28],
      [659.25, 0.1, 0.32],
      [783.99, 0.22, 0.45],
      [1046.5, 0.38, 0.55],
    ]

    for (const [freq, offset, dur] of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.7, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur)
      osc.connect(gain)
      gain.connect(master)
      osc.start(now + offset)
      osc.stop(now + offset + dur + 0.05)
    }

    window.setTimeout(() => void ctx.close(), 1400)
  } catch {
    // Audio may be blocked; popup still shows.
  }
}

export function ReminderAlert() {
  const theme = useTheme()
  const [alert, setAlert] = useState<AlertPayload | null>(null)
  const dark = theme === 'dark'

  useEffect(() => {
    let playedFor = ''
    const unsub = window.api?.onReminderAlert((payload) => {
      const key = `${payload.title}|${payload.body}|${payload.start ?? ''}|${payload.time ?? ''}`
      setAlert(payload)
      if (playedFor !== key) {
        playedFor = key
        playCoolChime()
      }
    })
    window.api?.reminderReady()
    return unsub
  }, [])

  if (!alert) {
    return <div className="h-full w-full bg-transparent" />
  }

  const timeLabel = alert.time || alert.body

  return (
    <button
      type="button"
      className="flex h-full w-full cursor-pointer items-center justify-center bg-transparent p-5 outline-none"
      onClick={() => window.api?.dismissReminder()}
      aria-label="Dismiss reminder"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="w-full"
        style={{
          filter: dark
            ? 'drop-shadow(0 18px 36px rgba(0,0,0,0.45))'
            : 'drop-shadow(0 16px 32px rgba(0,0,0,0.16))',
        }}
      >
        <div
          className={`overflow-hidden rounded-[28px] px-8 py-8 text-center backdrop-blur-[40px] backdrop-saturate-[180%] ${
            dark
              ? 'border border-white/10 bg-[rgba(44,44,46,0.92)]'
              : 'border border-black/[0.06] bg-[rgba(255,255,255,0.94)]'
          }`}
        >
          <div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
              dark ? 'bg-[#0A84FF]/20 text-[#64D2FF]' : 'bg-[#0A84FF]/12 text-[#0A84FF]'
            }`}
          >
            <Bell size={24} strokeWidth={2.2} />
          </div>
          <div className={`text-[11px] font-semibold tracking-[0.18em] ${dark ? 'text-white/45' : 'text-[#8E8E93]'}`}>
            REMINDER
          </div>
          <div
            className={`mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] ${
              dark ? 'text-white' : 'text-[#1C1C1E]'
            }`}
          >
            {alert.title}
          </div>
          <div className={`mt-2 text-[15px] font-medium ${dark ? 'text-white/65' : 'text-[#636366]'}`}>{timeLabel}</div>
          <div className={`mt-5 text-[11px] tracking-wide ${dark ? 'text-white/35' : 'text-[#AEAEB2]'}`}>Click to dismiss</div>
        </div>
      </motion.div>
    </button>
  )
}
