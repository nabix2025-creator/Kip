/** Format remaining focus-session time for Settings / Today UI. */
export function formatFocusRemaining(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  }
  return `${seconds}s`
}

export function formatFocusEndsAt(endsAt: string | null | undefined): string {
  if (!endsAt) return ''
  const date = new Date(endsAt)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

/** Build an ISO endsAt from a local HH:mm (today, or tomorrow if already past). */
export function endsAtFromLocalTime(hhmm: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  const date = new Date()
  date.setSeconds(0, 0)
  date.setHours(hour, minute, 0, 0)
  if (date.getTime() <= Date.now() + 1000) {
    date.setDate(date.getDate() + 1)
  }
  return date.toISOString()
}
