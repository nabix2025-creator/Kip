import { safeStorage, shell } from 'electron'
import http from 'node:http'
import { storeDelete, storeGet, storeSet } from './store'
import type { PushAction, RemoteEvent, RemotePayload } from './types'

interface GoogleAuth {
  clientId: string
  clientSecret: string
  refreshToken: string
  accessToken: string
  expiry: number
  email?: string
}

const PORT = 42813

function seal(value: string): string {
  if (!value) return ''
  if (safeStorage.isEncryptionAvailable()) return `enc:${safeStorage.encryptString(value).toString('base64')}`
  return `plain:${value}`
}

function open(value: string): string {
  if (!value) return ''
  if (value.startsWith('enc:') && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'))
  }
  if (value.startsWith('plain:')) return value.slice(6)
  return value
}

function savedAuth(): GoogleAuth | null {
  const raw = storeGet('google-auth') as GoogleAuth | undefined
  if (!raw?.clientId || !raw.accessToken) return null
  return { ...raw, clientSecret: open(raw.clientSecret), refreshToken: open(raw.refreshToken) }
}

function writeAuth(auth: GoogleAuth): void {
  storeSet('google-auth', { ...auth, clientSecret: seal(auth.clientSecret), refreshToken: seal(auth.refreshToken) })
}

function listenForCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const url = new URL(request.url || '/', `http://127.0.0.1:${PORT}`)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end('<html><body style="font-family:Segoe UI,sans-serif;background:#1c1c1e;color:white;padding:40px"><h2>Kip is connected</h2><p>You can close this window and return to the app.</p></body></html>')
      server.close()
      if (code) resolve(code)
      else reject(new Error(error || 'Google sign-in was cancelled'))
    })
    server.once('error', () => reject(new Error('Port 42813 is in use. Close the other sign-in window and try again.')))
    server.listen(PORT, '127.0.0.1')
    setTimeout(() => {
      server.close()
      reject(new Error('Google sign-in timed out'))
    }, 180_000).unref()
  })
}

async function tokenRequest(body: URLSearchParams): Promise<{ access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  return response.json()
}

export async function connectGoogle(creds: { clientId: string; clientSecret: string }): Promise<RemotePayload> {
  const clientId = creds.clientId.trim()
  const clientSecret = creds.clientSecret.trim()
  if (!clientId || !clientSecret) throw new Error('Add a Google OAuth client ID and secret first')
  const redirect = `http://127.0.0.1:${PORT}/callback`
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirect)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('scope', ['openid', 'email', 'https://www.googleapis.com/auth/calendar'].join(' '))
  const pending = listenForCode()
  await shell.openExternal(url.toString())
  const code = await pending
  const token = await tokenRequest(
    new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: 'authorization_code' }),
  )
  if (!token.access_token) throw new Error(token.error_description || 'Google token exchange failed')
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  const profile = (await profileResponse.json()) as { email?: string }
  writeAuth({
    clientId,
    clientSecret,
    refreshToken: token.refresh_token || savedAuth()?.refreshToken || '',
    accessToken: token.access_token,
    expiry: Date.now() + (token.expires_in || 3600) * 1000,
    email: profile.email,
  })
  return syncGoogle()
}

async function authorized(): Promise<GoogleAuth> {
  const auth = savedAuth()
  if (!auth) throw new Error('Google Calendar is not connected')
  if (Date.now() < auth.expiry - 60_000) return auth
  if (!auth.refreshToken) throw new Error('Google session expired. Connect again.')
  const token = await tokenRequest(
    new URLSearchParams({
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
      refresh_token: auth.refreshToken,
      grant_type: 'refresh_token',
    }),
  )
  if (!token.access_token) throw new Error(token.error_description || 'Google session expired. Connect again.')
  auth.accessToken = token.access_token
  auth.expiry = Date.now() + (token.expires_in || 3600) * 1000
  writeAuth(auth)
  return auth
}

async function googleFetch(path: string, init?: RequestInit): Promise<Response> {
  const auth = await authorized()
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(detail.error?.message || `Google Calendar request failed (${response.status})`)
  }
  return response
}

function localDate(value: string): string {
  const date = new Date(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function dateToIso(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toISOString()
}

export async function syncGoogle(): Promise<RemotePayload> {
  const auth = await authorized()
  const listResponse = await googleFetch('/users/me/calendarList')
  const list = (await listResponse.json()) as {
    items?: { id: string; summary: string; backgroundColor?: string; selected?: boolean }[]
  }
  const calendars = (list.items ?? [])
    .filter((item) => item.selected !== false)
    .map((item) => ({ externalId: item.id, name: item.summary || 'Calendar', color: item.backgroundColor || '#0A84FF' }))
  const timeMin = new Date(Date.now() - 45 * 86400000).toISOString()
  const timeMax = new Date(Date.now() + 365 * 86400000).toISOString()
  const events: RemoteEvent[] = []
  for (const calendar of calendars) {
    let pageToken = ''
    for (let page = 0; page < 8; page += 1) {
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        timeMin,
        timeMax,
        maxResults: '250',
      })
      if (pageToken) params.set('pageToken', pageToken)
      const response = await googleFetch(`/calendars/${encodeURIComponent(calendar.externalId)}/events?${params}`)
      const body = (await response.json()) as {
        items?: {
          id: string
          summary?: string
          description?: string
          location?: string
          status?: string
          start?: { date?: string; dateTime?: string }
          end?: { date?: string; dateTime?: string }
        }[]
        nextPageToken?: string
      }
      for (const item of body.items ?? []) {
        if (item.status === 'cancelled' || !item.start) continue
        const allDay = Boolean(item.start.date)
        const start = allDay ? dateToIso(item.start.date!) : item.start.dateTime
        const end = allDay ? dateToIso(item.end?.date || item.start.date!) : item.end?.dateTime
        if (!start || !end) continue
        events.push({
          externalId: item.id,
          calendarExternalId: calendar.externalId,
          title: item.summary || 'Busy',
          start,
          end,
          allDay,
          location: item.location,
          notes: item.description,
        })
      }
      if (!body.nextPageToken) break
      pageToken = body.nextPageToken
    }
  }
  return { calendars, events, account: auth.email }
}

export async function pushGoogle(action: PushAction): Promise<{ externalId?: string }> {
  const calendarId = encodeURIComponent(action.calendarExternalId)
  if (action.action === 'delete' && action.externalId) {
    await googleFetch(`/calendars/${calendarId}/events/${encodeURIComponent(action.externalId)}`, { method: 'DELETE' })
    return {}
  }
  if (!action.event) throw new Error('Missing event')
  const event = action.event
  const body = event.allDay
    ? {
        summary: event.title,
        location: event.location,
        description: event.notes,
        start: { date: localDate(event.start) },
        end: { date: localDate(event.end) },
        reminders: { useDefault: false, overrides: (event.reminders ?? []).slice(0, 5).map((minutes) => ({ method: 'popup', minutes })) },
      }
    : {
        summary: event.title,
        location: event.location,
        description: event.notes,
        start: { dateTime: event.start },
        end: { dateTime: event.end },
        reminders: { useDefault: false, overrides: (event.reminders ?? []).slice(0, 5).map((minutes) => ({ method: 'popup', minutes })) },
      }
  if (action.action === 'insert') {
    const response = await googleFetch(`/calendars/${calendarId}/events`, { method: 'POST', body: JSON.stringify(body) })
    const created = (await response.json()) as { id?: string }
    return { externalId: created.id }
  }
  if (!action.externalId) return {}
  await googleFetch(`/calendars/${calendarId}/events/${encodeURIComponent(action.externalId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return { externalId: action.externalId }
}

export function disconnectGoogle(): void {
  storeDelete('google-auth')
}

export function googleStatus(): { connected: boolean; account?: string } {
  const auth = savedAuth()
  return auth ? { connected: true, account: auth.email } : { connected: false }
}
