import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { EASE } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import { WindowControls } from '@/components/layout/WindowControls'

export function LoginScreen() {
  const busy = useAuthStore((state) => state.busy)
  const error = useAuthStore((state) => state.error)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)

  return (
    <div className="app-shell relative flex min-h-0 overflow-hidden bg-primary text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-accent-blue/20 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[480px] w-[480px] rounded-full bg-[#AF52DE]/16 blur-3xl" />
      </div>

      <div className="chrome absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-3">
        <WindowControls />
        <div className="drag h-full flex-1" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="glass w-full max-w-[420px] p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.3, ease: EASE }}
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-accent-blue text-white shadow-[0_12px_30px_rgba(10,132,255,0.35)]"
          >
            <CalendarDays size={30} strokeWidth={2.2} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.28, ease: EASE }}
            className="text-[34px] font-bold tracking-[-0.04em]"
          >
            Kip
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.28, ease: EASE }}
            className="mt-2 text-[15px] leading-relaxed text-secondary"
          >
            Your calendar, reminders, and life desks — synced with your Google account.
          </motion.p>

          <motion.button
            type="button"
            disabled={busy}
            onClick={() => void signInWithGoogle()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.28, ease: EASE }}
            whileTap={{ scale: 0.98 }}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#1C1C1E] text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            <GoogleMark />
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </motion.button>

          {error && <div className="mt-4 text-[13px] text-accent-red">{error}</div>}

          <p className="mt-6 text-[12px] text-tertiary">A browser window opens for Google. After login, Kip returns automatically.</p>
        </motion.div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.1 4 9.2 8.5 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.1 39.5 16 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.8 39.2 44 34 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  )
}
