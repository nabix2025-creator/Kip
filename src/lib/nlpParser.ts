import * as chrono from 'chrono-node'
import { addDays, addMinutes, startOfDay } from 'date-fns'

export interface ParsedEvent {
  title: string
  start: Date | null
  end: Date | null
  allDay: boolean
  location: string | null
  matchedText: string | null
}

const DURATION = /\bfor\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i

export function parseNaturalLanguage(input: string, ref = new Date()): ParsedEvent {
  const text = input.trim()
  if (!text) {
    return { title: '', start: null, end: null, allDay: false, location: null, matchedText: null }
  }

  const durationMatch = text.match(DURATION)
  let durationMin: number | null = null
  if (durationMatch) {
    const amount = Number.parseFloat(durationMatch[1])
    durationMin = durationMatch[2].toLowerCase().startsWith('h') ? Math.round(amount * 60) : Math.round(amount)
  }

  const results = chrono.parse(text, ref, { forwardDate: true })
  const first = results[0]
  let start: Date | null = null
  let end: Date | null = null
  let matched: string | null = null
  let title = text

  if (first) {
    start = first.start.date()
    end = first.end ? first.end.date() : null
    matched = first.text
    title = `${text.slice(0, first.index)} ${text.slice(first.index + first.text.length)}`.trim()
  }

  title = title.replace(DURATION, ' ')

  let location: string | null = null
  const locationMatch = title.match(/(?:@|\bin\b)\s+([A-Za-z0-9][^,]{1,48})$/i)
  if (locationMatch && locationMatch.index !== undefined) {
    location = cleanup(locationMatch[1])
    title = title.slice(0, locationMatch.index)
  }

  title = cleanup(title.replace(/\b(from|on)\b/gi, ' '))
  if (!title) title = 'New Event'

  const hourCertain = first ? first.start.isCertain('hour') : false
  if (start && !hourCertain && !end && !durationMin) {
    const day = startOfDay(start)
    return {
      title,
      start: day,
      end: addDays(day, 1),
      allDay: true,
      location,
      matchedText: matched,
    }
  }

  if (start && !hourCertain) {
    start = new Date(start)
    start.setHours(9, 0, 0, 0)
  }

  if (start && (!end || durationMin)) {
    end = addMinutes(start, durationMin ?? (end ? Math.max(15, (end.getTime() - start.getTime()) / 60000) : 60))
  }

  return { title, start, end, allDay: false, location, matchedText: matched }
}

function cleanup(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[\s,.\-–]+|[\s,.\-–]+$/g, '').trim()
}
