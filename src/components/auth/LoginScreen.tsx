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
      <div className="pointer-events-none absolute -left-20 top-[-8%] h-[380px] w-[380px] rounded-full bg-accent-blue/15 blur-3xl" />

      <header
        className="chrome drag absolute inset-x-0 top-0 z-30 flex h-[46px] shrink-0 items-center px-2"
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest('button')) return
          window.api?.maximize()
        }}
      >
        <div className="drag h-full min-w-0 flex-1" />
        <div className="no-drag ml-auto">
          <WindowControls />
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pt-[46px]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="w-full max-w-[360px] text-center"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent-blue text-white">
            <CalendarDays size={26} strokeWidth={2.2} />
          </div>
          <h1 className="text-[32px] font-bold tracking-[-0.04em]">Kip</h1>

          <button
            type="button"
            disabled={busy}
            onClick={() => void signInWithGoogle()}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#1C1C1E] text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            <GoogleMark />
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>

          {error && <div className="mt-4 text-[13px] text-accent-red">{error}</div>}
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
