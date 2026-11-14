import { useEffect } from 'react'
import { isAlertWindow, isTrayWindow } from '@/lib/env'
import { getSupabase, hasSupabaseConfig } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function useAuth(): void {
  const bootstrap = useAuthStore((state) => state.bootstrap)

  useEffect(() => {
    if (isTrayWindow() || isAlertWindow()) return
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (isTrayWindow() || isAlertWindow() || !hasSupabaseConfig()) return
    const supabase = getSupabase()
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        useAuthStore.setState({ session: null, user: null, profile: null })
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isTrayWindow() || isAlertWindow()) return
    return window.api?.onAuthCallback((url) => {
      void useAuthStore.getState().handleAuthUrl(url)
    })
  }, [])
}
