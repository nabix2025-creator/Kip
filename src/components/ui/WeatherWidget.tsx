import { Cloud, CloudLightning, CloudRain, CloudSnow, Sun } from 'lucide-react'
import { toDateKey } from '@/lib/dates'
import { useWeather, type WeatherIcon } from '@/lib/weather'
import { useSettingsStore } from '@/store/settingsStore'

export function WeatherWidget({ date }: { date: Date }) {
  const enabled = useSettingsStore((state) => state.weatherEnabled)
  const { days } = useWeather()
  if (!enabled) return null
  const match = days.find((day) => day.date === toDateKey(date))
  if (!match) return <div className="h-4" />
  return (
    <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-secondary" title={`${match.label} · ${Math.round(match.low)}° / ${Math.round(match.high)}°`}>
      <WeatherGlyph kind={match.icon} />
      <span>{Math.round(match.high)}°</span>
    </div>
  )
}

function WeatherGlyph({ kind }: { kind: WeatherIcon }) {
  const props = { size: 12, strokeWidth: 2 }
  if (kind === 'sun') return <Sun {...props} />
  if (kind === 'rain') return <CloudRain {...props} />
  if (kind === 'snow') return <CloudSnow {...props} />
  if (kind === 'storm') return <CloudLightning {...props} />
  if (kind === 'partly') return <Sun {...props} />
  return <Cloud {...props} />
}
