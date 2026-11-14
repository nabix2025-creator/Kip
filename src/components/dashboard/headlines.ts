import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'

export interface Headline {
  title: string
  link: string
  source: string
  ago: string
}

const FEED = 'https://feeds.bbci.co.uk/bengali/rss.xml'
const STORAGE_KEY = 'kip-headlines'
/** Auto-refresh interval and soft cache TTL. */
export const NEWS_REFRESH_MS = 5 * 60 * 60 * 1000

type Cache = { at: number; items: Headline[] }

let memory: Cache | null = readCache()

export function clearHeadlinesCache(): void {
  memory = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cache
    if (!parsed?.at || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(next: Cache): void {
  memory = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode */
  }
}

function isFresh(cache: Cache | null, now = Date.now()): boolean {
  return Boolean(cache && now - cache.at < NEWS_REFRESH_MS)
}

async function fetchHeadlines(signal?: AbortSignal): Promise<Headline[]> {
  const bust = Date.now()
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED)}&_=${bust}`
  const response = await fetch(url, { signal, cache: 'no-store' })
  const payload = (await response.json()) as {
    status?: string
    items?: { title: string; link: string; pubDate: string; author?: string }[]
  }
  if (payload.status !== 'ok' || !payload.items?.length) throw new Error('News feed empty')
  return payload.items.slice(0, 16).map((item) => ({
    title: item.title,
    link: item.link,
    source: item.author || 'BBC Bangla',
    ago: safeAgo(item.pubDate),
  }))
}

export function useHeadlines() {
  const [items, setItems] = useState<Headline[]>(() => memory?.items ?? [])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() => (memory?.items.length ? 'ready' : 'loading'))
  const [tick, setTick] = useState(0)
  const forceRef = useRef(false)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    const cached = memory ?? readCache()
    const force = forceRef.current
    forceRef.current = false

    if (!force && isFresh(cached)) {
      if (cached) setItems(cached.items)
      setStatus('ready')
      return
    }

    const previous = cached?.items?.length ? cached.items : itemsRef.current
    const controller = new AbortController()
    setStatus('loading')
    void fetchHeadlines(controller.signal)
      .then((next) => {
        writeCache({ at: Date.now(), items: next })
        setItems(next)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return
        if (previous.length) {
          setItems(previous)
          setStatus('ready')
          return
        }
        setStatus('error')
      })

    return () => controller.abort()
  }, [tick])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isFresh(memory ?? readCache())) {
        forceRef.current = false
        setTick((value) => value + 1)
      }
    }, NEWS_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [])

  return {
    items,
    status,
    refresh: () => {
      forceRef.current = true
      setTick((value) => value + 1)
    },
  }
}

function safeAgo(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2020) return ''
  return `${formatDistanceToNowStrict(date)} ago`
}
