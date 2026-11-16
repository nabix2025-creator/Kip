import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  ChevronDown,
  ChevronLeft,
  Circle,
  Copy,
  Eraser,
  Frame,
  Hand,
  MousePointer2,
  Pencil,
  Plus,
  Spline,
  Square,
  StickyNote,
  Trash2,
  Triangle,
  Type,
  Diamond,
} from 'lucide-react'
import { WindowControls } from '@/components/layout/WindowControls'
import { Stage } from '@/components/whiteboard/Stage'
import type { ShapeKind } from '@/components/whiteboard/model'
import { cn } from '@/lib/cn'
import { useTheme } from '@/hooks/useTheme'
import { askConfirm } from '@/store/confirmStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useWhiteboardStore } from '@/store/whiteboardStore'

const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: 'round', label: 'Rounded rectangle' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'parallelogram', label: 'Parallelogram' },
]

export function Whiteboard() {
  const theme = useTheme()
  const dark = theme === 'dark'
  const close = useCalendarStore((state) => state.closeWhiteboard)
  const boards = useWhiteboardStore((state) => state.boards)
  const activeId = useWhiteboardStore((state) => state.activeId)
  const tool = useWhiteboardStore((state) => state.tool)
  const shape = useWhiteboardStore((state) => state.shape)
  const board = boards.find((entry) => entry.id === activeId) ?? boards[0]
  const [boardsOpen, setBoardsOpen] = useState(false)
  const [shapesOpen, setShapesOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (boardsOpen) {
        event.preventDefault()
        event.stopImmediatePropagation()
        setBoardsOpen(false)
        return
      }
      if (shapesOpen) {
        event.preventDefault()
        event.stopImmediatePropagation()
        setShapesOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [boardsOpen, shapesOpen])

  if (!board) return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-grouped text-primary">
      <header
        className="chrome drag relative z-40 flex h-12 shrink-0 items-center gap-1 border-b border-divider px-2"
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest('button, input')) return
          window.api?.maximize()
        }}
      >
        <button
          type="button"
          onClick={close}
          className="no-drag flex h-8 items-center gap-0.5 rounded-[8px] px-2 text-[13px] font-medium text-secondary hover:bg-fill/10 hover:text-primary"
        >
          <ChevronLeft size={16} />
          Calendar
        </button>
        <div className="no-drag ml-1 flex min-w-0 items-center">
          <input
            aria-label="Board name"
            value={board.title}
            onChange={(event) => useWhiteboardStore.getState().renameBoard(board.id, event.target.value)}
            onBlur={(event) => useWhiteboardStore.getState().renameBoard(board.id, event.target.value.trim() || 'Untitled')}
            className="w-[22ch] max-w-[34vw] truncate bg-transparent text-[14px] font-semibold tracking-[-0.01em] outline-none"
          />
          <button
            type="button"
            aria-label="Boards"
            aria-expanded={boardsOpen}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-secondary hover:bg-fill/10"
            onClick={() => {
              setShapesOpen(false)
              setBoardsOpen((open) => !open)
            }}
          >
            <ChevronDown size={15} />
          </button>
        </div>
        <div className="ml-auto">
          <WindowControls />
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <Stage dark={dark} onSurfacePointer={() => { setBoardsOpen(false); setShapesOpen(false) }} />

        <div
          className={cn(
            'no-drag absolute left-3 top-1/2 z-20 flex max-h-[calc(100%-16px)] -translate-y-1/2 flex-col gap-0.5 overflow-y-auto rounded-[16px] p-1.5',
            dark
              ? 'bg-secondary shadow-[0_1px_2px_rgba(0,0,0,.35),0_8px_28px_rgba(0,0,0,.45)]'
              : 'bg-white shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_28px_rgba(0,0,0,.12)]',
          )}
        >
          <ToolButton dark={dark} label="Select" shortcut="V" active={tool === 'select'} onClick={() => useWhiteboardStore.getState().setTool('select')}>
            <MousePointer2 size={18} />
          </ToolButton>
          <ToolButton dark={dark} label="Hand" shortcut="H" active={tool === 'hand'} onClick={() => useWhiteboardStore.getState().setTool('hand')}>
            <Hand size={18} />
          </ToolButton>
          <span className={cn('mx-auto my-1 h-px w-5', dark ? 'bg-white/10' : 'bg-black/10')} />
          <ToolButton dark={dark} label="Sticky note" shortcut="N" active={tool === 'sticky'} onClick={() => useWhiteboardStore.getState().setTool('sticky')}>
            <StickyNote size={18} />
          </ToolButton>
          <ToolButton dark={dark} label="Text" shortcut="T" active={tool === 'text'} onClick={() => useWhiteboardStore.getState().setTool('text')}>
            <Type size={18} />
          </ToolButton>
          <ToolButton
            dark={dark}
            label="Shape"
            shortcut="S"
            active={tool === 'shape'}
            onClick={() => {
              useWhiteboardStore.getState().setTool('shape')
              setShapesOpen((open) => (tool === 'shape' ? !open : true))
              setBoardsOpen(false)
            }}
          >
            <ShapeGlyph kind={shape} />
          </ToolButton>
          <ToolButton dark={dark} label="Connector" shortcut="L" active={tool === 'connector'} onClick={() => useWhiteboardStore.getState().setTool('connector')}>
            <Spline size={18} />
          </ToolButton>
          <ToolButton dark={dark} label="Pen" shortcut="P" active={tool === 'pen'} onClick={() => useWhiteboardStore.getState().setTool('pen')}>
            <Pencil size={18} />
          </ToolButton>
          <ToolButton dark={dark} label="Frame" shortcut="F" active={tool === 'frame'} onClick={() => useWhiteboardStore.getState().setTool('frame')}>
            <Frame size={18} />
          </ToolButton>
          <ToolButton dark={dark} label="Eraser" shortcut="E" active={tool === 'eraser'} onClick={() => useWhiteboardStore.getState().setTool('eraser')}>
            <Eraser size={18} />
          </ToolButton>
        </div>

        {shapesOpen && (
          <div
            className={cn(
              'no-drag absolute left-[68px] top-1/2 z-30 w-[196px] -translate-y-1/2 rounded-[14px] p-1.5',
              dark
                ? 'bg-secondary shadow-[0_8px_28px_rgba(0,0,0,.45)]'
                : 'bg-white shadow-[0_8px_28px_rgba(0,0,0,.14)]',
            )}
          >
            {SHAPES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left text-[13px] hover:bg-fill/10',
                  shape === entry.id && (dark ? 'bg-accent-blue/20 text-accent-blue' : 'bg-[#E7ECFF] text-[#4262FF]'),
                )}
                onClick={() => {
                  useWhiteboardStore.getState().setShape(entry.id)
                  setShapesOpen(false)
                }}
              >
                <ShapeGlyph kind={entry.id} />
                {entry.label}
              </button>
            ))}
          </div>
        )}

        {boardsOpen && (
          <div
            className={cn(
              'no-drag absolute left-3 top-2 z-30 w-[300px] rounded-[14px] p-1.5',
              dark
                ? 'bg-secondary shadow-[0_8px_30px_rgba(0,0,0,.5)]'
                : 'bg-white shadow-[0_8px_30px_rgba(0,0,0,.16)]',
            )}
          >
            <button
              type="button"
              className="flex h-9 w-full items-center gap-2 rounded-[9px] px-2 text-[13px] font-medium text-accent-blue hover:bg-fill/10"
              onClick={() => {
                useWhiteboardStore.getState().createBoard()
                setBoardsOpen(false)
              }}
            >
              <Plus size={15} />
              New board
            </button>
            <div className="max-h-[320px] overflow-auto">
              {[...boards].sort((a, b) => b.updatedAt - a.updatedAt).map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-[9px] pr-1',
                    entry.id === board.id
                      ? dark
                        ? 'bg-accent-blue/20'
                        : 'bg-[#E7ECFF]'
                      : 'hover:bg-fill/10',
                  )}
                >
                  <button type="button" className="min-w-0 flex-1 px-2 py-1.5 text-left" onClick={() => { useWhiteboardStore.getState().setActive(entry.id); setBoardsOpen(false) }}>
                    <span className="block truncate text-[13px] font-medium">{entry.title}</span>
                    <span className="block text-[11px] text-tertiary">
                      {entry.items.length} {entry.items.length === 1 ? 'object' : 'objects'} · {formatDistanceToNow(entry.updatedAt, { addSuffix: true })}
                    </span>
                  </button>
                  <button type="button" aria-label={`Duplicate ${entry.title}`} className="flex h-7 w-7 items-center justify-center rounded-[7px] text-tertiary opacity-60 hover:bg-fill/10 hover:opacity-100" onClick={() => useWhiteboardStore.getState().duplicateBoard(entry.id)}>
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${entry.title}`}
                    className="flex h-7 w-7 items-center justify-center rounded-[7px] text-tertiary opacity-60 hover:bg-fill/10 hover:opacity-100"
                    onClick={() => {
                      void (async () => {
                        if (entry.items.length) {
                          const ok = await askConfirm({
                            title: `Delete “${entry.title}”?`,
                            body: 'The board and everything on it will be removed from this device.',
                            confirmLabel: 'Delete board',
                            danger: true,
                          })
                          if (!ok) return
                        }
                        useWhiteboardStore.getState().deleteBoard(entry.id)
                      })()
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolButton({
  label,
  shortcut,
  active,
  onClick,
  children,
  dark,
}: {
  label: string
  shortcut: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
  dark: boolean
}) {
  return (
    <button
      type="button"
      title={`${label} (${shortcut})`}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-[10px] text-primary',
        active
          ? dark
            ? 'bg-accent-blue/20 text-accent-blue'
            : 'bg-[#E7ECFF] text-[#4262FF]'
          : 'hover:bg-fill/10',
      )}
    >
      {children}
    </button>
  )
}

function ShapeGlyph({ kind }: { kind: ShapeKind }) {
  if (kind === 'ellipse') return <Circle size={18} />
  if (kind === 'diamond') return <Diamond size={18} />
  if (kind === 'triangle') return <Triangle size={18} />
  if (kind === 'parallelogram') return <span className="block h-3.5 w-4 -skew-x-12 rounded-[2px] border-[1.6px] border-current" />
  if (kind === 'round') return <Square size={18} strokeWidth={1.8} className="scale-90" />
  return <Square size={18} />
}
