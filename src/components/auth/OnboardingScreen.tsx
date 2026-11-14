import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EASE } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { WindowControls } from '@/components/layout/WindowControls'

const steps = ['name', 'age', 'city'] as const

export function OnboardingScreen() {
  const profile = useAuthStore((state) => state.profile)
  const busy = useAuthStore((state) => state.busy)
  const error = useAuthStore((state) => state.error)
  const saveProfile = useAuthStore((state) => state.saveProfile)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(profile?.displayName ?? '')
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '')
  const [city, setCity] = useState(profile?.city || useSettingsStore.getState().weatherCity || '')

  const title = useMemo(() => {
    if (step === 0) return 'What should we call you?'
    if (step === 1) return 'How old are you?'
    return 'Where are you based?'
  }, [step])

  const subtitle = useMemo(() => {
    if (step === 0) return 'This shows on your Kip profile and greetings.'
    if (step === 1) return 'Helps personalize reminders and life desks.'
    return 'Used for weather and local suggestions. You can change it later.'
  }, [step])

  const next = async () => {
    if (step === 0) {
      if (!name.trim()) return
      setStep(1)
      return
    }
    if (step === 1) {
      const value = Number(age)
      if (!value || value < 5 || value > 120) return
      setStep(2)
      return
    }
    const value = Number(age)
    await saveProfile({
      displayName: name.trim(),
      age: value,
      city: city.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      onboarded: true,
    })
    if (city.trim()) useSettingsStore.getState().setWeatherCity(city.trim())
  }

  return (
    <div className="app-shell relative flex min-h-0 overflow-hidden bg-primary text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(10,132,255,0.16),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(175,82,222,0.14),transparent_42%)]" />
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
        <div className="glass w-full max-w-[460px] p-8">
          <div className="mb-6 flex gap-2">
            {steps.map((item, index) => (
              <div key={item} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-accent-blue' : 'bg-fill/20'}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <div className="text-[12px] font-semibold tracking-[0.14em] text-tertiary">SETUP {step + 1}/3</div>
              <h1 className="mt-2 text-[28px] font-bold tracking-[-0.03em]">{title}</h1>
              <p className="mt-2 text-[14px] text-secondary">{subtitle}</p>

              {step === 0 && (
                <input
                  autoFocus
                  className="field mt-6 w-full text-[16px]"
                  value={name}
                  placeholder="Your name"
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void next()
                  }}
                />
              )}
              {step === 1 && (
                <input
                  autoFocus
                  className="field mt-6 w-full text-[16px]"
                  inputMode="numeric"
                  value={age}
                  placeholder="Age"
                  onChange={(event) => setAge(event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void next()
                  }}
                />
              )}
              {step === 2 && (
                <input
                  autoFocus
                  className="field mt-6 w-full text-[16px]"
                  value={city}
                  placeholder="City (optional)"
                  onChange={(event) => setCity(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void next()
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {error && <div className="mt-4 text-[13px] text-accent-red">{error}</div>}

          <div className="mt-8 flex gap-2">
            {step > 0 && (
              <button type="button" className="h-11 flex-1 rounded-2xl bg-tertiary text-[14px] font-semibold" onClick={() => setStep((value) => value - 1)}>
                Back
              </button>
            )}
            <button
              type="button"
              disabled={busy || (step === 0 && !name.trim()) || (step === 1 && (!Number(age) || Number(age) < 5))}
              className="h-11 flex-[1.4] rounded-2xl bg-accent-blue text-[14px] font-semibold text-white disabled:opacity-50"
              onClick={() => void next()}
            >
              {step === 2 ? (busy ? 'Saving…' : 'Finish setup') : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
