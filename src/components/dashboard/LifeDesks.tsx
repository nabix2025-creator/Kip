import { useState } from 'react'
import { addMonths, format, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { useDashboardStore, type MoneyKind } from '@/store/dashboardStore'
import { IconButton } from '@/components/ui/IconButton'
import { CheckDot, EmptyCopy, RemoveButton, withProtocol } from '@/components/dashboard/ui'
import { Desk, Panel, readPrice, taka } from '@/components/dashboard/chrome'
import { useHeadlines } from '@/components/dashboard/headlines'
import { DateField } from '@/components/ui/DateField'

export function FinanceDesk({ now }: { now: Date }) {
  const ledger = useDashboardStore((state) => state.ledger)
  const add = useDashboardStore((state) => state.addLedger)
  const remove = useDashboardStore((state) => state.removeLedger)
  const [month, setMonth] = useState(() => startOfMonth(now))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState(toDateKey(now))
  const [kind, setKind] = useState<MoneyKind>('expense')
  const key = format(month, 'yyyy-MM')
  const entries = ledger.filter((entry) => entry.day.startsWith(key))
  const income = entries.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amount : 0), 0)
  const expense = entries.reduce((sum, entry) => sum + (entry.kind === 'expense' ? entry.amount : 0), 0)
  const left = income - expense
  const balance = ledger.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amount : -entry.amount), 0)
  const groups = groupByDay(entries)

  return (
    <Desk
      title="Finance"
      detail={`${taka(balance)} all time`}
      extra={
        <div className="flex items-center gap-1">
          <IconButton aria-label="Previous month" onClick={() => setMonth((value) => addMonths(value, -1))}>
            <ChevronLeft size={16} />
          </IconButton>
          <span className="min-w-[118px] text-center text-[13px] font-medium">{format(month, 'MMMM yyyy')}</span>
          <IconButton aria-label="Next month" onClick={() => setMonth((value) => addMonths(value, 1))}>
            <ChevronRight size={16} />
          </IconButton>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Figure label="In" value={taka(income)} tone="good" />
        <Figure label="Out" value={taka(expense)} />
        <Figure label="Left" value={taka(left)} tone={left < 0 ? 'bad' : left > 0 ? 'good' : undefined} />
      </div>
      <Panel>
        <form
          className="flex flex-wrap items-center gap-2 border-b border-divider p-3"
          onSubmit={(event) => {
            event.preventDefault()
            add({ description, amount: Number(amount), kind, day })
            if (day && !day.startsWith(key)) {
              const [year, monthIndex] = day.split('-').map(Number)
              if (year && monthIndex) setMonth(new Date(year, monthIndex - 1, 1))
            }
            setDescription('')
            setAmount('')
          }}
        >
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What was it?" className="field min-w-[160px] flex-1" />
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Amount" aria-label="Amount" className="field w-24" />
          <DateField value={day} onChange={setDay} label="Date" className="w-[148px]" />
          <button type="button" onClick={() => setKind('expense')} className={cn('h-8 rounded-full px-3 text-[12px] font-semibold', kind === 'expense' ? 'bg-accent-red text-white' : 'bg-fill/10 text-secondary')}>
            Out
          </button>
          <button type="button" onClick={() => setKind('income')} className={cn('h-8 rounded-full px-3 text-[12px] font-semibold', kind === 'income' ? 'bg-accent-green text-white' : 'bg-fill/10 text-secondary')}>
            In
          </button>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
        <div className="p-2">
          {groups.map((group) => (
            <div key={group.day} className="mb-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-tertiary">{format(new Date(`${group.day}T12:00:00`), 'EEE, MMM d')}</div>
              {group.entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fill/8">
                  <span className="min-w-0 flex-1 truncate text-[13px]">{entry.description}</span>
                  <span className={cn('text-[13px] font-medium tabular-nums', entry.kind === 'income' ? 'text-accent-green' : 'text-primary')}>
                    {entry.kind === 'income' ? '+' : '−'}
                    {taka(entry.amount)}
                  </span>
                  <RemoveButton label="Delete entry" onClick={() => remove(entry.id)} />
                </div>
              ))}
            </div>
          ))}
          {entries.length === 0 && <EmptyCopy>Nothing logged in {format(month, 'MMMM')}.</EmptyCopy>}
        </div>
      </Panel>
    </Desk>
  )
}

export function NewsDesk() {
  const { items, status, refresh } = useHeadlines()
  return (
    <Desk
      title="Local news"
      detail="BBC Bangla"
      extra={
        <button type="button" onClick={refresh} className="mac-toolbar-btn inline-flex items-center gap-1.5">
          <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <Panel>
        <div className="divide-y divide-divider">
          {items.map((item) => (
            <a key={item.link} href={item.link} target="_blank" rel="noreferrer" className="block px-4 py-3 hover:bg-fill/8">
              <div className="text-[15px] font-medium leading-snug tracking-[-0.02em]">{item.title}</div>
              <div className="mt-1 text-[12px] text-tertiary">
                {item.source}
                {item.ago ? ` · ${item.ago}` : ''}
              </div>
            </a>
          ))}
        </div>
        {status === 'loading' && items.length === 0 && <EmptyCopy>Loading headlines…</EmptyCopy>}
        {status === 'error' && items.length === 0 && <EmptyCopy>Couldn’t reach BBC Bangla. Refresh to try again.</EmptyCopy>}
      </Panel>
    </Desk>
  )
}

export function LinksDesk() {
  const links = useDashboardStore((state) => state.links)
  const add = useDashboardStore((state) => state.addLink)
  const remove = useDashboardStore((state) => state.removeLink)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  return (
    <Desk title="Quick links" detail={links.length ? `${links.length} saved` : 'Places you open often'}>
      <Panel>
        <form
          className="flex flex-wrap gap-2 border-b border-divider p-3"
          onSubmit={(event) => {
            event.preventDefault()
            add(label, url)
            setLabel('')
            setUrl('')
          }}
        >
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Name" className="field w-40" />
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" className="field min-w-[180px] flex-1" />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
        <div className="p-2">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fill/8">
              <a href={withProtocol(link.url)} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{link.label}</span>
                <span className="block truncate text-[11px] text-tertiary">{hostOf(link.url)}</span>
              </a>
              <RemoveButton label="Delete link" onClick={() => remove(link.id)} />
            </div>
          ))}
          {links.length === 0 && <EmptyCopy>Add a name and an address.</EmptyCopy>}
        </div>
      </Panel>
    </Desk>
  )
}

export function WishlistDesk() {
  const wishes = useDashboardStore((state) => state.wishes)
  const add = useDashboardStore((state) => state.addWish)
  const toggle = useDashboardStore((state) => state.toggleWish)
  const remove = useDashboardStore((state) => state.removeWish)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [url, setUrl] = useState('')
  const open = wishes.filter((wish) => !wish.bought)
  const bought = wishes.filter((wish) => wish.bought)
  const priced = open.map((wish) => readPrice(wish.price)).filter((value): value is number => value != null)
  const total = priced.reduce((sum, value) => sum + value, 0)

  return (
    <Desk
      title="Buy wishlist"
      detail={priced.length ? `${taka(total)} still to buy` : open.length ? `${open.length} waiting` : 'Things you mean to buy'}
    >
      <Panel>
        <form
          className="flex flex-wrap gap-2 border-b border-divider p-3"
          onSubmit={(event) => {
            event.preventDefault()
            add({ title, price, url })
            setTitle('')
            setPrice('')
            setUrl('')
          }}
        >
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What to buy" className="field min-w-[160px] flex-1" />
          <input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price" className="field w-28" />
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Link, optional" className="field min-w-[160px] flex-1" />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
        <div className="p-2">
          {open.map((wish) => (
            <WishRow key={wish.id} wish={wish} onToggle={() => toggle(wish.id)} onRemove={() => remove(wish.id)} />
          ))}
          {open.length === 0 && <EmptyCopy>Nothing waiting to be bought.</EmptyCopy>}
          {bought.length > 0 && (
            <div className="mt-2 border-t border-divider pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-tertiary">Bought · {bought.length}</div>
              {bought.map((wish) => (
                <WishRow key={wish.id} wish={wish} onToggle={() => toggle(wish.id)} onRemove={() => remove(wish.id)} />
              ))}
            </div>
          )}
        </div>
      </Panel>
    </Desk>
  )
}

function WishRow({
  wish,
  onToggle,
  onRemove,
}: {
  wish: { id: string; title: string; price: string; url: string; bought: boolean }
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fill/8">
      <CheckDot checked={wish.bought} onClick={onToggle} label={wish.bought ? 'Mark as not bought' : 'Mark as bought'} />
      <div className="min-w-0 flex-1">
        {wish.url ? (
          <a href={withProtocol(wish.url)} target="_blank" rel="noreferrer" className={cn('block truncate text-[13px] font-medium hover:underline', wish.bought && 'text-tertiary line-through')}>
            {wish.title}
          </a>
        ) : (
          <div className={cn('truncate text-[13px] font-medium', wish.bought && 'text-tertiary line-through')}>{wish.title}</div>
        )}
        {wish.price && <div className="text-[11px] text-secondary">{wish.price}</div>}
      </div>
      <RemoveButton label="Delete wish" onClick={onRemove} />
    </div>
  )
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-[14px] bg-primary px-4 py-3 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">{label}</div>
      <div className={cn('mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.03em]', tone === 'good' && 'text-accent-green', tone === 'bad' && 'text-accent-red')}>{value}</div>
    </div>
  )
}

function groupByDay(entries: { id: string; description: string; amount: number; kind: MoneyKind; day: string }[]) {
  const map = new Map<string, typeof entries>()
  for (const entry of entries) {
    const list = map.get(entry.day) ?? []
    list.push(entry)
    map.set(entry.day, list)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, rows]) => ({ day, entries: rows }))
}

function hostOf(url: string) {
  try {
    return new URL(withProtocol(url)).host.replace(/^www\./, '')
  } catch {
    return url
  }
}
