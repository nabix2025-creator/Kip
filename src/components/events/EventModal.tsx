import { format, parseISO, addMinutes, differenceInMinutes } from 'date-fns'
import { useEffect, useState } from 'react'
import { PALETTE, REMINDER_PRESETS } from '@/lib/constants'
import { toDateKey } from '@/lib/dates'
import { describeRecurrence } from '@/lib/recurrence'
import type { CalendarEvent, EventDraft, Recurrence } from '@/types'
import { DateField } from '@/components/ui/DateField'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { TimeField } from '@/components/ui/TimeField'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'

export function EventModal() {
  const modal = useCalendarStore((state) => state.eventModal)
  const close = () => useCalendarStore.setState({ eventModal: null })
  return (
    <Modal open={!!modal} onClose={close} width={460} anchor={modal?.anchor}>
      {modal && <EventForm key={`${modal.mode}-${modal.draft.start}-${modal.draft.title}`} modal={modal} onClose={close} />}
    </Modal>
  )
}

function EventForm({
  modal,
  onClose,
}: {
  modal: NonNullable<ReturnType<typeof useCalendarStore.getState>['eventModal']>
  onClose: () => void
}) {
  const calendars = useCalendarStore((state) => state.calendars)
  const addEvent = useEventStore((state) => state.addEvent)
  const updateEvent = useEventStore((state) => state.updateEvent)
  const deleteEvent = useEventStore((state) => state.deleteEvent)
  const [draft, setDraft] = useState<EventDraft>(modal.draft)
  const [scope, setScope] = useState<'single' | 'series'>(modal.series ? 'series' : 'single')
  const [customReminder, setCustomReminder] = useState('')
  const recurring = Boolean(draft.seriesId || draft.recurrence)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, scope])

  const patch = (partial: Partial<EventDraft>) => setDraft((current) => ({ ...current, ...partial }))

  const setStart = (isoDate: string, time: string) => {
    const start = combine(isoDate, draft.allDay ? '00:00' : time)
    const duration = Math.max(15, differenceInMinutes(parseISO(draft.end), parseISO(draft.start)))
    patch({ start: start.toISOString(), end: draft.allDay ? addMinutes(start, 24 * 60).toISOString() : addMinutes(start, duration).toISOString() })
  }

  const save = () => {
    if (modal.mode === 'create') {
      addEvent(draft)
      onClose()
      return
    }
    if (draft.seriesId && scope === 'single') {
      const snapshot = useCalendarStore.getState().popover?.event
      const occurrence =
        snapshot ?? eventFromDraft(draft, `${draft.seriesId}@${toDateKey(parseISO(draft.start))}`)
      deleteEvent(occurrence, 'single')
      addEvent({ ...draft, recurrence: null, seriesId: undefined, externalId: undefined })
      onClose()
      return
    }
    if (draft.seriesId && scope === 'series') {
      const master = useEventStore.getState().events.find((event) => event.id === draft.seriesId)
      if (!master) return
      const masterStart = parseISO(master.start)
      const nextStart = parseISO(draft.start)
      if (!draft.allDay) masterStart.setHours(nextStart.getHours(), nextStart.getMinutes(), 0, 0)
      const duration = Math.max(15, differenceInMinutes(parseISO(draft.end), parseISO(draft.start)))
      const masterEnd = draft.allDay ? addMinutes(new Date(masterStart.getFullYear(), masterStart.getMonth(), masterStart.getDate()), 24 * 60) : addMinutes(masterStart, duration)
      updateEvent(master.id, {
        title: draft.title.trim() || 'New Event',
        calendarId: draft.calendarId,
        location: draft.location.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        allDay: draft.allDay,
        recurrence: draft.recurrence || undefined,
        reminders: draft.reminders,
        start: (draft.allDay ? new Date(masterStart.getFullYear(), masterStart.getMonth(), masterStart.getDate()) : masterStart).toISOString(),
        end: masterEnd.toISOString(),
      })
      onClose()
      return
    }
    if (draft.id) {
      updateEvent(draft.id, {
        title: draft.title.trim() || 'New Event',
        calendarId: draft.calendarId,
        location: draft.location.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        allDay: draft.allDay,
        recurrence: draft.recurrence || undefined,
        reminders: draft.reminders,
        start: draft.start,
        end: draft.end,
      })
    }
    onClose()
  }

  const startDate = toDateKey(parseISO(draft.start))
  const endDate = toDateKey(parseISO(draft.end))
  const startTime = format(parseISO(draft.start), 'HH:mm')
  const endTime = format(parseISO(draft.end), 'HH:mm')

  return (
    <form
      className="p-4"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <input
        autoFocus
        value={draft.title}
        onChange={(event) => patch({ title: event.target.value })}
        placeholder="Event title"
        className="w-full bg-transparent text-header font-semibold outline-none placeholder:text-tertiary"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {calendars.map((calendar) => (
          <button
            key={calendar.id}
            type="button"
            onClick={() => patch({ calendarId: calendar.id })}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[12px]"
            style={{
              background: draft.calendarId === calendar.id ? calendar.color : 'transparent',
              color: draft.calendarId === calendar.id ? '#fff' : undefined,
              boxShadow: `inset 0 0 0 1px ${calendar.color}`,
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: draft.calendarId === calendar.id ? '#fff' : calendar.color }} />
            {calendar.name}
          </button>
        ))}
      </div>
      <label className="mt-4 flex items-center justify-between text-body">
        All-day
        <Switch
          checked={draft.allDay}
          onChange={(allDay) => {
            if (allDay) {
              const start = new Date(parseISO(draft.start))
              start.setHours(0, 0, 0, 0)
              patch({ allDay, start: start.toISOString(), end: addMinutes(start, 24 * 60).toISOString() })
            } else patch({ allDay })
          }}
        />
      </label>
      <div className={draft.allDay ? 'mt-3 grid grid-cols-[72px_1fr] items-center gap-2 text-body' : 'mt-3 grid grid-cols-[72px_1fr_1fr] items-center gap-2 text-body'}>
        <span className="text-secondary">Starts</span>
        <DateField value={startDate} onChange={(next) => setStart(next, startTime)} label="Start date" />
        {!draft.allDay && <TimeField value={startTime} onChange={(next) => setStart(startDate, next)} label="Start time" />}
        <span className="text-secondary">Ends</span>
        <DateField
          value={endDate}
          onChange={(next) => patch({ end: combine(next, draft.allDay ? '00:00' : endTime).toISOString() })}
          label="End date"
        />
        {!draft.allDay && (
          <TimeField value={endTime} onChange={(next) => patch({ end: combine(endDate, next).toISOString() })} label="End time" />
        )}
      </div>
      <input value={draft.location} onChange={(event) => patch({ location: event.target.value })} placeholder="Location" className="field mt-3 w-full" />
      <textarea value={draft.notes} onChange={(event) => patch({ notes: event.target.value })} placeholder="Notes" rows={3} className="field mt-2 w-full resize-none" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Select
          value={presetValue(draft.recurrence)}
          onChange={(next) => patch({ recurrence: presetRecurrence(next, draft.recurrence) })}
          label="Repeat"
          options={[
            { value: 'none', label: 'Does not repeat' },
            { value: 'daily', label: 'Every day' },
            { value: 'weekly', label: 'Every week' },
            { value: 'monthly', label: 'Every month' },
            { value: 'yearly', label: 'Every year' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        <Select
          value={String(draft.reminders[0] ?? '')}
          onChange={(next) => patch({ reminders: next ? [Number(next)] : [] })}
          label="Alert"
          options={[
            { value: '', label: 'No alert' },
            ...REMINDER_PRESETS.map((preset) => ({ value: String(preset.minutes), label: preset.label })),
          ]}
        />
      </div>
      {presetValue(draft.recurrence) === 'custom' && draft.recurrence && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-body">
          <span className="text-secondary">Every</span>
          <input
            type="number"
            min={1}
            value={draft.recurrence.interval}
            onChange={(event) => patch({ recurrence: { ...draft.recurrence!, interval: Number(event.target.value) || 1 } })}
            className="field w-16"
          />
          <Select
            value={draft.recurrence.freq}
            onChange={(next) => patch({ recurrence: { ...draft.recurrence!, freq: next as Recurrence['freq'] } })}
            label="Repeat unit"
            className="w-28"
            options={[
              { value: 'daily', label: 'day' },
              { value: 'weekly', label: 'week' },
              { value: 'monthly', label: 'month' },
              { value: 'yearly', label: 'year' },
            ]}
          />
          {draft.recurrence.freq === 'weekly' &&
            ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => {
              const active = draft.recurrence?.byWeekday?.includes(index)
              return (
                <button
                  key={`${label}-${index}`}
                  type="button"
                  onClick={() => {
                    const current = new Set(draft.recurrence?.byWeekday ?? [])
                    if (current.has(index)) current.delete(index)
                    else current.add(index)
                    patch({ recurrence: { ...draft.recurrence!, byWeekday: Array.from(current).sort() } })
                  }}
                  className="h-7 w-7 rounded-full text-[11px]"
                  style={{ background: active ? '#0A84FF' : undefined, color: active ? '#fff' : undefined }}
                >
                  {label}
                </button>
              )
            })}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <input
          value={customReminder}
          onChange={(event) => setCustomReminder(event.target.value)}
          placeholder="Custom minutes before"
          className="field flex-1"
        />
        <button
          type="button"
          className="rounded-lg bg-tertiary px-3 text-body"
          onClick={() => {
            const minutes = Number(customReminder)
            if (!minutes) return
            patch({ reminders: Array.from(new Set([...draft.reminders, minutes])).sort((a, b) => a - b) })
            setCustomReminder('')
          }}
        >
          Add alert
        </button>
      </div>
      {draft.reminders.length > 0 && <div className="mt-1 text-[12px] text-secondary">{draft.reminders.map((minutes) => `${minutes} min`).join(' · ')}</div>}
      {describeRecurrence({ recurrence: draft.recurrence ?? undefined }) && (
        <div className="mt-1 text-[12px] text-secondary">{describeRecurrence({ recurrence: draft.recurrence ?? undefined })}</div>
      )}
      {recurring && modal.mode === 'edit' && (
        <div className="mt-3 flex gap-2 text-[12px]">
          <button type="button" className={scope === 'single' ? 'text-accent-blue' : 'text-secondary'} onClick={() => setScope('single')}>
            This event
          </button>
          <button type="button" className={scope === 'series' ? 'text-accent-blue' : 'text-secondary'} onClick={() => setScope('series')}>
            All events
          </button>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        {modal.mode === 'edit' ? (
          <button
            type="button"
            className="text-body text-accent-red"
            onClick={() => {
              void import('@/store/confirmStore').then(({ askConfirm }) =>
                askConfirm({
                  title: scope === 'series' ? 'Delete entire series?' : 'Delete event?',
                  body: draft.title || 'This event',
                  confirmLabel: scope === 'series' ? 'Delete series' : 'Delete',
                }).then((ok) => {
                  if (!ok) return
                  const events = useEventStore.getState().events
                  const stored = events.find((event) => event.id === (draft.seriesId && scope === 'series' ? draft.seriesId : draft.id))
                  const target =
                    stored ??
                    eventFromDraft(draft, draft.seriesId ? `${draft.seriesId}@${toDateKey(parseISO(draft.start))}` : draft.id || '')
                  deleteEvent(target, scope)
                  onClose()
                }),
              )
            }}
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-body text-secondary hover:bg-tertiary">
            Cancel
          </button>
          <button type="submit" className="h-9 rounded-lg bg-accent-blue px-4 text-body font-medium text-white">
            {modal.mode === 'create' ? 'Add Event' : 'Save'}
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {PALETTE.map((swatch) => (
          <span key={swatch.id} className="h-2 w-2 rounded-full" style={{ background: swatch.value }} />
        ))}
      </div>
    </form>
  )
}

function combine(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0)
}

function presetValue(recurrence: Recurrence | null): string {
  if (!recurrence) return 'none'
  if (recurrence.interval > 1 || (recurrence.byWeekday && recurrence.byWeekday.length > 1) || recurrence.until || recurrence.count) return 'custom'
  return recurrence.freq
}

function presetRecurrence(value: string, current: Recurrence | null): Recurrence | null {
  if (value === 'none') return null
  if (value === 'custom') return current ?? { freq: 'weekly', interval: 1, byWeekday: [new Date().getDay()] }
  return { freq: value as Recurrence['freq'], interval: 1 }
}

function eventFromDraft(draft: EventDraft, id: string): CalendarEvent {
  const stamp = new Date().toISOString()
  return {
    id,
    calendarId: draft.calendarId,
    title: draft.title,
    start: draft.start,
    end: draft.end,
    allDay: draft.allDay,
    location: draft.location || undefined,
    notes: draft.notes || undefined,
    recurrence: draft.recurrence ?? undefined,
    reminders: draft.reminders,
    seriesId: draft.seriesId,
    externalId: draft.externalId,
    createdAt: stamp,
    updatedAt: stamp,
  }
}
