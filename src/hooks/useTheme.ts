import { useEffect, useState } from 'react'
import { resolvedTheme, useSettingsStore } from '@/store/settingsStore'

export function useTheme(): 'light' | 'dark' {
  const theme = useSettingsStore((state) => state.theme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : resolvedTheme(theme)
  useEffect(() => {
    const root = document.documentElement
    if (root.dataset.theme === resolved) return
    root.classList.add('theme-transition')
    root.dataset.theme = resolved
    window.setTimeout(() => root.classList.remove('theme-transition'), 320)
  }, [resolved])

  useEffect(() => {
    const alert = new URLSearchParams(window.location.search).get('view') === 'alert'
    document.documentElement.style.background = alert ? 'transparent' : ''
    document.body.style.background = alert ? 'transparent' : ''
  }, [])

  return resolved
}
