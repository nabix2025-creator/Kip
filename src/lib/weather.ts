import { useEffect, useSyncExternalStore } from 'react'
import { toDateKey } from '@/lib/dates'
import { useSettingsStore } from '@/store/settingsStore'

export type WeatherIcon = 'sun' | 'cloud' | 'partly' | 'rain' | 'snow' | 'storm' | 'fog'

export interface ForecastDay {
  date: string
  label: string
  high: number
  low: number
  icon: WeatherIcon
}

interface WeatherSnapshot {
  days: ForecastDay[]
  place: string
  error: string
}

const snapshot: WeatherSnapshot = { days: [], place: '', error: '' }
const listeners = new Set<() => void>()
let requestKey = ''

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): WeatherSnapshot {
  return snapshot
}

function iconFromWmo(code: number): { icon: WeatherIcon; label: string } {
  if (code === 0) return { icon: 'sun', label: 'Clear' }
  if (code <= 2) return { icon: 'partly', label: 'Partly cloudy' }
  if (code === 3) return { icon: 'cloud', label: 'Cloudy' }
  if (code === 45 || code === 48) return { icon: 'fog', label: 'Fog' }
  if (code >= 71 && code <= 77) return { icon: 'snow', label: 'Snow' }
  if (code >= 95) return { icon: 'storm', label: 'Storm' }
  if (code >= 51) return { icon: 'rain', label: 'Rain' }
  return { icon: 'cloud', label: 'Cloudy' }
}

function iconFromOwm(id: number): { icon: WeatherIcon; label: string } {
  if (id >= 200 && id < 300) return { icon: 'storm', label: 'Storm' }
  if (id >= 300 && id < 600) return { icon: 'rain', label: 'Rain' }
  if (id >= 600 && id < 700) return { icon: 'snow', label: 'Snow' }
  if (id >= 700 && id < 800) return { icon: 'fog', label: 'Fog' }
  if (id === 800) return { icon: 'sun', label: 'Clear' }
  if (id === 801) return { icon: 'partly', label: 'Partly cloudy' }
  return { icon: 'cloud', label: 'Cloudy' }
}

async function resolveLocation(city: string): Promise<{ lat: number; lon: number; name: string }> {
  if (city.trim()) {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1`)
    const json = await response.json()
    const result = json.results?.[0]
    if (!result) throw new Error('City not found')
    return { lat: result.latitude, lon: result.longitude, name: result.name }
  }
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 60 * 60 * 1000 })
  })
  return { lat: position.coords.latitude, lon: position.coords.longitude, name: 'Nearby' }
}

async function loadOpenMeteo(lat: number, lon: number): Promise<ForecastDay[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
  const response = await fetch(url)
  const json = await response.json()
  return (json.daily?.time ?? []).map((date: string, index: number) => {
    const mapped = iconFromWmo(json.daily.weather_code[index] ?? 0)
    return {
      date,
      label: mapped.label,
      icon: mapped.icon,
      high: json.daily.temperature_2m_max[index],
      low: json.daily.temperature_2m_min[index],
    }
  })
}

async function loadOpenWeather(lat: number, lon: number, apiKey: string): Promise<ForecastDay[]> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(apiKey)}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('OpenWeather request failed')
  const json = await response.json()
  const buckets = new Map<string, { highs: number[]; lows: number[]; ids: number[] }>()
  for (const item of json.list ?? []) {
    const date = toDateKey(new Date(item.dt * 1000))
    const bucket = buckets.get(date) ?? { highs: [], lows: [], ids: [] }
    bucket.highs.push(item.main.temp_max)
    bucket.lows.push(item.main.temp_min)
    bucket.ids.push(item.weather?.[0]?.id ?? 800)
    buckets.set(date, bucket)
  }
  return Array.from(buckets.entries())
    .slice(0, 7)
    .map(([date, bucket]) => {
      const mapped = iconFromOwm(bucket.ids.sort((a, b) => a - b)[Math.floor(bucket.ids.length / 2)] ?? 800)
      return {
        date,
        label: mapped.label,
        icon: mapped.icon,
        high: Math.max(...bucket.highs),
        low: Math.min(...bucket.lows),
      }
    })
}

async function load(city: string, apiKey: string): Promise<void> {
  const key = `${city}|${apiKey}`
  if (requestKey === key && snapshot.days.length) return
  requestKey = key
  try {
    const location = await resolveLocation(city)
    const days = apiKey.trim() ? await loadOpenWeather(location.lat, location.lon, apiKey.trim()) : await loadOpenMeteo(location.lat, location.lon)
    if (requestKey !== key) return
    snapshot.days = days
    snapshot.place = location.name
    snapshot.error = ''
    emit()
  } catch (error) {
    if (requestKey !== key) return
    snapshot.days = []
    snapshot.place = ''
    snapshot.error = error instanceof Error ? error.message : 'Weather unavailable'
    emit()
  }
}

export function useWeather(): WeatherSnapshot {
  const city = useSettingsStore((state) => state.weatherCity)
  const enabled = useSettingsStore((state) => state.weatherEnabled)
  const apiKey = useSettingsStore((state) => state.openWeatherKey)
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    if (!enabled) {
      requestKey = ''
      snapshot.days = []
      snapshot.place = ''
      snapshot.error = ''
      emit()
      return
    }
    void load(city, apiKey)
  }, [city, enabled, apiKey])
  return current
}
