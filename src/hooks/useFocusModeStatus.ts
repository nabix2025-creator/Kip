import { useEffect, useState } from 'react'
import type { FocusModeStatus } from '@/vite-env'

/** Live Focus Mode status: initial fetch, push updates, and 1s tick while a session is active. */
export function useFocusModeStatus(): [FocusModeStatus | null, (next: FocusModeStatus | null) => void] {
  const [status, setStatus] = useState<FocusModeStatus | null>(null)

  useEffect(() => {
    if (!window.api?.focusModeGet) return
    void window.api.focusModeGet().then(setStatus).catch(() => undefined)
    const unsub = window.api.onFocusModeUpdated?.((next) => setStatus(next as FocusModeStatus))
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!status?.enabled || !status.endsAt) return
    const tick = () => {
      const ends = new Date(status.endsAt!).getTime()
      const remainingMs = Math.max(0, ends - Date.now())
      setStatus((prev) => (prev ? { ...prev, remainingMs } : prev))
      if (remainingMs <= 0 && window.api?.focusModeGet) {
        void window.api.focusModeGet().then(setStatus).catch(() => undefined)
      }
    }
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [status?.enabled, status?.endsAt])

  return [status, setStatus]
}
