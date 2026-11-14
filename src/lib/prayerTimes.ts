export interface Salah {
  id: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
  name: string
  minutes: number
}

const LAT = 23.8103
const LNG = 90.4125
const TZ = 6

const sin = (deg: number) => Math.sin((deg * Math.PI) / 180)
const cos = (deg: number) => Math.cos((deg * Math.PI) / 180)
const tan = (deg: number) => Math.tan((deg * Math.PI) / 180)
const asin = (value: number) => (Math.asin(value) * 180) / Math.PI
const acos = (value: number) => (Math.acos(value) * 180) / Math.PI
const atan = (value: number) => (Math.atan(value) * 180) / Math.PI
const atan2 = (y: number, x: number) => (Math.atan2(y, x) * 180) / Math.PI

function wrap(value: number, span: number) {
  const next = value % span
  return next < 0 ? next + span : next
}

function julian(year: number, month: number, day: number) {
  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const century = Math.floor(y / 100)
  const gregorian = 2 - century + Math.floor(century / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + gregorian - 1524.5
}

function sunPosition(jd: number) {
  const days = jd - 2451545.0
  const anomaly = wrap(357.529 + 0.98560028 * days, 360)
  const mean = wrap(280.459 + 0.98564736 * days, 360)
  const ecliptic = wrap(mean + 1.915 * sin(anomaly) + 0.02 * sin(2 * anomaly), 360)
  const obliquity = 23.439 - 0.00000036 * days
  const ascension = atan2(cos(obliquity) * sin(ecliptic), cos(ecliptic)) / 15
  return {
    declination: asin(sin(obliquity) * sin(ecliptic)),
    equation: mean / 15 - wrap(ascension, 24),
  }
}

function toMinutes(hours: number) {
  let total = Math.round(hours * 60)
  total = ((total % 1440) + 1440) % 1440
  return total
}

export function prayerSchedule(date: Date): Salah[] {
  const jDate = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - LNG / (15 * 24)
  const midday = (time: number) => wrap(12 - sunPosition(jDate + time).equation, 24)
  const angleTime = (angle: number, time: number, ccw = false) => {
    const declination = sunPosition(jDate + time).declination
    const noon = midday(time)
    const raw = (-sin(angle) - sin(declination) * sin(LAT)) / (cos(declination) * cos(LAT))
    if (raw < -1 || raw > 1) return noon
    const offset = acos(raw) / 15
    return noon + (ccw ? -offset : offset)
  }
  const asrAltitude = (time: number) => {
    const declination = sunPosition(jDate + time).declination
    return -atan(1 / (2 + tan(Math.abs(LAT - declination))))
  }
  const shift = TZ - LNG / 15
  const pack = (id: Salah['id'], name: string, hours: number): Salah => ({ id, name, minutes: toMinutes(hours + shift) })
  return [
    pack('fajr', 'Fajr', angleTime(18, 5 / 24, true)),
    pack('dhuhr', 'Dhuhr', midday(12 / 24)),
    pack('asr', 'Asr', angleTime(asrAltitude(13 / 24), 13 / 24)),
    pack('maghrib', 'Maghrib', angleTime(0.833, 18 / 24)),
    pack('isha', 'Isha', angleTime(18, 18 / 24)),
  ]
}
