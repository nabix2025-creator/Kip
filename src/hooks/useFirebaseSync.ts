import { useEffect, useRef } from 'react'
import { isTrayWindow } from '@/lib/env'
import { isFirebaseConfig, subscribeFirebase, type SyncDocument } from '@/lib/firebase'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTaskStore } from '@/store/taskStore'

const STAMP_KEY = 'kip-sync-at'

function snapshot(): Omit<SyncDocument, 'origin'> {
  return {
    events: useEventStore.getState().events,
    tasks: useTaskStore.getState().tasks,
    lists: useTaskStore.getState().lists,
    calendars: useCalendarStore.getState().calendars,
    sets: useCalendarStore.getState().sets,
    updatedAt: Date.now(),
  }
}

export function useFirebaseSync(): void {
  const config = useSettingsStore((state) => state.firebase)
  const signature = JSON.stringify(config)
  const applying = useRef(false)

  useEffect(() => {
    if (isTrayWindow() || !isFirebaseConfig(config)) {
      useCalendarStore.getState().setSyncStatus('Off')
      return
    }
    let stop = async () => {}
    let push: ((data: Omit<SyncDocument, 'origin'>) => Promise<void>) | null = null
    let timer = 0
    let disposed = false
    const origin =
      localStorage.getItem('kip-client-id') ||
      localStorage.getItem('nodash-client-id') ||
      localStorage.getItem('fantastical-client-id')
    useCalendarStore.getState().setSyncStatus('Connecting')

    const apply = (remote: SyncDocument | null) => {
      if (!remote || remote.origin === origin) return
      const localAt = Number(
        localStorage.getItem(STAMP_KEY) ||
          localStorage.getItem('nodash-sync-at') ||
          localStorage.getItem('fantastical-sync-at') ||
          0,
      )
      if (remote.updatedAt <= localAt) return
      applying.current = true
      useEventStore.getState().replaceEvents(remote.events ?? [])
      useTaskStore.getState().replaceTasks(remote.tasks ?? [], remote.lists)
      useCalendarStore.getState().replaceCalendars(remote.calendars ?? [])
      localStorage.setItem(STAMP_KEY, String(remote.updatedAt))
      applying.current = false
      useCalendarStore.getState().setSyncStatus('Synced')
    }

    const queuePush = () => {
      if (applying.current || !push) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (!push || applying.current) return
        const data = snapshot()
        localStorage.setItem(STAMP_KEY, String(data.updatedAt))
        void push(data)
          .then(() => useCalendarStore.getState().setSyncStatus('Synced'))
          .catch((error) => useCalendarStore.getState().setSyncStatus(error instanceof Error ? error.message : 'Sync error'))
      }, 900)
    }

    const unsubs = [
      useEventStore.subscribe(queuePush),
      useTaskStore.subscribe(queuePush),
      useCalendarStore.subscribe(queuePush),
    ]

    void subscribeFirebase(config, (remote) => {
      if (disposed) return
      if (!remote) {
        queuePush()
        return
      }
      const localAt = Number(
        localStorage.getItem(STAMP_KEY) ||
          localStorage.getItem('nodash-sync-at') ||
          localStorage.getItem('fantastical-sync-at') ||
          0,
      )
      if (remote.updatedAt > localAt) apply(remote)
      else if (localAt > remote.updatedAt) queuePush()
      else useCalendarStore.getState().setSyncStatus('Synced')
    })
      .then((handle) => {
        if (disposed) {
          void handle.stop()
          return
        }
        push = handle.push
        stop = handle.stop
        useCalendarStore.getState().setSyncStatus('Synced')
      })
      .catch((error) => {
        useCalendarStore.getState().setSyncStatus(error instanceof Error ? error.message : 'Firebase unavailable')
      })

    return () => {
      disposed = true
      window.clearTimeout(timer)
      unsubs.forEach((unsubscribe) => unsubscribe())
      void stop()
    }
  }, [signature, config])
}
