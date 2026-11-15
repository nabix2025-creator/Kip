import { useState } from 'react'
import { PALETTE } from '@/lib/constants'
import { Modal } from '@/components/ui/Modal'
import { useCalendarStore } from '@/store/calendarStore'

export function AddCalendarModal() {
  const open = useCalendarStore((state) => state.addCalendarOpen)
  const close = () => useCalendarStore.setState({ addCalendarOpen: false })
  const [name, setName] = useState('New Calendar')
  const [color, setColor] = useState<string>(PALETTE[4].value)

  return (
    <Modal open={open} onClose={close} width={440}>
      <div className="p-4">
        <div className="text-header font-semibold">Add Calendar</div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            useCalendarStore.getState().addCalendar({ name: name.trim() || 'Calendar', color, provider: 'local', group: 'Other', visible: true })
            close()
          }}
        >
          <input className="field w-full" value={name} onChange={(event) => setName(event.target.value)} />
          <div className="flex gap-2">
            {PALETTE.map((swatch) => (
              <button key={swatch.id} type="button" aria-label={swatch.label} className="h-6 w-6 rounded-full" style={{ background: swatch.value, outline: color === swatch.value ? '2px solid white' : undefined, outlineOffset: 2 }} onClick={() => setColor(swatch.value)} />
            ))}
          </div>
          <button className="h-9 rounded-lg bg-accent-blue px-4 text-body font-medium text-white" type="submit">Create</button>
        </form>
      </div>
    </Modal>
  )
}
