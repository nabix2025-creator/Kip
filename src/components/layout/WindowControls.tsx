import { Minus, Square, X } from 'lucide-react'
import { useEffect, useState, type MouseEvent, type PointerEvent } from 'react'

export function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void window.api?.isMaximized().then(setMaximized)
    return window.api?.onMaximized(setMaximized)
  }, [])

  if (!window.api) return null

  const stop = (event: MouseEvent | PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className="no-drag flex h-[46px] items-stretch" onMouseDown={stop} onPointerDown={stop}>
      <button
        type="button"
        aria-label="Minimize"
        className="no-drag flex w-[46px] items-center justify-center text-primary/70 transition-colors hover:bg-fill/12 hover:text-primary"
        onClick={(event) => {
          stop(event)
          window.api?.minimize()
        }}
      >
        <Minus size={14} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        className="no-drag flex w-[46px] items-center justify-center text-primary/70 transition-colors hover:bg-fill/12 hover:text-primary"
        onClick={(event) => {
          stop(event)
          window.api?.maximize()
        }}
      >
        {maximized ? (
          <span className="relative block h-[10px] w-[10px]">
            <span className="absolute left-0 top-[2px] h-[8px] w-[8px] border border-current" />
            <span className="absolute left-[2px] top-0 h-[8px] w-[8px] border border-current bg-primary" />
          </span>
        ) : (
          <Square size={12} strokeWidth={1.8} />
        )}
      </button>
      <button
        type="button"
        aria-label="Close"
        className="no-drag flex w-[46px] items-center justify-center text-primary/70 transition-colors hover:bg-[#E81123] hover:text-white"
        onClick={(event) => {
          stop(event)
          window.api?.close()
        }}
      >
        <X size={14} strokeWidth={1.8} />
      </button>
    </div>
  )
}
