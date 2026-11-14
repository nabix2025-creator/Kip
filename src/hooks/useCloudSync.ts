import { useEffect, useRef } from 'react'
import { isAlertWindow, isTrayWindow } from '@/lib/env'
import { getSupabase, hasSupabaseConfig } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useTaskStore } from '@/store/taskStore'
import { useReminderStore } from '@/store/reminderStore'

const STAMP_KEY = 'kip-cloud-sync-at'
const ORIGIN_KEY = 'kip-client-id'

function originId(): string {
  const existing = localStorage.getItem(ORIGIN_KEY)
  if (existing) return existing
  const next = crypto.randomUUID()
  localStorage.setItem(ORIGIN_KEY, next)
  return next
}

function snapshot() {
  return {
    events: useEventStore.getState().events,
    tasks: useTaskStore.getState().tasks,
    lists: useTaskStore.getState().lists,
    calendars: useCalendarStore.getState().calendars,
    sets: useCalendarStore.getState().sets,
    reminders: useReminderStore.getState().reminders,
    updatedAt: Date.now(),
    origin: originId(),
  }
}

export function useCloudSync(): void {
  const userId = useAuthStore((state) => state.user?.id)
  const onboarded = useAuthStore((state) => state.profile?.onboarded)
  const applying = useRef(false)

  useEffect(() => {
    if (isTrayWindow() || isAlertWindow()) return
    if (!hasSupabaseConfig() || !userId || !onboarded) {
      useCalendarStore.getState().setSyncStatus('Off')
      return
    }

    let disposed = false
    let timer = 0
    const supabase = getSupabase()
    useCalendarStore.getState().setSyncStatus('Connecting')

    const applyRemote = (payload: ReturnType<typeof snapshot>) => {
      if (!payload || payload.origin === originId()) return
      const localAt = Number(localStorage.getItem(STAMP_KEY) || 0)
      if ((payload.updatedAt ?? 0) <= localAt) return
      applying.current = true
      useEventStore.getState().replaceEvents(payload.events ?? [])
      useTaskStore.getState().replaceTasks(payload.tasks ?? [], payload.lists)
      useCalendarStore.getState().replaceCalendars(payload.calendars ?? [])
      if (Array.isArray(payload.reminders)) useReminderStore.setState({ reminders: payload.reminders })
      localStorage.setItem(STAMP_KEY, String(payload.updatedAt))
      applying.current = false
      useCalendarStore.getState().setSyncStatus('Synced')
    }

    const push = async () => {
      if (applying.current || disposed) return
      const payload = snapshot()
      localStorage.setItem(STAMP_KEY, String(payload.updatedAt))
      const { error } = await supabase.from('user_data').upsert({
        user_id: userId,
        payload,
        updated_at: new Date().toISOString(),
      })
      if (error) {
        useCalendarStore.getState().setSyncStatus(error.message)
        return
      }
      useCalendarStore.getState().setSyncStatus('Synced')
    }

    const queuePush = () => {
      if (applying.current) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void push()
      }, 1000)
    }

    const unsubs = [
      useEventStore.subscribe(queuePush),
      useTaskStore.subscribe(queuePush),
      useCalendarStore.subscribe(queuePush),
      useReminderStore.subscribe(queuePush),
    ]

    void supabase
      .from('user_data')
      .select('payload')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (disposed) return
        if (error) {
          useCalendarStore.getState().setSyncStatus(error.message)
          return
        }
        if (data?.payload) applyRemote(data.payload as ReturnType<typeof snapshot>)
        else void push()
        useCalendarStore.getState().setSyncStatus('Synced')
      })

    const channel = supabase
      .channel(`user_data:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` },
        (message) => {
          const row = message.new as { payload?: ReturnType<typeof snapshot> } | undefined
          if (row?.payload) applyRemote(row.payload)
        },
      )
      .subscribe()

    return () => {
      disposed = true
      window.clearTimeout(timer)
      unsubs.forEach((stop) => stop())
      void supabase.removeChannel(channel)
    }
  }, [userId, onboarded])
}
