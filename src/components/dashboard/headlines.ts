import { useEffect, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'

export interface Headline {
  title: string
  link: string
  source: string
  ago: string
}

const FEED = 'https://feeds.bbci.co.uk/bengali/rss.xml'
const TTL = 5 * 60 * 1000

let cache: { at: number; items: Headline[] } | null = null

export function useHeadlines() {
  const [items, setItems] = useState<Headline[]>(() => cache?.items ?? [])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() => (cache ? 'ready' : 'loading'))
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (nonce === 0 && cache && Date.now() - cache.at < TTL) return
    const controller = new AbortController()
    setStatus('loading')
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED)}`
    fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { status?: string; items?: { title: string; link: string; pubDate: string; author?: string }[] }) => {
        if (payload.status !== 'ok' || !payload.items?.length) {
          setStatus('error')
          return
        }
        const next = payload.items.slice(0, 16).map((item) => ({
          title: item.title,
          link: item.link,
          source: item.author || 'BBC Bangla',
          ago: safeAgo(item.pubDate),
        }))
        cache = { at: Date.now(), items: next }
        setItems(next)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setStatus('error')
      })
    return () => controller.abort()
  }, [nonce])

  return { items, status, refresh: () => setNonce((value) => value + 1) }
}

function safeAgo(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2020) return ''
  return `${formatDistanceToNowStrict(date)} ago`
}
