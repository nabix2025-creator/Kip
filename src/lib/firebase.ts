import type { FirebaseConfig } from '@/types'
import type { Calendar, CalendarEvent, CalendarSet, Task, TaskListDef } from '@/types'

export interface SyncDocument {
  events: CalendarEvent[]
  tasks: Task[]
  lists: TaskListDef[]
  calendars: Calendar[]
  sets: CalendarSet[]
  updatedAt: number
  origin: string
}

export function isFirebaseConfig(config: FirebaseConfig): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId)
}

export function clientId(): string {
  const existing =
    localStorage.getItem('kip-client-id') ||
    localStorage.getItem('nodash-client-id') ||
    localStorage.getItem('fantastical-client-id')
  if (existing) {
    localStorage.setItem('kip-client-id', existing)
    return existing
  }
  const next = crypto.randomUUID()
  localStorage.setItem('kip-client-id', next)
  return next
}

export async function subscribeFirebase(
  config: FirebaseConfig,
  onData: (data: SyncDocument | null) => void,
): Promise<{ push: (data: Omit<SyncDocument, 'origin'>) => Promise<void>; stop: () => Promise<void> }> {
  const { initializeApp, getApps, deleteApp } = await import('firebase/app')
  const { getAuth, signInAnonymously } = await import('firebase/auth')
  const { getFirestore, doc, getDoc, setDoc, onSnapshot } = await import('firebase/firestore')

  const existing = getApps().find((app) => app.name === 'kip' || app.name === 'nodash' || app.name === 'fantastical')
  if (existing) await deleteApp(existing)
  const app = initializeApp(config, 'kip')
  const auth = getAuth(app)
  await signInAnonymously(auth)
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Firebase anonymous sign-in failed')
  const db = getFirestore(app)
  const ref = doc(db, 'users', uid)
  const origin = clientId()

  const current = await getDoc(ref)
  onData(current.exists() ? (current.data() as SyncDocument) : null)

  const unsubscribe = onSnapshot(ref, (snap) => {
    onData(snap.exists() ? (snap.data() as SyncDocument) : null)
  })

  return {
    push: async (data) => {
      await setDoc(ref, { ...data, origin }, { merge: true })
    },
    stop: async () => {
      unsubscribe()
      await deleteApp(app)
    },
  }
}
