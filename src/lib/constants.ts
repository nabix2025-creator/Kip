export const HOUR_HEIGHT = 64
export const SNAP_MINUTES = 15
export const GUTTER = 72
export const EASE = [0.4, 0, 0.2, 1] as const

export const PALETTE = [
  { id: 'red', value: '#FF3B30', label: 'Red' },
  { id: 'orange', value: '#FF9500', label: 'Orange' },
  { id: 'yellow', value: '#FFCC00', label: 'Yellow' },
  { id: 'green', value: '#34C759', label: 'Green' },
  { id: 'blue', value: '#0A84FF', label: 'Blue' },
  { id: 'purple', value: '#AF52DE', label: 'Purple' },
  { id: 'pink', value: '#FF2D55', label: 'Pink' },
  { id: 'graphite', value: '#8E8E93', label: 'Graphite' },
] as const

export const REMINDER_PRESETS = [
  { minutes: 5, label: '5 minutes before' },
  { minutes: 10, label: '10 minutes before' },
  { minutes: 15, label: '15 minutes before' },
  { minutes: 30, label: '30 minutes before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
] as const

export const VIEWS = [
  { id: 'day', label: 'Day', key: '1' },
  { id: 'week', label: 'Week', key: '2' },
  { id: 'month', label: 'Month', key: '3' },
  { id: 'quarter', label: 'Quarter', key: '4' },
  { id: 'year', label: 'Year', key: '5' },
] as const
