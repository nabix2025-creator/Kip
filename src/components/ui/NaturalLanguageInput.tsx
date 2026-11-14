import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { formatTime } from '@/lib/dates'
import { parseNaturalLanguage } from '@/lib/nlpParser'
import { Modal } from '@/components/ui/Modal'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useSettingsStore } from '@/store/settingsStore'
import { blankDraft } from '@/lib/draft'

export function NaturalLanguageInput() {
  const open = useCalendarStore((state) => state.nlOpen)
  const close = () => useCalendarStore.setState({ nlOpen: false })
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const timeFormat = useSettingsStore((state) => state.timeFormat)
  const calendars = useCalendarStore((state) => state.calendars)
  const defaultCalendarId = useSettingsStore((state) => state.defaultCalendarId)
  const [calendarId, setCalendarId] = useState(defaultCalendarId)
  const parsed = useMemo(() => parseNaturalLanguage(text), [text])

  useEffect(() => {
    if (open) {
      setText('')
      setError('')
      setCalendarId(useSettingsStore.getState().defaultCalendarId)
    }
  }, [open])

  const create = () => {
    if (!parsed.start || !parsed.end) {
      setError('Add a date — try “tomorrow at 3pm”.')
      return
    }
    useEventStore.getState().addEvent(
      blankDraft({
        title: parsed.title,
        start: parsed.start.toISOString(),
        end: parsed.end.toISOString(),
        allDay: parsed.allDay,
        location: parsed.location ?? '',
        calendarId,
      }),
    )
    useCalendarStore.getState().setSelectedDate(format(parsed.start, 'yyyy-MM-dd'))
    close()
  }

  return (
    <Modal open={open} onClose={close} width={560}>
      <form
        className="p-4"
        onSubmit={(event) => {
          event.preventDefault()
          create()
        }}
      >
        <input
          autoFocus
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setError('')
          }}
          placeholder="Meeting with Rahim tomorrow 3pm for 1 hour"
          className="w-full bg-transparent text-header font-medium outline-none placeholder:text-tertiary"
        />
        <div className="mt-4 rounded-card bg-fill/10 p-4">
          {parsed.start ? (
            <>
              <div className="text-[17px] font-semibold tracking-[-0.02em]">{parsed.title}</div>
              <div className="mt-1 text-[15px] text-secondary">
                {parsed.allDay
                  ? `${format(parsed.start, 'EEEE, MMMM d')} · All-day`
                  : `${format(parsed.start, 'EEE, MMM d')} · ${formatTime(parsed.start, timeFormat)} – ${formatTime(parsed.end ?? parsed.start, timeFormat)}`}
              </div>
              {parsed.location && <div className="mt-1 text-[15px] text-accent-blue">{parsed.location}</div>}
            </>
          ) : (
            <div className="text-[15px] text-secondary">Type a title, day, and time. Enter adds it, Escape cancels.</div>
          )}
          {error && <div className="mt-2 text-[15px] text-accent-red">{error}</div>}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {calendars.map((calendar) => (
            <button
              key={calendar.id}
              type="button"
              onClick={() => setCalendarId(calendar.id)}
              className="rounded-pill px-3 py-1.5 text-[12px] font-semibold"
              style={{
                background: calendarId === calendar.id ? calendar.color : 'rgb(var(--bg-fill) / 0.12)',
                color: calendarId === calendar.id ? '#fff' : undefined,
              }}
            >
              {calendar.name}
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-between">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (!parsed.start || !parsed.end) return
              useCalendarStore.getState().openEventModal({
                mode: 'create',
                series: false,
                draft: blankDraft({
                  title: parsed.title,
                  start: parsed.start.toISOString(),
                  end: parsed.end.toISOString(),
                  allDay: parsed.allDay,
                  location: parsed.location ?? '',
                  calendarId,
                }),
              })
            }}
          >
            Edit Details
          </button>
          <button type="submit" className="btn-primary">
            Add Event
          </button>
        </div>
      </form>
    </Modal>
  )
}
