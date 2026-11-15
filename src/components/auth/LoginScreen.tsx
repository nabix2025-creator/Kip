import { motion } from 'framer-motion'
import { EASE } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import { WindowControls } from '@/components/layout/WindowControls'
import kipMark from '@/assets/kip-mark.png'

const enter = {
  initial: { opacity: 0, y: 16, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

export function LoginScreen() {
  const busy = useAuthStore((state) => state.busy)
  const error = useAuthStore((state) => state.error)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)

  return (
    <div
      data-theme="dark"
      className="app-shell relative flex min-h-0 overflow-hidden bg-[#0B0B0D] text-primary"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute -left-[18%] -top-[22%] h-[58vmax] w-[58vmax] rounded-full bg-accent-blue/25 blur-[110px]"
          animate={{ x: [0, 28, 0], y: [0, 18, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-[28%] -right-[12%] h-[52vmax] w-[52vmax] rounded-full bg-[#5AC8FA]/14 blur-[120px]"
          animate={{ x: [0, -22, 0], y: [0, -16, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.55) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 18%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 18%, transparent 72%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 42%, transparent 0%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.82) 100%)',
          }}
        />
      </div>

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

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-[46px]">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="glass w-full max-w-[400px] overflow-hidden rounded-[28px] p-8 shadow-[var(--shadow-sheet)]"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              {...enter}
              transition={{ duration: 0.4, ease: EASE, delay: 0.04 }}
              className="relative mb-6"
            >
              <div className="absolute inset-0 rounded-[22px] bg-accent-blue/35 blur-2xl" />
              <div className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[22px] bg-black shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
                <img src={kipMark} alt="" className="h-full w-full object-cover" draggable={false} />
              </div>
            </motion.div>

            <motion.h1
              {...enter}
              transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
              className="text-[34px] font-bold leading-none tracking-[-0.045em]"
            >
              Kip
            </motion.h1>

            <motion.p
              {...enter}
              transition={{ duration: 0.4, ease: EASE, delay: 0.16 }}
              className="mt-3 max-w-[26ch] text-[14px] leading-5 text-secondary"
            >
              Your days, desks, and plans — quietly in one place.
            </motion.p>

            <motion.button
              {...enter}
              transition={{ duration: 0.4, ease: EASE, delay: 0.22 }}
              type="button"
              disabled={busy}
              onClick={() => void signInWithGoogle()}
              className="group relative mt-8 flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white text-[15px] font-semibold text-[#1C1C1E] transition hover:brightness-[0.97] active:scale-[0.985] disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white to-[#F2F2F7] opacity-100" />
              <span className="relative flex items-center gap-3">
                <GoogleMark />
                {busy ? 'Opening Google…' : 'Continue with Google'}
              </span>
            </motion.button>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 w-full rounded-xl bg-accent-red/15 px-3 py-2 text-[13px] text-accent-red"
              >
                {error}
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
          className="mt-6 text-[12px] text-tertiary"
        >
          Sign in to sync across your devices
        </motion.p>
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
