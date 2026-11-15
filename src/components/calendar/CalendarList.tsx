import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { PALETTE } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { Calendar, SourceGroup } from '@/types'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { SidebarCall, SidebarCountdown, SidebarPomodoro, SidebarQuotes, SidebarWater } from '@/components/layout/SidebarPomodoro'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'

const GROUPS: SourceGroup[] = ['iCloud', 'Google']

export function CalendarList() {
  const calendars = useCalendarStore((state) => state.calendars)
  const sets = useCalendarStore((state) => state.sets)
  const toggle = useCalendarStore((state) => state.toggleCalendar)
  const update = useCalendarStore((state) => state.updateCalendar)
  const remove = useCalendarStore((state) => state.removeCalendar)
  const applySet = useCalendarStore((state) => state.applySet)
  const removeSet = useCalendarStore((state) => state.removeSet)
  const openAdd = useCalendarStore((state) => state.openAddCalendar)
  const [editing, setEditing] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; calendar: Calendar } | null>(null)
  const remoteGroups = GROUPS.filter((group) => calendars.some((calendar) => calendar.group === group))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-1 py-1">
        {remoteGroups.map((group) => (
          <section key={group} className="mb-2">
            <div className="ios-section-label">{group}</div>
            <div className="px-1">
              {calendars
                .filter((calendar) => calendar.group === group)
                .map((calendar) => (
                  <div
                    key={calendar.id}
                    className="ios-row group"
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setMenu({ x: event.clientX, y: event.clientY, calendar })
                    }}
                  >
                    <button
                      type="button"
                      aria-label={calendar.visible ? `Hide ${calendar.name}` : `Show ${calendar.name}`}
                      onClick={() => toggle(calendar.id)}
                      className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border"
                      style={{
                        borderColor: calendar.color,
                        background: calendar.visible ? calendar.color : 'transparent',
                      }}
                    >
                      {calendar.visible && <Check size={10} className="text-white" strokeWidth={3} />}
                    </button>
                    {editing === calendar.id ? (
                      <input
                        autoFocus
                        defaultValue={calendar.name}
                        className="h-6 flex-1 rounded bg-primary px-1.5 text-[13px] outline-none ring-1 ring-accent-blue/40"
                        onBlur={(event) => {
                          update(calendar.id, { name: event.target.value.trim() || calendar.name })
                          setEditing(null)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
                          if (event.key === 'Escape') setEditing(null)
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex-1 truncate text-left text-[13px] tracking-[-0.01em]"
                        onDoubleClick={() => setEditing(calendar.id)}
                      >
                        {calendar.name}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </section>
        ))}

        {sets.length > 0 && (
          <section className="mb-2">
            <div className="flex flex-wrap gap-1 px-3">
              {sets.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => applySet(entry.id)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    removeSet(entry.id)
                  }}
                  className="rounded-full bg-fill/10 px-2 py-0.5 text-[11px] text-secondary hover:text-primary"
                  title="Right-click to delete"
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <SidebarPomodoro />
        <SidebarCountdown />
        <SidebarWater />
        <SidebarQuotes />
        <SidebarCall />
      </div>

      <div className="px-3 pb-2">
        <button type="button" onClick={openAdd} className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-accent-blue hover:bg-fill/10">
          <Plus size={14} strokeWidth={2} />
          Add Account
        </button>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Rename', onClick: () => setEditing(menu.calendar.id) },
            ...PALETTE.map((swatch) => ({
              label: swatch.label,
              onClick: () => update(menu.calendar.id, { color: swatch.value }),
            })),
            {
              label: 'Delete calendar',
              danger: true,
              onClick: () => {
                void import('@/store/confirmStore').then(({ askConfirm }) =>
                  askConfirm({
                    title: 'Delete calendar?',
                    body: `“${menu.calendar.name}” and its events will be removed.`,
                  }).then((ok) => {
                    if (!ok) return
                    useEventStore.getState().removeByCalendar(menu.calendar.id)
                    remove(menu.calendar.id)
                  }),
                )
              },
            },
          ]}
        />
      )}
      <span className={cn('hidden')} />
    </div>
  )
}
