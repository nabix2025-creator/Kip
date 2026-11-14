function viewParam(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('view')
}

export function isTrayWindow(): boolean {
  return viewParam() === 'tray'
}

export function isAlertWindow(): boolean {
  return viewParam() === 'alert'
}

export function hasElectron(): boolean {
  return typeof window !== 'undefined' && !!window.api
}
