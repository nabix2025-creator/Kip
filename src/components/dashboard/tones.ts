import type { DeskId } from '@/components/dashboard/chrome'

/** Apple-system accents already in Kip tokens — category roles for dashboard wayfinding. */
export type DashTone = 'blue' | 'orange' | 'green' | 'indigo' | 'red'

export const GROUP_TONE = {
  Work: 'orange',
  Money: 'green',
  Personal: 'indigo',
  Browse: 'blue',
} as const satisfies Record<string, DashTone>

export const DESK_TONE: Record<DeskId, DashTone> = {
  today: 'blue',
  projects: 'orange',
  habits: 'orange',
  goals: 'orange',
  routines: 'orange',
  focus: 'orange',
  review: 'orange',
  finance: 'green',
  wishlist: 'green',
  notes: 'indigo',
  journal: 'indigo',
  library: 'indigo',
  news: 'blue',
  links: 'blue',
}

export const toneText: Record<DashTone, string> = {
  blue: 'text-accent-blue',
  orange: 'text-accent-orange',
  green: 'text-accent-green',
  indigo: 'text-accent-indigo',
  red: 'text-accent-red',
}

export const toneIcon: Record<DashTone, string> = {
  blue: 'text-accent-blue',
  orange: 'text-accent-orange',
  green: 'text-accent-green',
  indigo: 'text-accent-indigo',
  red: 'text-accent-red',
}

export const toneWash: Record<DashTone, string> = {
  blue: 'bg-accent-blue/10',
  orange: 'bg-accent-orange/10',
  green: 'bg-accent-green/10',
  indigo: 'bg-accent-indigo/10',
  red: 'bg-accent-red/10',
}

export const toneWashStrong: Record<DashTone, string> = {
  blue: 'bg-accent-blue/15',
  orange: 'bg-accent-orange/15',
  green: 'bg-accent-green/15',
  indigo: 'bg-accent-indigo/15',
  red: 'bg-accent-red/15',
}

export const toneDot: Record<DashTone, string> = {
  blue: 'bg-accent-blue',
  orange: 'bg-accent-orange',
  green: 'bg-accent-green',
  indigo: 'bg-accent-indigo',
  red: 'bg-accent-red',
}
