import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { addMonths, format, isSameDay, isSameMonth, isToday } from 'date-fns'
import { EASE } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { getMonthGrid, toDateKey, weekdayLabels } from '@/lib/dates'
import { useCalendarStore } from '@/store/calendarStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useEventsByDay } from '@/hooks/useEvents'

export function MiniCalendar({ selected, onSelect }: { selected: Date; onSelect: (date: Date) => void }) {
  const weekStartsOn = useSettingsStore((state) => state.weekStartsOn)
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const [direction, setDirection] = useState<1 | -1>(1)
  const monthKey = format(month, 'yyyy-MM')
  const grid = getMonthGrid(month, weekStartsOn)
  const byDay = useEventsByDay(grid[0], grid[grid.length - 1])
  const labels = weekdayLabels(weekStartsOn)

  useEffect(() => {
    const next = new Date(selected.getFullYear(), selected.getMonth(), 1)
    if (format(next, 'yyyy-MM') !== format(month, 'yyyy-MM')) setMonth(next)
    // Only follow the selected month. Browsing with the arrows stays put until the selection changes months.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format(selected, 'yyyy-MM')])

  const changeMonth = (delta: 1 | -1) => {
    setDirection(delta)
    setMonth((current) => addMonths(current, delta))
  }

  return (
    <div className="px-2 pb-2 pt-2">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <div className="text-[13px] font-semibold tracking-[-0.02em]">{format(month, 'MMMM yyyy')}</div>
        <div className="flex gap-0.5">
          <button type="button" aria-label="Previous month" className="flex h-6 w-6 items-center justify-center rounded-full text-secondary transition-colors hover:bg-fill/10 hover:text-primary" onClick={() => changeMonth(-1)}>
            <ChevronLeft size={14} strokeWidth={1.8} />
          </button>
          <button type="button" aria-label="Next month" className="flex h-6 w-6 items-center justify-center rounded-full text-secondary transition-colors hover:bg-fill/10 hover:text-primary" onClick={() => changeMonth(1)}>
            <ChevronRight size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {labels.map((label) => (
          <div key={label} className="pb-1 text-[10px] font-semibold tracking-[0.04em] text-tertiary">
            {label.slice(0, 1)}
          </div>
        ))}
      </div>
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={monthKey}
            custom={direction}
            initial={{ x: direction * 36, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -36, opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="grid grid-cols-7"
          >
            {grid.map((day) => {
              const key = toDateKey(day)
              const inMonth = isSameMonth(day, month)
              const today = isToday(day)
              const isSelected = isSameDay(day, selected)
              const count = byDay.get(key)?.length ?? 0
              return (
                <button key={key} type="button" onClick={() => onSelect(day)} className="flex h-8 flex-col items-center justify-center">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium tracking-[-0.02em] transition-colors duration-120 ease-ios',
                      !inMonth && 'text-tertiary',
                      inMonth && !today && !isSelected && 'hover:bg-fill/10',
                      today && !isSelected && 'anim-circle bg-accent-red font-semibold text-white',
                      isSelected && !today && 'anim-circle bg-accent-blue font-semibold text-white',
                      isSelected && today && 'anim-circle bg-accent-red font-semibold text-white',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <span className="mt-px flex h-1 gap-0.5">
                    {Array.from({ length: Math.min(3, count) }).map((_, index) => (
                      <span key={index} className={cn('h-[3px] w-[3px] rounded-full', isSelected || today ? 'bg-white/90' : 'bg-accent-blue/70')} />
                    ))}
                  </span>
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export function useSelectedDate(): Date {
  const key = useCalendarStore((state) => state.selectedDate)
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}
