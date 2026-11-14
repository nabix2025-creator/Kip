import { useEffect } from 'react'
import { LeftPanel } from '@/components/layout/LeftPanel'
import { MainPanel } from '@/components/layout/MainPanel'
import { RightPanel } from '@/components/layout/RightPanel'
import { ReminderAlert } from '@/components/layout/ReminderAlert'
import { TrayPopup } from '@/components/layout/TrayPopup'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { OnboardingScreen } from '@/components/auth/OnboardingScreen'
import { AddCalendarModal } from '@/components/calendar/AddCalendarModal'
import { EventModal } from '@/components/events/EventModal'
import { EventPopover } from '@/components/events/EventPopover'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { NaturalLanguageInput } from '@/components/ui/NaturalLanguageInput'
import { SearchModal } from '@/components/ui/SearchModal'
import { Toasts } from '@/components/ui/Toasts'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { Whiteboard } from '@/components/whiteboard/Whiteboard'
import { useAuth } from '@/hooks/useAuth'
import { useCloudSync } from '@/hooks/useCloudSync'
import { useDashboardRuntime } from '@/hooks/useDashboardRuntime'
import { useCalendarStore } from '@/store/calendarStore'
import { useAuthStore } from '@/store/authStore'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useNotifications } from '@/hooks/useNotifications'
import { useTheme } from '@/hooks/useTheme'
import { useTray } from '@/hooks/useTray'
import { isAlertWindow, isTrayWindow } from '@/lib/env'
import { mirrorToElectronStore } from '@/lib/persist'

export default function App() {
  const tray = isTrayWindow()
  const alert = isAlertWindow()
  const dashboardOpen = useCalendarStore((state) => state.dashboardOpen)
  const whiteboardOpen = useCalendarStore((state) => state.whiteboardOpen)
  const ready = useAuthStore((state) => state.ready)
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  useAuth()
  useCloudSync()
  useDashboardRuntime(!tray && !alert && !!user && !!profile?.onboarded)
  useTheme()
  useKeyboard()
  useNotifications()
  useTray()

  useEffect(() => {
    if (tray || alert) return
    return mirrorToElectronStore()
  }, [tray, alert])

  useEffect(() => {
    const root = document.documentElement
    const apply = (maximized: boolean) => {
      root.dataset.maximized = maximized ? '1' : '0'
    }
    void window.api?.isMaximized().then(apply)
    return window.api?.onMaximized(apply)
  }, [])

  if (alert) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-transparent">
        <ReminderAlert />
      </div>
    )
  }

  if (tray) {
    return (
      <div className="app-shell">
        <TrayPopup />
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="app-shell flex items-center justify-center bg-primary text-secondary">
        Loading Kip…
      </div>
    )
  }

  if (!user) return <LoginScreen />
  if (!profile?.onboarded) return <OnboardingScreen />

  return (
    <div className="app-shell relative flex min-h-0 text-primary">
      <LeftPanel />
      <MainPanel />
      <RightPanel />
      <NaturalLanguageInput />
      <EventModal />
      <EventPopover />
      <SearchModal />
      <SettingsModal />
      <AddCalendarModal />
      <Toasts />
      <ConfirmDialog />
      {dashboardOpen && <Dashboard />}
      {whiteboardOpen && <Whiteboard />}
    </div>
  )
}
