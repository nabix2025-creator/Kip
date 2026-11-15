import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'

export interface Headline {
  title: string
  link: string
  source: string
  publishedAt: number
  ago: string
}

type StoredHeadline = Omit<Headline, 'ago'>

const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/bengali/rss.xml', source: 'BBC Bangla' },
  { url: 'https://www.prothomalo.com/feed/', source: 'Prothom Alo' },
] as const

const STORAGE_KEY = 'kip-headlines'
/** Auto-refresh interval and soft cache TTL. */
export const NEWS_REFRESH_MS = 5 * 60 * 60 * 1000

type Cache = { at: number; items: StoredHeadline[] }

let memory: Cache | null = readCache()
const listeners = new Set<() => void>()

function notifyListeners(): void {
  listeners.forEach((listener) => listener())
}

export function clearHeadlinesCache(): void {
  memory = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  notifyListeners()
}

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cache
    if (!parsed?.at || !Array.isArray(parsed.items) || parsed.items.length === 0) return null
    if (parsed.items.some((item) => typeof item?.publishedAt !== 'number' || !item.title || !item.link)) return null
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
  notifyListeners()
}

function isFresh(cache: Cache | null, now = Date.now()): boolean {
  return Boolean(cache && now - cache.at < NEWS_REFRESH_MS)
}

function withAgo(items: StoredHeadline[]): Headline[] {
  return items.map((item) => ({
    ...item,
    ago: item.publishedAt > 0 ? `${formatDistanceToNowStrict(item.publishedAt)} ago` : '',
  }))
}

function parseRss(xml: string, source: string): StoredHeadline[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  if (doc.querySelector('parsererror')) return []
  return [...doc.querySelectorAll('item')]
    .map((item) => {
      const title = item.querySelector('title')?.textContent?.trim() ?? ''
      const link = item.querySelector('link')?.textContent?.trim() ?? ''
      const publishedAt = Date.parse(item.querySelector('pubDate')?.textContent ?? '')
      return {
        title,
        link,
        source,
        publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
      }
    })
    .filter((item) => item.title && item.link)
}

async function loadFeedDirect(feed: (typeof FEEDS)[number], signal?: AbortSignal): Promise<StoredHeadline[]> {
  const xml = await window.api!.fetchText(feed.url)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return parseRss(xml, feed.source)
}

async function loadFeedRss2Json(feed: (typeof FEEDS)[number], signal?: AbortSignal): Promise<StoredHeadline[]> {
  const bust = Date.now()
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&_=${bust}`
  const response = await fetch(url, { signal, cache: 'no-store' })
  const payload = (await response.json()) as {
    status?: string
    items?: { title: string; link: string; pubDate: string }[]
  }
  if (payload.status !== 'ok' || !payload.items?.length) throw new Error(`${feed.source} empty`)
  return payload.items.map((item) => {
    const publishedAt = Date.parse(item.pubDate)
    return {
      title: item.title,
      link: item.link,
      source: feed.source,
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
    }
  })
}

function mergeHeadlines(batches: StoredHeadline[][]): StoredHeadline[] {
  const seen = new Set<string>()
  const merged: StoredHeadline[] = []
  for (const batch of batches) {
    for (const item of batch) {
      if (seen.has(item.link)) continue
      seen.add(item.link)
      merged.push(item)
    }
  }
  return merged.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 20)
}

async function fetchHeadlines(signal?: AbortSignal): Promise<StoredHeadline[]> {
  const loader = window.api?.fetchText ? loadFeedDirect : loadFeedRss2Json
  const results = await Promise.allSettled(FEEDS.map((feed) => loader(feed, signal)))
  const batches = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
  const merged = mergeHeadlines(batches)
  if (!merged.length) throw new Error('News feed empty')
  return merged
}

export function useHeadlines() {
  const [items, setItems] = useState<Headline[]>(() => withAgo(memory?.items ?? []))
  const [updatedAt, setUpdatedAt] = useState<number | null>(() => memory?.at ?? null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() => (memory?.items.length ? 'ready' : 'loading'))
  const [request, setRequest] = useState({ n: 0, force: false })
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    const sync = () => {
      const cached = memory ?? readCache()
      if (!cached) return
      setItems(withAgo(cached.items))
      setUpdatedAt(cached.at)
      setStatus('ready')
    }
    listeners.add(sync)
    return () => {
      listeners.delete(sync)
    }
  }, [])

  useEffect(() => {
    const cached = memory ?? readCache()
    const force = request.force

    if (!force && isFresh(cached)) {
      if (cached) {
        setItems(withAgo(cached.items))
        setUpdatedAt(cached.at)
      }
      setStatus('ready')
      return
    }

    if (force) {
      memory = null
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }

    const previous = cached?.items?.length ? withAgo(cached.items) : itemsRef.current
    const controller = new AbortController()
    setStatus('loading')
    void fetchHeadlines(controller.signal)
      .then((next) => {
        const at = Date.now()
        writeCache({ at, items: next })
        setItems(withAgo(next))
        setUpdatedAt(at)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return
        if (previous.length) {
          setItems(previous)
          setUpdatedAt(cached?.at ?? null)
          setStatus('ready')
          return
        }
        setStatus('error')
      })

    return () => controller.abort()
  }, [request])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isFresh(memory ?? readCache())) {
        setRequest((value) => ({ n: value.n + 1, force: false }))
      }
    }, NEWS_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [])

  return {
    items,
    status,
    updatedAt,
    refresh: () => {
      setRequest((value) => ({ n: value.n + 1, force: true }))
    },
  }
}
