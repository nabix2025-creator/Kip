import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, User } from '@supabase/supabase-js'
import { AUTH_REDIRECT, getSupabase, hasSupabaseConfig } from '@/lib/supabase'
import { bindLocalDataToUser } from '@/lib/userData'

export interface UserProfile {
  id: string
  email: string | null
  displayName: string
  age: number | null
  city: string
  timezone: string
  onboarded: boolean
}

interface AuthState {
  ready: boolean
  session: Session | null
  user: User | null
  profile: UserProfile | null
  error: string | null
  busy: boolean
  bootstrap: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  handleAuthUrl: (url: string) => Promise<void>
  signOut: () => Promise<void>
  saveProfile: (patch: Partial<Pick<UserProfile, 'displayName' | 'age' | 'city' | 'timezone' | 'onboarded'>>) => Promise<void>
  clearError: () => void
}

function mapProfile(row: Record<string, unknown> | null | undefined, user: User): UserProfile {
  return {
    id: user.id,
    email: user.email ?? (typeof row?.email === 'string' ? row.email : null),
    displayName:
      (typeof row?.display_name === 'string' && row.display_name) ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      (user.email?.split('@')[0] ?? 'Friend'),
    age: typeof row?.age === 'number' ? row.age : null,
    city: typeof row?.city === 'string' ? row.city : '',
    timezone: typeof row?.timezone === 'string' && row.timezone ? row.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
    onboarded: Boolean(row?.onboarded),
  }
}

async function fetchProfile(user: User): Promise<UserProfile> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  if (!data) {
    const seed = mapProfile(null, user)
    const { error: insertError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: seed.email,
      display_name: seed.displayName,
      timezone: seed.timezone,
      onboarded: false,
      updated_at: new Date().toISOString(),
    })
    if (insertError) throw insertError
    return seed
  }
  return mapProfile(data as Record<string, unknown>, user)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ready: false,
      session: null,
      user: null,
      profile: null,
      error: null,
      busy: false,
      clearError: () => set({ error: null }),
      bootstrap: async () => {
        if (!hasSupabaseConfig()) {
          set({ ready: true, session: null, user: null, profile: null })
          return
        }
        try {
          const supabase = getSupabase()
          const { data } = await supabase.auth.getSession()
          const session = data.session
          if (!session?.user) {
            set({ ready: true, session: null, user: null, profile: null })
            return
          }
          const profile = await fetchProfile(session.user)
          bindLocalDataToUser(session.user.id, profile.onboarded)
          set({ ready: true, session, user: session.user, profile, error: null })
        } catch (error) {
          set({
            ready: true,
            error: error instanceof Error ? error.message : 'Could not restore session',
          })
        }
      },
      signInWithGoogle: async () => {
        if (!hasSupabaseConfig()) {
          set({ error: 'Supabase keys missing in .env' })
          return
        }
        set({ busy: true, error: null })
        try {
          const supabase = getSupabase()
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: AUTH_REDIRECT,
              skipBrowserRedirect: true,
              queryParams: { prompt: 'select_account' },
            },
          })
          if (error) throw error
          if (!data.url) throw new Error('No Google auth URL returned')
          if (window.api?.openExternal) await window.api.openExternal(data.url)
          else window.open(data.url, '_blank', 'noopener,noreferrer')
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Google sign-in failed' })
        } finally {
          set({ busy: false })
        }
      },
      handleAuthUrl: async (url) => {
        if (!hasSupabaseConfig()) return
        set({ busy: true, error: null })
        try {
          const supabase = getSupabase()
          const parsed = new URL(url.replace('kip://', 'https://kip.local/'))
          const code = parsed.searchParams.get('code')
          const accessToken = parsed.searchParams.get('access_token') || parsed.hash.match(/access_token=([^&]+)/)?.[1]
          const refreshToken = parsed.searchParams.get('refresh_token') || parsed.hash.match(/refresh_token=([^&]+)/)?.[1]

          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) throw error
          } else if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            if (error) throw error
          } else {
            throw new Error('Auth callback missing code/tokens')
          }

          const { data } = await supabase.auth.getSession()
          if (!data.session?.user) throw new Error('No session after Google login')
          const profile = await fetchProfile(data.session.user)
          bindLocalDataToUser(data.session.user.id, profile.onboarded)
          set({ session: data.session, user: data.session.user, profile, ready: true })
          window.api?.focusMain?.()
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Could not finish Google login' })
        } finally {
          set({ busy: false })
        }
      },
      signOut: async () => {
        if (!hasSupabaseConfig()) {
          set({ session: null, user: null, profile: null })
          return
        }
        set({ busy: true, error: null })
        try {
          await getSupabase().auth.signOut()
          set({ session: null, user: null, profile: null })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Sign out failed' })
        } finally {
          set({ busy: false })
        }
      },
      saveProfile: async (patch) => {
        const user = get().user
        const current = get().profile
        if (!user || !current) return
        set({ busy: true, error: null })
        try {
          const next: UserProfile = {
            ...current,
            displayName: patch.displayName?.trim() || current.displayName,
            age: patch.age === undefined ? current.age : patch.age,
            city: patch.city === undefined ? current.city : patch.city.trim(),
            timezone: patch.timezone || current.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            onboarded: patch.onboarded ?? current.onboarded,
          }
          const { error } = await getSupabase()
            .from('profiles')
            .upsert({
              id: user.id,
              email: next.email,
              display_name: next.displayName,
              age: next.age,
              city: next.city,
              timezone: next.timezone,
              onboarded: next.onboarded,
              updated_at: new Date().toISOString(),
            })
          if (error) throw error
          set({ profile: next })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Could not save profile' })
          throw error
        } finally {
          set({ busy: false })
        }
      },
    }),
    {
      name: 'kip-auth',
      partialize: (state) => ({ profile: state.profile }),
    },
  ),
)
