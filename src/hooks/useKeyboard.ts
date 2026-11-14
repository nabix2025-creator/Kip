import { useEffect } from 'react'
import { useCalendarStore } from '@/store/calendarStore'
import { parseDateKey, shiftDate } from '@/lib/dates'
import type { ViewMode } from '@/types'

const VIEW_KEYS: Record<string, ViewMode> = { '1': 'day', '2': 'week', '3': 'month', '4': 'quarter', '5': 'year' }

export function useKeyboard(): void {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'tray') return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      const meta = event.metaKey || event.ctrlKey
      const store = useCalendarStore.getState()
      const modalOpen = store.nlOpen || store.searchOpen || store.settingsOpen || store.addCalendarOpen || !!store.eventModal || !!store.popover

      if (store.whiteboardOpen) return

      if (event.key === 'Escape') {
        if (typing && store.dashboardOpen) {
          target?.blur()
          return
        }
        if (store.dashboardOpen) {
          event.preventDefault()
          store.closeDashboard()
          return
        }
        if (modalOpen) {
          event.preventDefault()
          store.closeTop()
        }
        return
      }

      if (store.dashboardOpen) return

      if (modalOpen || typing) {
        if (meta && event.key.toLowerCase() === 'k') {
          event.preventDefault()
          store.openNl()
        }
        return
      }

      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        store.openNl()
        return
      }
      if (meta && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        store.openSearch()
        return
      }
      if (meta && event.key.toLowerCase() === 't') {
        event.preventDefault()
        store.goToday()
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const direction = event.key === 'ArrowLeft' ? -1 : 1
        const current = useCalendarStore.getState()
        const selected = parseDateKey(current.selectedDate)
        current.shiftSelected(shiftDate(current.view, selected, direction), direction)
        return
      }
      const view = VIEW_KEYS[event.key]
      if (view) {
        event.preventDefault()
        store.setView(view)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
