import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon } from 'lucide-react'
import { EASE } from '@/lib/constants'
import { formatTime } from '@/lib/dates'
import { prayerSchedule } from '@/lib/prayerTimes'
import { useSettingsStore } from '@/store/settingsStore'

const SHOW_MS = 5_000
const CYCLE_MS = 30_000

export function NamazFlash() {
  const [visible, setVisible] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const info = useMemo(() => namazInfo(now), [now])

  useEffect(() => {
    let hideTimer = 0
    const reveal = () => {
      setNow(new Date())
      setVisible(true)
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setVisible(false), SHOW_MS)
    }
    reveal()
    const cycle = window.setInterval(reveal, CYCLE_MS)
    return () => {
      window.clearInterval(cycle)
      window.clearTimeout(hideTimer)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[12px] bg-[rgb(var(--bg-sidebar))] px-3 py-3 text-center"
        >
          <div className="mb-2.5 flex items-center justify-center gap-1.5 text-secondary">
            <Moon size={12} strokeWidth={2.2} />
            <span className="text-[10px] font-semibold tracking-[0.14em]">NAMAZ WAQT</span>
          </div>
          <div className="w-full space-y-2.5">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-tertiary">
                Next{info.nextTomorrow ? ' · tomorrow' : ''}
              </div>
              <div className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em]">
                {info.nextName}{' '}
                <span className="tabular-nums text-accent-blue">{formatMinutes(info.nextAt, timeFormat)}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-tertiary">Current ends</div>
              <div className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em]">
                {info.currentName}{' '}
                <span className="tabular-nums text-secondary">{formatMinutes(info.currentEnds, timeFormat)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function namazInfo(now: Date) {
  const today = prayerSchedule(now)
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = prayerSchedule(tomorrowDate)
  const minute = now.getHours() * 60 + now.getMinutes()

  const upcomingIndex = today.findIndex((prayer) => prayer.minutes > minute)
  const currentIndex = upcomingIndex === -1 ? today.length - 1 : upcomingIndex - 1

  if (currentIndex < 0) {
    return {
      nextName: today[0].name,
      nextAt: today[0].minutes,
      nextTomorrow: false,
      currentName: 'Isha',
      currentEnds: today[0].minutes,
    }
  }

  if (upcomingIndex === -1) {
    return {
      nextName: tomorrow[0].name,
      nextAt: tomorrow[0].minutes,
      nextTomorrow: true,
      currentName: today[currentIndex].name,
      currentEnds: tomorrow[0].minutes,
    }
  }

  return {
    nextName: today[upcomingIndex].name,
    nextAt: today[upcomingIndex].minutes,
    nextTomorrow: false,
    currentName: today[currentIndex].name,
    currentEnds: today[upcomingIndex].minutes,
  }
}

function formatMinutes(minutes: number, timeFormat: '12h' | '24h') {
  const date = new Date()
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return formatTime(date, timeFormat)
}
