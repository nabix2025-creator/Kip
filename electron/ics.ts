export interface IcsEvent {
  uid: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  notes?: string
  recurrence?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    byWeekday?: number[]
    until?: string
    count?: number
  }
  exdates?: string[]
}

const WEEKDAYS: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

export function parseIcs(ics: string): IcsEvent[] {
  const unfolded = ics.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
  return unfolded
    .split('BEGIN:VEVENT')
    .slice(1)
    .map((chunk) => parseEvent(chunk.split('END:VEVENT')[0]))
    .filter((event): event is IcsEvent => Boolean(event))
}

function parseEvent(body: string): IcsEvent | null {
  const props = new Map<string, { params: string; value: string }[]>()
  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    const index = trimmed.indexOf(':')
    if (index < 0) continue
    const left = trimmed.slice(0, index)
    const value = unescapeText(trimmed.slice(index + 1))
    const [name, ...params] = left.split(';')
    const key = name.toUpperCase()
    props.set(key, [...(props.get(key) ?? []), { params: params.join(';'), value }])
  }
  const startRaw = props.get('DTSTART')?.[0]
  if (!startRaw) return null
  const start = parseDate(startRaw.value, startRaw.params)
  const endRaw = props.get('DTEND')?.[0]
  const end = endRaw ? parseDate(endRaw.value, endRaw.params) : { ...start, date: new Date(start.date.getTime() + (start.allDay ? 86400000 : 3600000)) }
  const rule = props.get('RRULE')?.[0]?.value
  return {
    uid: props.get('UID')?.[0]?.value || `${start.date.toISOString()}-${props.get('SUMMARY')?.[0]?.value || 'event'}`,
    title: props.get('SUMMARY')?.[0]?.value || 'Busy',
    start: start.date.toISOString(),
    end: end.date.toISOString(),
    allDay: start.allDay,
    location: props.get('LOCATION')?.[0]?.value,
    notes: props.get('DESCRIPTION')?.[0]?.value,
    recurrence: rule ? parseRule(rule) : undefined,
    exdates: (props.get('EXDATE') ?? []).map((item) => dateKey(parseDate(item.value, item.params).date)),
  }
}

function parseDate(value: string, params: string): { date: Date; allDay: boolean } {
  const allDay = /VALUE=DATE/i.test(params) || /^\d{8}$/.test(value)
  if (allDay) {
    const year = Number(value.slice(0, 4))
    const month = Number(value.slice(4, 6))
    const day = Number(value.slice(6, 8))
    return { date: new Date(year, month - 1, day), allDay: true }
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)/)
  if (!match) return { date: new Date(), allDay: false }
  const [, year, month, day, hour, minute, second, zulu] = match
  if (zulu) return { date: new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second)), allDay: false }
  return { date: new Date(+year, +month - 1, +day, +hour, +minute, +second), allDay: false }
}

function parseRule(value: string): IcsEvent['recurrence'] | undefined {
  const parts = Object.fromEntries(value.split(';').map((part) => part.split('=')))
  const freq = (parts.FREQ || '').toLowerCase()
  if (freq !== 'daily' && freq !== 'weekly' && freq !== 'monthly' && freq !== 'yearly') return undefined
  const byWeekday: number[] = []
  const byday = typeof parts.BYDAY === 'string' ? parts.BYDAY : ''
  for (const token of byday.split(',').filter(Boolean)) {
    const day = WEEKDAYS[token.replace(/[^A-Z]/gi, '').slice(-2).toUpperCase()]
    if (day !== undefined) byWeekday.push(day)
  }
  return {
    freq,
    interval: Number(parts.INTERVAL || 1) || 1,
    byWeekday: byWeekday.length ? byWeekday : undefined,
    count: parts.COUNT ? Number(parts.COUNT) : undefined,
    until: parts.UNTIL ? dateKey(parseDate(parts.UNTIL, '').date) : undefined,
  }
}

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}
