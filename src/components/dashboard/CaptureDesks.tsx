import { useMemo, useState } from 'react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { parseDateKey, toDateKey } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { useDashboardStore, type MediaKind } from '@/store/dashboardStore'
import { CheckDot, EmptyCopy, NOTE_COLORS, RemoveButton } from '@/components/dashboard/ui'
import { Desk, Panel } from '@/components/dashboard/chrome'
import { DateField } from '@/components/ui/DateField'

const MEDIA: { id: MediaKind; label: string }[] = [
  { id: 'books', label: 'Books' },
  { id: 'movies', label: 'Movies' },
  { id: 'anime', label: 'Anime' },
]

export function NotesDesk() {
  const notes = useDashboardStore((state) => state.notes)
  const color = useDashboardStore((state) => state.noteColor)
  const setColor = useDashboardStore((state) => state.setNoteColor)
  const add = useDashboardStore((state) => state.addNote)
  const remove = useDashboardStore((state) => state.removeNote)
  const [text, setText] = useState('')

  return (
    <Desk title="Notes" detail={notes.length ? `${notes.length} saved` : 'Short things you don’t want to lose'}>
      <Panel>
        <form
          className="border-b border-divider p-3"
          onSubmit={(event) => {
            event.preventDefault()
            add(text)
            setText('')
          }}
        >
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a note" className="field min-h-[88px] w-full resize-none" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {NOTE_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label="Note color"
                  onClick={() => setColor(swatch)}
                  className={cn('h-4 w-4 rounded-full', color === swatch && 'ring-2 ring-accent-blue ring-offset-2 ring-offset-[rgb(var(--bg-primary))]')}
                  style={{ background: swatch }}
                />
              ))}
            </div>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
        <div className="p-2">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-fill/8">
              <span className="mt-0.5 h-full w-[3px] self-stretch rounded-full" style={{ background: note.color }} />
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{note.text}</p>
                <p className="mt-1 text-[11px] text-tertiary">{noteAge(note.createdAt)}</p>
              </div>
              <RemoveButton label="Delete note" onClick={() => remove(note.id)} />
            </div>
          ))}
          {notes.length === 0 && <EmptyCopy>Notes you save stay on this machine.</EmptyCopy>}
        </div>
      </Panel>
    </Desk>
  )
}

export function JournalDesk({ now }: { now: Date }) {
  const journal = useDashboardStore((state) => state.journal)
  const setJournal = useDashboardStore((state) => state.setJournal)
  const today = toDateKey(now)
  const [day, setDay] = useState(today)
  const days = useMemo(() => {
    const keys = Object.entries(journal)
      .filter(([key, text]) => key !== today && text.trim())
      .map(([key]) => key)
      .sort((a, b) => b.localeCompare(a))
    return [today, ...keys]
  }, [journal, today])
  const listed = days.includes(day) ? days : [today, day, ...days.filter((key) => key !== today)]
  const active = listed.includes(day) ? day : today
  const text = journal[active] ?? ''
  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <Desk title="Journal" detail={words ? `${words} ${words === 1 ? 'word' : 'words'}` : 'One page per day'}>
      <div className="grid min-h-[520px] flex-1 gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        <Panel className="overflow-auto">
          <div className="p-2">
            {listed.map((key) => {
              const date = parseDateKey(key)
              const filled = !!(journal[key] ?? '').trim()
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDay(key)}
                  className={cn('flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left', active === key ? 'bg-fill/10' : 'hover:bg-fill/8')}
                >
                  <span className="text-[13px]">{key === today ? 'Today' : format(date, 'EEE, MMM d')}</span>
                  {filled && <span className="h-1.5 w-1.5 rounded-full bg-accent-blue" />}
                </button>
              )
            })}
          </div>
          <div className="border-t border-divider p-2">
            <DateField value={active} onChange={setDay} label="Open a day" className="w-full" display="short" />
          </div>
        </Panel>
        <Panel className="flex min-h-[420px] flex-col p-3">
          <div className="mb-2 text-[12px] text-secondary">{active === today ? format(now, 'EEEE, MMMM d') : format(parseDateKey(active), 'EEEE, MMMM d, yyyy')}</div>
          <textarea
            value={journal[active] ?? ''}
            onChange={(event) => setJournal(active, event.target.value)}
            placeholder="Write about this day."
            className="field min-h-[360px] w-full flex-1 resize-none text-[14px] leading-relaxed"
          />
        </Panel>
      </div>
    </Desk>
  )
}

export function LibraryDesk() {
  const media = useDashboardStore((state) => state.media)
  const add = useDashboardStore((state) => state.addMedia)
  const toggle = useDashboardStore((state) => state.toggleMedia)
  const remove = useDashboardStore((state) => state.removeMedia)
  const [kind, setKind] = useState<MediaKind>('books')
  const [title, setTitle] = useState('')
  const visible = media.filter((item) => item.kind === kind)
  const queue = visible.filter((item) => !item.done)
  const finished = visible.filter((item) => item.done)
  const noun = MEDIA.find((item) => item.id === kind)?.label ?? 'Titles'

  return (
    <Desk title="Watch & read" detail={`${queue.length} waiting · ${finished.length} finished in ${noun.toLowerCase()}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {MEDIA.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setKind(item.id)}
            className={cn('h-7 rounded-full px-3 text-[12px] font-medium', kind === item.id ? 'bg-accent-blue text-white' : 'bg-primary text-secondary shadow-card')}
          >
            {item.label}
          </button>
        ))}
      </div>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          add(title, kind)
          setTitle('')
        }}
      >
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${noun.replace(/s$/, '')} title`} className="field min-w-0 flex-1" />
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Up next</div>
          <div className="p-2">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fill/8">
                <CheckDot checked={false} onClick={() => toggle(item.id)} label={`Finish ${item.title}`} />
                <span className="min-w-0 flex-1 truncate text-[13px]">{item.title}</span>
                <RemoveButton label="Remove title" onClick={() => remove(item.id)} />
              </div>
            ))}
            {queue.length === 0 && <EmptyCopy>Nothing waiting in {noun.toLowerCase()}.</EmptyCopy>}
          </div>
        </Panel>
        <Panel>
          <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Finished</div>
          <div className="p-2">
            {finished.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fill/8">
                <CheckDot checked onClick={() => toggle(item.id)} label={`Move ${item.title} back`} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-secondary line-through">{item.title}</span>
                <RemoveButton label="Remove title" onClick={() => remove(item.id)} />
              </div>
            ))}
            {finished.length === 0 && <EmptyCopy>Finished titles land here.</EmptyCopy>}
          </div>
        </Panel>
      </div>
    </Desk>
  )
}

function noteAge(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatDistanceToNowStrict(date, { addSuffix: true })
}
