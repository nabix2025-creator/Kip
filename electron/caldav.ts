import { safeStorage } from 'electron'
import { parseIcs } from './ics'
import { storeDelete, storeGet, storeSet } from './store'
import type { RemotePayload } from './types'

interface IcloudAuth {
  username: string
  password: string
}

function seal(value: string): string {
  if (safeStorage.isEncryptionAvailable()) return `enc:${safeStorage.encryptString(value).toString('base64')}`
  return `plain:${value}`
}

function open(value: string): string {
  if (value.startsWith('enc:') && safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'))
  if (value.startsWith('plain:')) return value.slice(6)
  return value
}

function saved(): IcloudAuth | null {
  const raw = storeGet('icloud-auth') as { username?: string; password?: string } | undefined
  if (!raw?.username || !raw.password) return null
  return { username: raw.username, password: open(raw.password) }
}

async function dav(url: string, method: string, auth: IcloudAuth, body?: string, depth = '0'): Promise<{ text: string; url: string }> {
  const header = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`
  let current = url
  for (let hop = 0; hop < 6; hop += 1) {
    const response = await fetch(current, {
      method,
      redirect: 'manual',
      headers: {
        Authorization: header,
        Depth: depth,
        'Content-Type': 'application/xml; charset=utf-8',
      },
      body,
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error('iCloud redirected without a location')
      current = new URL(location, current).toString()
      continue
    }
    const text = await response.text()
    if (response.status === 401) throw new Error('iCloud refused that Apple ID or app-specific password')
    if (response.status >= 400 && response.status !== 207) throw new Error(`iCloud request failed (${response.status})`)
    return { text, url: current }
  }
  throw new Error('iCloud redirected too many times')
}

function href(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>[\\s\\S]*?<[^>]*href>([^<]+)`, 'i'))
  return match?.[1]?.trim() || null
}

function textOf(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([^<]*)`, 'i'))
  return decode(match?.[1]?.trim() || '')
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export async function connectIcloud(creds: { username: string; password: string }): Promise<RemotePayload> {
  const username = creds.username.trim()
  const password = creds.password.trim()
  if (!username || !password) throw new Error('Enter your Apple ID and an app-specific password')
  storeSet('icloud-auth', { username, password: seal(password) })
  try {
    return await syncIcloud()
  } catch (error) {
    storeDelete('icloud-auth')
    throw error
  }
}

export async function syncIcloud(): Promise<RemotePayload> {
  const auth = saved()
  if (!auth) throw new Error('iCloud is not connected')
  const root = await dav(
    'https://caldav.icloud.com/',
    'PROPFIND',
    auth,
    `<?xml version="1.0" encoding="UTF-8"?>
     <d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`,
  )
  const principalHref = href(root.text, 'current-user-principal')
  if (!principalHref) throw new Error('iCloud did not return a calendar principal')
  const principal = await dav(
    new URL(principalHref, root.url).toString(),
    'PROPFIND',
    auth,
    `<?xml version="1.0" encoding="UTF-8"?>
     <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`,
  )
  const homeHref = href(principal.text, 'calendar-home-set')
  if (!homeHref) throw new Error('iCloud did not return a calendar home')
  const homeUrl = new URL(homeHref, principal.url).toString()
  const home = await dav(
    homeUrl,
    'PROPFIND',
    auth,
    `<?xml version="1.0" encoding="UTF-8"?>
     <d:propfind xmlns:d="DAV:" xmlns:cs="http://calendarserver.org/ns/" xmlns:ic="http://apple.com/ns/ical/">
       <d:prop><d:displayname/><d:resourcetype/><ic:calendar-color/></d:prop>
     </d:propfind>`,
    '1',
  )
  const calendars = home.text
    .split(/<[^>]*response[ >]/i)
    .slice(1)
    .map((block) => {
      const calendarHref = href(block, 'href')
      const isCalendar = /<[^>]*(calendar)\s*\/?>/i.test(block) && !/inbox|notification|outbox/i.test(calendarHref || '')
      if (!calendarHref || !isCalendar || /calendar-home-set/i.test(block)) return null
      if (!/<[^>]*resourcetype[^>]*>[\s\S]*calendar/i.test(block)) return null
      const color = (textOf(block, 'calendar-color') || '#34C759').slice(0, 7)
      return {
        externalId: new URL(calendarHref, home.url).toString(),
        name: textOf(block, 'displayname') || 'iCloud',
        color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#34C759',
      }
    })
    .filter((calendar): calendar is { externalId: string; name: string; color: string } => Boolean(calendar))

  const unique = Array.from(new Map(calendars.map((calendar) => [calendar.externalId, calendar])).values())
  const start = utcStamp(new Date(Date.now() - 60 * 86400000))
  const end = utcStamp(new Date(Date.now() + 400 * 86400000))
  const events: RemotePayload['events'] = []
  for (const calendar of unique) {
    const report = await dav(
      calendar.externalId,
      'REPORT',
      auth,
      `<?xml version="1.0" encoding="UTF-8"?>
       <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
         <d:prop><d:getetag/><c:calendar-data/></d:prop>
         <c:filter>
           <c:comp-filter name="VCALENDAR">
             <c:comp-filter name="VEVENT">
               <c:time-range start="${start}" end="${end}"/>
             </c:comp-filter>
           </c:comp-filter>
         </c:filter>
       </c:calendar-query>`,
      '1',
    )
    const blobs = Array.from(report.text.matchAll(/<(?:[^>]*:)?calendar-data[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:[^>]*:)?calendar-data>/gi)).map((match) =>
      decode(match[1]),
    )
    for (const blob of blobs) {
      for (const event of parseIcs(blob)) {
        events.push({
          externalId: event.uid,
          calendarExternalId: calendar.externalId,
          title: event.title,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          location: event.location,
          notes: event.notes,
        })
      }
    }
  }
  return { calendars: unique, events, account: auth.username }
}

export function disconnectIcloud(): void {
  storeDelete('icloud-auth')
}

export function icloudStatus(): { connected: boolean; account?: string } {
  const auth = saved()
  return auth ? { connected: true, account: auth.username } : { connected: false }
}
