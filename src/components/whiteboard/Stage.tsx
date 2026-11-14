import { useEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  BringToFront,
  Copy,
  Lock,
  Magnet,
  Map as MapIcon,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  SendToBack,
  Undo2,
  Trash2,
  Unlock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { cn } from '@/lib/cn'
import { useCalendarStore } from '@/store/calendarStore'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import {
  ACCENT,
  CANVAS,
  FILL_COLORS,
  FRAME_COLORS,
  INK_COLORS,
  STICKY_COLORS,
  alignItems,
  clamp,
  cloneItems,
  copyItems,
  createConnector,
  createFrame,
  createPen,
  createShape,
  createSticky,
  createText,
  deleteItems,
  frontZ,
  backZ,
  hexAlpha,
  hitTest,
  intersects,
  isNode,
  itemAabb,
  linkBox,
  normalizeRect,
  pasteItems,
  resizeBox,
  resolveEnds,
  connectorPath,
  sameItems,
  screenPoint,
  simplify,
  snapMove,
  translateItems,
  unionBounds,
  center,
  type AlignMode,
  type BoardItem,
  type Box,
  type Camera,
  type ConnectorItem,
  type Handle,
  type NodeItem,
  type PenItem,
  type Point,
  type Guide,
} from '@/components/whiteboard/model'

type Gesture =
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'move'; sx: number; sy: number; start: BoardItem[]; ids: string[]; dx: number; dy: number }
  | { kind: 'marquee'; x: number; y: number; cx: number; cy: number; base: string[]; moved: boolean }
  | { kind: 'resize'; id: string; handle: Handle; origin: NodeItem; sx: number; sy: number; box: Box }
  | { kind: 'rotate'; id: string; cx: number; cy: number; startAngle: number; startRot: number; rotation: number }
  | { kind: 'draw'; tool: 'shape' | 'frame'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'pen'; points: Point[] }
  | { kind: 'link'; x1: number; y1: number; x2: number; y2: number; fromId?: string }
  | { kind: 'end'; id: string; which: 'a' | 'b'; x: number; y: number }
  | { kind: 'erase'; start: BoardItem[]; items: BoardItem[] }

interface EditState {
  id: string
  text: string
  h: number
  boardId: string
}

interface ItemPatch {
  fill?: string
  color?: string
  stroke?: string
  strokeWidth?: number
  fontSize?: number
  bold?: boolean
  align?: 'left' | 'center'
  route?: 'straight' | 'elbow' | 'curve'
  arrow?: 'end' | 'both' | 'none'
  locked?: boolean
}

const HANDLES: { id: Handle; x: string; y: string; cursor: string }[] = [
  { id: 'nw', x: '0%', y: '0%', cursor: 'nwse-resize' },
  { id: 'n', x: '50%', y: '0%', cursor: 'ns-resize' },
  { id: 'ne', x: '100%', y: '0%', cursor: 'nesw-resize' },
  { id: 'e', x: '100%', y: '50%', cursor: 'ew-resize' },
  { id: 'se', x: '100%', y: '100%', cursor: 'nwse-resize' },
  { id: 's', x: '50%', y: '100%', cursor: 'ns-resize' },
  { id: 'sw', x: '0%', y: '100%', cursor: 'nesw-resize' },
  { id: 'w', x: '0%', y: '50%', cursor: 'ew-resize' },
]

const SIZES = [12, 14, 16, 20, 28, 40, 64]

export function Stage({ onSurfacePointer }: { onSurfacePointer?: () => void }) {
  const boardId = useWhiteboardStore((state) => state.activeId)
  const items = useWhiteboardStore((state) => state.boards.find((board) => board.id === boardId)?.items ?? [])
  const tool = useWhiteboardStore((state) => state.tool)
  const snap = useWhiteboardStore((state) => state.snap)
  const canUndo = useWhiteboardStore((state) => (state.past[boardId]?.length ?? 0) > 0)
  const canRedo = useWhiteboardStore((state) => (state.future[boardId]?.length ?? 0) > 0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const cams = useRef(new Map<string, Camera>())
  const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 })
  const boardRef = useRef(boardId)
  const gestureRef = useRef<Gesture | null>(null)
  const selectedRef = useRef<string[]>([])
  const editRef = useRef<EditState | null>(null)
  const spaceRef = useRef(false)
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, zoom: 1 })
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [edit, setEdit] = useState<EditState | null>(null)
  const [space, setSpace] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [help, setHelp] = useState(false)
  const [mapOpen, setMapOpen] = useState(true)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [view, setView] = useState({ w: 800, h: 600 })
  boardRef.current = boardId
  selectedRef.current = selected
  editRef.current = edit
  camRef.current = cam

  const live = project(items, gesture, cam.zoom, snap)
  const shown = live.items

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const saved = cams.current.get(boardId)
    const next = saved ?? { x: el.clientWidth / 2, y: el.clientHeight / 2, zoom: 1 }
    cams.current.set(boardId, next)
    camRef.current = next
    setCam(next)
    setSelected([])
    setEdit(null)
    setMenu(null)
    gestureRef.current = null
    setGesture(null)
  }, [boardId])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const watch = new ResizeObserver(() => setView({ w: el.clientWidth, h: el.clientHeight }))
    watch.observe(el)
    setView({ w: el.clientWidth, h: el.clientHeight })
    return () => watch.disconnect()
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const lx = event.clientX - rect.left
      const ly = event.clientY - rect.top
      if (event.ctrlKey || event.metaKey) {
        zoomAt(camRef.current.zoom * Math.exp(-event.deltaY * 0.0016), lx, ly)
      } else {
        const next = { ...camRef.current, x: camRef.current.x - event.deltaX, y: camRef.current.y - event.deltaY }
        remember(next)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.type === 'keyup') {
        if (event.key === ' ' && !typing) {
          spaceRef.current = false
          setSpace(false)
        }
        return
      }
      if (typing) {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopImmediatePropagation()
          target?.blur()
        }
        return
      }
      event.stopImmediatePropagation()
      const meta = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (event.key === ' ') {
        spaceRef.current = true
        setSpace(true)
        event.preventDefault()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        if (gestureRef.current) {
          gestureRef.current = null
          setGesture(null)
          return
        }
        if (help) return setHelp(false)
        if (menu) return setMenu(null)
        if (editRef.current) return finishEdit()
        if (useWhiteboardStore.getState().tool !== 'select') return useWhiteboardStore.getState().setTool('select')
        if (selectedRef.current.length) return setSelected([])
        useCalendarStore.getState().closeWhiteboard()
        return
      }
      if (meta && key === 'z') {
        event.preventDefault()
        finishEdit()
        if (event.shiftKey) useWhiteboardStore.getState().redo()
        else useWhiteboardStore.getState().undo()
        return
      }
      if (meta && key === 'y') {
        event.preventDefault()
        useWhiteboardStore.getState().redo()
        return
      }
      if (meta && key === 'a') {
        event.preventDefault()
        setSelected(itemsNow().map((item) => item.id))
        return
      }
      if (meta && key === 'd') {
        event.preventDefault()
        duplicate()
        return
      }
      if (meta && key === 'c') {
        event.preventDefault()
        copySelection()
        return
      }
      if (meta && key === 'v') {
        event.preventDefault()
        paste()
        return
      }
      if (meta && event.key === '0') {
        event.preventDefault()
        fit()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeSelected()
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const current = itemsNow()
        const only = selectedRef.current.length === 1 ? current.find((item) => item.id === selectedRef.current[0]) : undefined
        if (only && isNode(only)) setEdit({ id: only.id, text: only.text, h: only.h, boardId: boardRef.current })
        return
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        const current = itemsNow()
        const ids = selectedRef.current.filter((id) => {
          const item = current.find((entry) => entry.id === id)
          return !!item && !item.locked && !(item.type === 'connector' && (item.fromId || item.toId))
        })
        if (ids.length) commit(current, translateItems(current, ids, dx, dy))
        return
      }
      if (event.key === '[') return restack(false)
      if (event.key === ']') return restack(true)
      if (meta) return
      const nextTool = { v: 'select', h: 'hand', n: 'sticky', t: 'text', s: 'shape', l: 'connector', p: 'pen', f: 'frame', e: 'eraser' } as const
      const picked = nextTool[key as keyof typeof nextTool]
      if (picked) useWhiteboardStore.getState().setTool(picked)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onKey, true)
    }
  }, [help, menu])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const g = gestureRef.current
      if (!g) {
        const world = pointFrom(event)
        if (!world) return
        const hit = hitTest(itemsNow(), world.x, world.y, camRef.current.zoom)
        setHoverId((current) => (current === (hit?.id ?? null) ? current : (hit?.id ?? null)))
        return
      }
      if (g.kind === 'pan') {
        remember({ ...camRef.current, x: g.cx + (event.clientX - g.sx), y: g.cy + (event.clientY - g.sy) })
        return
      }
      const world = pointFrom(event)
      if (!world) return
      if (g.kind === 'move') return setLive({ ...g, dx: world.x - g.sx, dy: world.y - g.sy })
      if (g.kind === 'marquee') {
        const moved = g.moved || Math.hypot(world.x - g.x, world.y - g.y) > 3 / camRef.current.zoom
        return setLive({ ...g, cx: world.x, cy: world.y, moved })
      }
      if (g.kind === 'resize') return setLive({ ...g, box: resizeBox(g.origin, g.handle, world.x - g.sx, world.y - g.sy, event.shiftKey) })
      if (g.kind === 'rotate') {
        const angle = (Math.atan2(world.y - g.cy, world.x - g.cx) * 180) / Math.PI
        let rotation = g.startRot + (angle - g.startAngle)
        if (event.shiftKey) rotation = Math.round(rotation / 15) * 15
        return setLive({ ...g, rotation })
      }
      if (g.kind === 'draw') return setLive({ ...g, x2: world.x, y2: world.y })
      if (g.kind === 'pen') {
        const last = g.points[g.points.length - 1]
        if (!last || Math.hypot(world.x - last.x, world.y - last.y) > 1.4 / camRef.current.zoom) return setLive({ ...g, points: [...g.points, world] })
        return
      }
      if (g.kind === 'link') {
        const hit = hitTest(itemsNow(), world.x, world.y, camRef.current.zoom)
        const node = hit && isNode(hit) && hit.id !== g.fromId ? hit : null
        const at = node ? center(node) : world
        return setLive({ ...g, x2: at.x, y2: at.y })
      }
      if (g.kind === 'end') return setLive({ ...g, x: world.x, y: world.y })
      if (g.kind === 'erase') {
        const hit = hitTest(g.items, world.x, world.y, camRef.current.zoom)
        if (!hit || hit.locked) return
        setLive({ ...g, items: g.items.filter((item) => item.id !== hit.id) })
      }
    }
    const up = (event: PointerEvent) => {
      const g = gestureRef.current
      if (!g) return
      gestureRef.current = null
      setGesture(null)
      const zoom = camRef.current.zoom
      const store = useWhiteboardStore.getState()
      if (g.kind === 'move') {
        if (Math.hypot(g.dx, g.dy) < 0.6) return
        const snapped = snapMove(g.start, g.ids, g.dx, g.dy, zoom, store.snap)
        commit(g.start, translateItems(g.start, g.ids, snapped.dx, snapped.dy))
        return
      }
      if (g.kind === 'marquee') {
        if (!g.moved) {
          if (!event.shiftKey) setSelected([])
          return
        }
        const box = normalizeRect(g.x, g.y, g.cx, g.cy)
        const current = itemsNow()
        const hits = current.filter((item) => intersects(box, itemAabb(item, current))).map((item) => item.id)
        setSelected([...new Set([...g.base, ...hits])])
        return
      }
      if (g.kind === 'resize' || g.kind === 'rotate') {
        const current = itemsNow()
        const next = current.map((item) => {
          if (item.id !== g.id) return item
          if (g.kind === 'resize') return { ...item, ...g.box }
          return { ...item, rotation: g.rotation }
        })
        commit(current, next)
        return
      }
      if (g.kind === 'draw') {
        let box = normalizeRect(g.x1, g.y1, g.x2, g.y2)
        if (event.shiftKey) {
          const size = Math.max(box.w, box.h)
          box = { x: g.x2 >= g.x1 ? g.x1 : g.x1 - size, y: g.y2 >= g.y1 ? g.y1 : g.y1 - size, w: size, h: size }
        }
        if (box.w < 6 && box.h < 6) {
          box = g.tool === 'frame' ? { x: g.x1 - 180, y: g.y1 - 110, w: 360, h: 220 } : { x: g.x1 - 80, y: g.y1 - 52, w: 160, h: 104 }
        }
        const current = itemsNow()
        const item = g.tool === 'frame' ? createFrame(box, backZ(current)) : createShape(box, store.shape, frontZ(current))
        commit(current, [...current, item])
        setSelected([item.id])
        return
      }
      if (g.kind === 'pen') {
        const current = itemsNow()
        const pen = createPen(simplify(g.points, 1.15), store.ink, 3, frontZ(current))
        if (!pen) return
        commit(current, [...current, pen])
        setSelected([pen.id])
        return
      }
      if (g.kind === 'link') {
        const current = itemsNow()
        const hit = hitTest(current, g.x2, g.y2, zoom)
        const node = hit && isNode(hit) && hit.id !== g.fromId ? hit : null
        const end = node ? center(node) : { x: g.x2, y: g.y2 }
        const link = createConnector(g.x1, g.y1, end.x, end.y, g.fromId, node?.id, store.ink, frontZ(current))
        if (!link) return
        commit(current, [...current, link])
        setSelected([link.id])
        return
      }
      if (g.kind === 'end') {
        const current = itemsNow()
        const world = pointFrom(event) ?? { x: g.x, y: g.y }
        const hit = hitTest(current.filter((item) => item.id !== g.id), world.x, world.y, zoom)
        const node = hit && isNode(hit) ? hit : null
        const next = current.map((item) => {
          if (item.id !== g.id || item.type !== 'connector') return item
          if (g.which === 'a') {
            const at = node ? center(node) : world
            return { ...item, fromId: node?.id, ...linkBox(at.x, at.y, item.x2, item.y2) }
          }
          const at = node ? center(node) : world
          return { ...item, toId: node?.id, ...linkBox(item.x1, item.y1, at.x, at.y) }
        })
        commit(current, next)
        return
      }
      if (g.kind === 'erase') {
        if (!sameItems(g.start, g.items)) commit(g.start, g.items)
        setSelected((ids) => ids.filter((id) => g.items.some((item) => item.id === id)))
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  function remember(next: Camera) {
    camRef.current = next
    cams.current.set(boardRef.current, next)
    setCam(next)
  }

  function zoomAt(nextZoom: number, localX: number, localY: number) {
    const current = camRef.current
    const zoom = clamp(nextZoom, 0.12, 3.2)
    const wx = (localX - current.x) / current.zoom
    const wy = (localY - current.y) / current.zoom
    remember({ zoom, x: localX - wx * zoom, y: localY - wy * zoom })
  }

  function zoomCenter(nextZoom: number) {
    const el = viewportRef.current
    if (!el) return
    zoomAt(nextZoom, el.clientWidth / 2, el.clientHeight / 2)
  }

  function fit() {
    const el = viewportRef.current
    const current = itemsNow()
    if (!el) return
    const bounds = unionBounds(current)
    if (!bounds) {
      remember({ x: el.clientWidth / 2, y: el.clientHeight / 2, zoom: 1 })
      return
    }
    const pad = 96
    const zoom = clamp(Math.min((el.clientWidth - pad) / bounds.w, (el.clientHeight - pad) / bounds.h), 0.12, 2)
    remember({
      zoom,
      x: (el.clientWidth - bounds.w * zoom) / 2 - bounds.x * zoom,
      y: (el.clientHeight - bounds.h * zoom) / 2 - bounds.y * zoom,
    })
  }

  function pointFrom(event: { clientX: number; clientY: number }): Point | null {
    const el = viewportRef.current
    if (!el) return null
    return screenPoint(event.clientX, event.clientY, el.getBoundingClientRect(), camRef.current)
  }

  function setLive(next: Gesture) {
    gestureRef.current = next
    setGesture(next)
  }

  function itemsNow(): BoardItem[] {
    const state = useWhiteboardStore.getState()
    return state.boards.find((board) => board.id === boardRef.current)?.items ?? []
  }

  function commit(before: BoardItem[], after: BoardItem[]) {
    useWhiteboardStore.getState().commit(boardRef.current, before, after)
  }

  function finishEdit(onlyId?: string) {
    const current = editRef.current
    if (!current) return
    if (onlyId && current.id !== onlyId) return
    const state = useWhiteboardStore.getState()
    const board = state.boards.find((entry) => entry.id === current.boardId)
    editRef.current = null
    setEdit(null)
    if (!board) return
    const next = board.items.map((item) => (item.id === current.id && isNode(item) ? { ...item, text: current.text, h: current.h } : item))
    state.commit(current.boardId, board.items, next)
  }

  function place(kind: 'sticky' | 'text', world: Point) {
    const state = useWhiteboardStore.getState()
    const current = itemsNow()
    const item = kind === 'sticky' ? createSticky(world.x, world.y, state.stickyColor, frontZ(current)) : createText(world.x, world.y, frontZ(current))
    commit(current, [...current, item])
    setSelected([item.id])
    setEdit({ id: item.id, text: '', h: item.h, boardId: boardRef.current })
  }

  function duplicate() {
    const current = itemsNow()
    const picked = current.filter((item) => selectedRef.current.includes(item.id) && !item.locked)
    if (!picked.length) return
    const clones = cloneItems(picked, 24, 24).map((item, index) => ({ ...item, z: frontZ(current) + index }))
    commit(current, [...current, ...clones])
    setSelected(clones.map((item) => item.id))
  }

  function copySelection() {
    const current = itemsNow()
    copyItems(current.filter((item) => selectedRef.current.includes(item.id)))
  }

  function paste() {
    const current = itemsNow()
    const clones = pasteItems(frontZ(current))
    if (!clones.length) return
    commit(current, [...current, ...clones])
    setSelected(clones.map((item) => item.id))
  }

  function removeSelected() {
    const current = itemsNow()
    const ids = selectedRef.current.filter((id) => current.find((item) => item.id === id && !item.locked))
    if (!ids.length) return
    commit(current, deleteItems(current, ids))
    setSelected([])
  }

  function restack(front: boolean) {
    const current = itemsNow()
    const picked = current.filter((item) => selectedRef.current.includes(item.id)).sort((a, b) => a.z - b.z)
    if (!picked.length) return
    const base = front ? frontZ(current) : backZ(current) - picked.length + 1
    const zs = new Map(picked.map((item, index) => [item.id, base + index]))
    commit(current, current.map((item) => (zs.has(item.id) ? { ...item, z: zs.get(item.id)! } : item)))
  }

  function patchSelected(patch: ItemPatch) {
    const current = itemsNow()
    const ids = new Set(selectedRef.current)
    const next = current.map((item) => (ids.has(item.id) ? ({ ...item, ...patch } as BoardItem) : item))
    commit(current, next)
    if (typeof patch.fill === 'string' && current.some((item) => ids.has(item.id) && item.type === 'sticky')) {
      useWhiteboardStore.getState().setStickyColor(patch.fill)
    }
    if (typeof patch.stroke === 'string') useWhiteboardStore.getState().setInk(patch.stroke)
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-ui]')) return
    onSurfacePointer?.()
    setMenu(null)
    if (editRef.current && !(event.target as HTMLElement).closest('textarea')) finishEdit()
    if (event.button === 1 || spaceRef.current || tool === 'hand') {
      setLive({ kind: 'pan', sx: event.clientX, sy: event.clientY, cx: camRef.current.x, cy: camRef.current.y })
      return
    }
    if (event.button !== 0) return
    const world = pointFrom(event)
    if (!world) return
    const state = useWhiteboardStore.getState()
    const current = itemsNow()
    if (tool === 'sticky') return place('sticky', world)
    if (tool === 'text') return place('text', world)
    if (tool === 'pen') return setLive({ kind: 'pen', points: [world] })
    if (tool === 'shape' || tool === 'frame') return setLive({ kind: 'draw', tool, x1: world.x, y1: world.y, x2: world.x, y2: world.y })
    if (tool === 'connector') {
      const hit = hitTest(current, world.x, world.y, camRef.current.zoom)
      const node = hit && isNode(hit) ? hit : null
      const start = node ? center(node) : world
      return setLive({ kind: 'link', x1: start.x, y1: start.y, x2: world.x, y2: world.y, fromId: node?.id })
    }
    if (tool === 'eraser') {
      const hit = hitTest(current, world.x, world.y, camRef.current.zoom)
      const next = hit && !hit.locked ? current.filter((item) => item.id !== hit.id) : current
      return setLive({ kind: 'erase', start: current, items: next })
    }
    const hit = hitTest(current, world.x, world.y, camRef.current.zoom)
    if (!hit) {
      if (!event.shiftKey) setSelected([])
      setLive({ kind: 'marquee', x: world.x, y: world.y, cx: world.x, cy: world.y, base: event.shiftKey ? selectedRef.current : [], moved: false })
      return
    }
    let ids = selectedRef.current
    if (event.shiftKey) ids = ids.includes(hit.id) ? ids.filter((id) => id !== hit.id) : [...ids, hit.id]
    else if (!ids.includes(hit.id)) ids = [hit.id]
    setSelected(ids)
    if (hit.locked) return
    const movable = ids.filter((id) => {
      const item = current.find((entry) => entry.id === id)
      return !!item && !item.locked && !(item.type === 'connector' && (item.fromId || item.toId))
    })
    if (movable.includes(hit.id)) setLive({ kind: 'move', sx: world.x, sy: world.y, start: current, ids: movable, dx: 0, dy: 0 })
  }

  function onDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-ui], textarea')) return
    const world = pointFrom(event)
    if (!world) return
    const hit = hitTest(itemsNow(), world.x, world.y, camRef.current.zoom)
    if (hit && isNode(hit)) {
      setSelected([hit.id])
      setEdit({ id: hit.id, text: hit.text, h: hit.h, boardId: boardRef.current })
      return
    }
    if (!hit && tool === 'select') place('sticky', world)
  }

  function startResize(event: React.PointerEvent, item: NodeItem, handle: Handle) {
    event.stopPropagation()
    const world = pointFrom(event)
    if (!world) return
    setLive({ kind: 'resize', id: item.id, handle, origin: item, sx: world.x, sy: world.y, box: { x: item.x, y: item.y, w: item.w, h: item.h } })
  }

  function startRotate(event: React.PointerEvent, item: NodeItem) {
    event.stopPropagation()
    const world = pointFrom(event)
    if (!world) return
    const c = center(item)
    setLive({
      kind: 'rotate',
      id: item.id,
      cx: c.x,
      cy: c.y,
      startAngle: (Math.atan2(world.y - c.y, world.x - c.x) * 180) / Math.PI,
      startRot: item.rotation,
      rotation: item.rotation,
    })
  }

  function startEnd(event: React.PointerEvent, item: ConnectorItem, which: 'a' | 'b', at: Point) {
    event.stopPropagation()
    setSelected([item.id])
    setLive({ kind: 'end', id: item.id, which, x: at.x, y: at.y })
  }

  const busy = gesture && gesture.kind !== 'pan' && gesture.kind !== 'marquee'
  const picked = shown.filter((item) => selected.includes(item.id))
  const bounds = unionBounds(picked)
  const only = picked.length === 1 ? picked[0] : null
  const cursor = gesture?.kind === 'pan' || (space && !gesture) ? (gesture?.kind === 'pan' ? 'grabbing' : 'grab') : space ? 'grab' : tool === 'hand' ? 'grab' : tool === 'select' ? (hoverId ? 'move' : 'default') : 'crosshair'

  const lines = live.lines

  return (
    <div className="absolute inset-0">
      <div
        ref={viewportRef}
        role="application"
        aria-label="Whiteboard canvas"
        className="absolute inset-0 touch-none"
        style={{
          backgroundColor: CANVAS,
          backgroundImage: 'radial-gradient(circle, #C5C7CF 1.15px, transparent 1.25px)',
          backgroundSize: `${22 * cam.zoom}px ${22 * cam.zoom}px`,
          backgroundPosition: `${cam.x}px ${cam.y}px`,
          cursor,
        }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={(event) => {
          event.preventDefault()
          const world = pointFrom(event)
          if (!world) return
          const hit = hitTest(itemsNow(), world.x, world.y, camRef.current.zoom)
          if (!hit) {
            setMenu(null)
            return
          }
          const ids = selectedRef.current.includes(hit.id) ? selectedRef.current : [hit.id]
          setSelected(ids)
          setMenu({ x: event.clientX, y: event.clientY })
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{ width: 0, height: 0, transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`, transformOrigin: '0 0' }}
        >
          {[...shown].sort((a, b) => a.z - b.z).map((item) => (
            <ItemView
              key={item.id}
              item={item}
              items={shown}
              zoom={cam.zoom}
              selected={selected.includes(item.id)}
              editing={edit?.id === item.id ? edit : null}
              onEdit={(text, h) => setEdit({ id: item.id, text, h, boardId })}
              onFinish={(id) => finishEdit(id)}
              onResize={startResize}
              onRotate={startRotate}
              onEnd={startEnd}
            />
          ))}
          {gesture?.kind === 'draw' && <DrawPreview gesture={gesture} zoom={cam.zoom} />}
          {gesture?.kind === 'link' && (
            <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1 }}>
              <path d={connectorPath({ x: gesture.x1, y: gesture.y1 }, { x: gesture.x2, y: gesture.y2 }, 'elbow')} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="6 4" />
            </svg>
          )}
          {gesture?.kind === 'pen' && gesture.points.length > 1 && (
            <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1 }}>
              <polyline points={gesture.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={useWhiteboardStore.getState().ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {gesture?.kind === 'marquee' && gesture.moved && (
            <div
              className="pointer-events-none absolute"
              style={{
                ...boxStyle(normalizeRect(gesture.x, gesture.y, gesture.cx, gesture.cy)),
                border: `${1 / cam.zoom}px solid ${ACCENT}`,
                background: 'rgba(66, 98, 255, 0.08)',
              }}
            />
          )}
          {lines.map((line) =>
            line.axis === 'x' ? (
              <div key={`x${line.at}`} className="pointer-events-none absolute" style={{ left: line.at, top: -20000, width: 1 / cam.zoom, height: 40000, background: ACCENT, zIndex: 100000 }} />
            ) : (
              <div key={`y${line.at}`} className="pointer-events-none absolute" style={{ top: line.at, left: -20000, height: 1 / cam.zoom, width: 40000, background: ACCENT, zIndex: 100000 }} />
            ),
          )}
        </div>
        {items.length === 0 && !gesture && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[15px] font-medium text-[#3C3C43]">Double-click to drop a note</div>
              <div className="mt-1 text-[13px] text-[#4A4A52]">or pick a tool on the left</div>
            </div>
          </div>
        )}
      </div>

      {bounds && !busy && !edit && (
        <FormatBar
          items={picked}
          left={clamp(bounds.x * cam.zoom + cam.x + (bounds.w * cam.zoom) / 2, 180, Math.max(180, view.w - 180))}
          top={bounds.y * cam.zoom + cam.y < 64 ? bounds.y * cam.zoom + cam.y + bounds.h * cam.zoom + 12 : bounds.y * cam.zoom + cam.y - 56}
          onPatch={patchSelected}
          onAlign={(mode) => commit(itemsNow(), alignItems(itemsNow(), selected, mode))}
          onDuplicate={duplicate}
          onDelete={removeSelected}
          onStack={restack}
          onLock={() => patchSelected({ locked: picked.some((item) => !item.locked) })}
        />
      )}

      <div data-ui className="absolute bottom-3 right-3 z-20 flex items-end gap-2">
        {mapOpen && <MiniMap items={shown} cam={cam} view={view} onJump={(world) => {
          const el = viewportRef.current
          if (!el) return
          remember({ ...camRef.current, x: el.clientWidth / 2 - world.x * cam.zoom, y: el.clientHeight / 2 - world.y * cam.zoom })
        }} />}
        <div className="flex items-center gap-0.5 rounded-[12px] bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_rgba(0,0,0,.12)]">
          <Tiny label="Zoom out" onClick={() => zoomCenter(cam.zoom / 1.2)}><ZoomOut size={15} /></Tiny>
          <button type="button" className="w-12 rounded-[8px] text-[12px] font-medium tabular-nums text-[#1C1C1E] hover:bg-[#F2F3F5]" onClick={() => zoomCenter(1)} title="Zoom to 100%">
            {Math.round(cam.zoom * 100)}%
          </button>
          <Tiny label="Zoom in" onClick={() => zoomCenter(cam.zoom * 1.2)}><ZoomIn size={15} /></Tiny>
          <Tiny label="Fit everything" onClick={fit}><Maximize2 size={14} /></Tiny>
          <Tiny label={mapOpen ? 'Hide map' : 'Show map'} pressed={mapOpen} onClick={() => setMapOpen((open) => !open)}><MapIcon size={14} /></Tiny>
          <Tiny label={snap ? 'Snap is on' : 'Snap is off'} pressed={snap} onClick={() => useWhiteboardStore.getState().toggleSnap()}><Magnet size={14} /></Tiny>
          <Tiny label="Undo" disabled={!canUndo} onClick={() => useWhiteboardStore.getState().undo()}><Undo2 size={14} /></Tiny>
          <Tiny label="Redo" disabled={!canRedo} onClick={() => useWhiteboardStore.getState().redo()}><Redo2 size={14} /></Tiny>
          <Tiny label="Shortcuts" pressed={help} onClick={() => setHelp((open) => !open)}><span className="text-[13px] font-semibold">?</span></Tiny>
        </div>
      </div>

      {help && (
        <div data-ui className="absolute bottom-16 right-3 z-30 w-[340px] rounded-[14px] bg-white p-3 text-[12px] text-[#1C1C1E] shadow-[0_8px_30px_rgba(0,0,0,.16)]">
          <div className="mb-2 text-[13px] font-semibold">Shortcuts</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[#3C3C43]">
            <Shortcut keys="V H" label="Select, hand" />
            <Shortcut keys="N T" label="Note, text" />
            <Shortcut keys="S L" label="Shape, line" />
            <Shortcut keys="P F E" label="Pen, frame, erase" />
            <Shortcut keys="Space" label="Pan" />
            <Shortcut keys="Ctrl scroll" label="Zoom" />
            <Shortcut keys="Ctrl Z" label="Undo" />
            <Shortcut keys="Ctrl D" label="Duplicate" />
            <Shortcut keys="Ctrl C V" label="Copy, paste" />
            <Shortcut keys="Delete" label="Remove" />
            <Shortcut keys="Arrows" label="Nudge" />
            <Shortcut keys="[ ]" label="Send back, front" />
          </div>
        </div>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Duplicate', onClick: duplicate },
            { label: 'Copy', onClick: copySelection },
            { label: 'Bring to front', onClick: () => restack(true) },
            { label: 'Send to back', onClick: () => restack(false) },
            { label: picked.some((item) => !item.locked) ? 'Lock' : 'Unlock', onClick: () => patchSelected({ locked: picked.some((item) => !item.locked) }) },
            { label: 'Delete', danger: true, onClick: removeSelected },
          ]}
        />
      )}
    </div>
  )
}

function ItemView({
  item,
  items,
  zoom,
  selected,
  editing,
  onEdit,
  onFinish,
  onResize,
  onRotate,
  onEnd,
}: {
  item: BoardItem
  items: BoardItem[]
  zoom: number
  selected: boolean
  editing: EditState | null
  onEdit: (text: string, h: number) => void
  onFinish: (id: string) => void
  onResize: (event: React.PointerEvent, item: NodeItem, handle: Handle) => void
  onRotate: (event: React.PointerEvent, item: NodeItem) => void
  onEnd: (event: React.PointerEvent, item: ConnectorItem, which: 'a' | 'b', at: Point) => void
}) {
  const ring = selected ? `0 0 0 ${1.5 / zoom}px ${ACCENT}` : undefined
  if (item.type === 'pen') {
    return (
      <svg className="pointer-events-none absolute overflow-visible" style={{ left: item.x, top: item.y, width: item.w, height: item.h, zIndex: item.z }}>
        <polyline points={item.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={item.stroke} strokeWidth={item.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        {selected && <rect x={0} y={0} width={item.w} height={item.h} fill="none" stroke={ACCENT} strokeWidth={1.5 / zoom} />}
      </svg>
    )
  }
  if (item.type === 'connector') {
    const ends = resolveEnds(item, items)
    const id = `arrow-${item.id}`
    return (
      <>
        <svg className="pointer-events-none absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1, zIndex: item.z }}>
          <defs>
            <marker id={id} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
              <path d="M0 0 L8 4 L0 8 Z" fill={item.stroke} />
            </marker>
          </defs>
          {selected && (
            <path d={connectorPath(ends.a, ends.b, item.route)} fill="none" stroke={ACCENT} strokeWidth={item.strokeWidth + 3 / zoom} strokeLinejoin="round" opacity={0.35} />
          )}
          <path
            d={connectorPath(ends.a, ends.b, item.route)}
            fill="none"
            stroke={item.stroke}
            strokeWidth={item.strokeWidth}
            strokeLinejoin="round"
            markerEnd={item.arrow === 'none' ? undefined : `url(#${id})`}
            markerStart={item.arrow === 'both' ? `url(#${id})` : undefined}
          />
        </svg>
        {selected && (
          <>
            <EndHandle at={ends.a} zoom={zoom} onPointerDown={(event) => onEnd(event, item, 'a', ends.a)} />
            <EndHandle at={ends.b} zoom={zoom} onPointerDown={(event) => onEnd(event, item, 'b', ends.b)} />
          </>
        )}
      </>
    )
  }

  const height = editing && item.type === 'text' ? editing.h : item.h
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: item.x, top: item.y, width: item.w, height, zIndex: item.z, transform: `rotate(${item.rotation}deg)`, boxShadow: ring }}
    >
      {item.type === 'sticky' && (
        <div className="h-full w-full" style={{ background: item.fill, borderRadius: 2, boxShadow: '0 1px 1px rgba(28,28,30,.06), 0 10px 22px rgba(28,28,30,.10)' }} />
      )}
      {item.type === 'shape' && (
        <svg className="absolute inset-0 overflow-visible" width={item.w} height={height}>
          <ShapeGraphic item={{ ...item, h: height }} />
        </svg>
      )}
      {item.type === 'frame' && (
        <>
          <div className="absolute left-0 font-semibold" style={{ top: -22, fontSize: 13, color: item.color, maxWidth: item.w }}>
            {!editing && (item.text || 'Frame')}
          </div>
          <div className="h-full w-full" style={{ background: hexAlpha(item.fill, 0.06), border: `${1.5 / zoom}px solid ${item.fill}`, borderRadius: 2 }} />
        </>
      )}
      {(item.type !== 'frame' || editing) && (
        <div
          className={cn('absolute overflow-hidden', item.type === 'shape' && 'flex items-center justify-center', item.type === 'frame' && 'overflow-visible')}
          style={{
            inset: item.type === 'frame' ? undefined : 0,
            top: item.type === 'frame' ? -24 : 0,
            left: 0,
            right: 0,
            height: item.type === 'frame' ? 22 : undefined,
            padding: item.type === 'sticky' ? 14 : item.type === 'text' ? '4px 2px' : 10,
            color: item.color,
            fontSize: item.fontSize,
            fontWeight: item.bold ? 700 : 500,
            textAlign: item.align,
            lineHeight: 1.35,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {editing ? (
            <textarea
              data-ui
              autoFocus
              value={editing.text}
              onChange={(event) => {
                const el = event.target
                let nextH = item.h
                if (item.type === 'text') {
                  el.style.height = '0px'
                  nextH = Math.max(item.fontSize + 20, el.scrollHeight)
                  el.style.height = `${nextH}px`
                }
                onEdit(el.value, nextH)
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onBlur={() => onFinish(item.id)}
              className="pointer-events-auto h-full w-full resize-none bg-transparent outline-none"
              style={{ color: 'inherit', font: 'inherit', textAlign: 'inherit', caretColor: item.color }}
            />
          ) : (
            item.text || (item.type === 'sticky' ? <span style={{ color: '#4A4332' }}>Type something</span> : null)
          )}
        </div>
      )}
      {selected && !item.locked && !editing && (
        <>
          {HANDLES.map((handle) => (
            <button
              key={handle.id}
              data-ui
              type="button"
              aria-label={`Resize ${handle.id}`}
              className="pointer-events-auto absolute rounded-[2px] border-solid bg-white"
              style={{
                left: handle.x,
                top: handle.y,
                width: 8 / zoom,
                height: 8 / zoom,
                transform: 'translate(-50%, -50%)',
                borderWidth: 1.5 / zoom,
                borderColor: ACCENT,
                cursor: handle.cursor,
              }}
              onPointerDown={(event) => onResize(event, { ...item, h: height }, handle.id)}
            />
          ))}
          {item.type !== 'frame' && (
            <button
              data-ui
              type="button"
              aria-label="Rotate"
              className="pointer-events-auto absolute rounded-full bg-white"
              style={{ left: '50%', top: -28 / zoom, width: 10 / zoom, height: 10 / zoom, transform: 'translate(-50%, -50%)', boxShadow: `0 0 0 ${1.5 / zoom}px ${ACCENT}` }}
              onPointerDown={(event) => onRotate(event, { ...item, h: height })}
            />
          )}
        </>
      )}
      {selected && item.locked && <LockBadge zoom={zoom} />}
    </div>
  )
}

function ShapeGraphic({ item }: { item: NodeItem }) {
  const sw = Math.max(item.strokeWidth, item.fill === 'transparent' ? 2 : 0)
  const props = { fill: item.fill === 'transparent' ? 'none' : item.fill, stroke: item.stroke, strokeWidth: sw }
  if (item.shape === 'ellipse') return <ellipse cx={item.w / 2} cy={item.h / 2} rx={Math.max(1, item.w / 2 - sw / 2)} ry={Math.max(1, item.h / 2 - sw / 2)} {...props} />
  if (item.shape === 'diamond') return <polygon points={`${item.w / 2},${sw} ${item.w - sw},${item.h / 2} ${item.w / 2},${item.h - sw} ${sw},${item.h / 2}`} {...props} />
  if (item.shape === 'triangle') return <polygon points={`${item.w / 2},${sw} ${item.w - sw},${item.h - sw} ${sw},${item.h - sw}`} {...props} />
  if (item.shape === 'parallelogram') return <polygon points={`${item.w * 0.18},${sw} ${item.w - sw},${sw} ${item.w * 0.82},${item.h - sw} ${sw},${item.h - sw}`} {...props} />
  return <rect x={sw / 2} y={sw / 2} width={Math.max(1, item.w - sw)} height={Math.max(1, item.h - sw)} rx={item.shape === 'round' ? 16 : 2} {...props} />
}

function EndHandle({ at, zoom, onPointerDown }: { at: Point; zoom: number; onPointerDown: (event: React.PointerEvent) => void }) {
  const size = 10 / zoom
  return (
    <button
      data-ui
      type="button"
      aria-label="Move line end"
      className="absolute rounded-full bg-white"
      style={{ left: at.x, top: at.y, width: size, height: size, transform: 'translate(-50%, -50%)', zIndex: 100001, boxShadow: `0 0 0 ${1.5 / zoom}px ${ACCENT}`, cursor: 'crosshair' }}
      onPointerDown={onPointerDown}
    />
  )
}

function LockBadge({ zoom }: { zoom: number }) {
  return (
    <div className="absolute flex items-center justify-center rounded-full bg-white text-[#4262FF]" style={{ right: 6 / zoom, top: 6 / zoom, width: 18 / zoom, height: 18 / zoom, boxShadow: `0 0 0 ${1 / zoom}px rgba(0,0,0,.08)` }}>
      <Lock size={11 / zoom} />
    </div>
  )
}

function DrawPreview({ gesture, zoom }: { gesture: Extract<Gesture, { kind: 'draw' }>; zoom: number }) {
  const box = normalizeRect(gesture.x1, gesture.y1, gesture.x2, gesture.y2)
  return (
    <div
      className="pointer-events-none absolute"
      style={{ ...boxStyle(box), border: `${1.5 / zoom}px dashed ${ACCENT}`, background: gesture.tool === 'frame' ? 'rgba(66,98,255,.05)' : 'rgba(255,255,255,.7)' }}
    />
  )
}

function FormatBar({
  items,
  left,
  top,
  onPatch,
  onAlign,
  onDuplicate,
  onDelete,
  onStack,
  onLock,
}: {
  items: BoardItem[]
  left: number
  top: number
  onPatch: (patch: ItemPatch) => void
  onAlign: (mode: AlignMode) => void
  onDuplicate: () => void
  onDelete: () => void
  onStack: (front: boolean) => void
  onLock: () => void
}) {
  const kind = items.every((item) => item.type === items[0]?.type) ? items[0]?.type : 'mixed'
  const node = items.find(isNode)
  const ink = items.find((item) => item.type === 'pen' || item.type === 'connector' || item.type === 'shape')
  const locked = items.every((item) => item.locked)
  return (
    <div
      data-ui
      className="absolute z-30 flex max-w-[min(760px,calc(100%-24px))] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-[12px] bg-white px-1.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_28px_rgba(0,0,0,.14)]"
      style={{ left, top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {kind === 'sticky' && <Swatches colors={STICKY_COLORS} value={node && isNode(node) ? node.fill : ''} onChange={(fill) => onPatch({ fill })} />}
      {kind === 'shape' && <Swatches colors={FILL_COLORS} value={node && isNode(node) ? node.fill : ''} onChange={(fill) => onPatch({ fill })} />}
      {kind === 'frame' && <Swatches colors={FRAME_COLORS} value={node && isNode(node) ? node.fill : ''} onChange={(fill) => onPatch({ fill })} />}
      {(kind === 'shape' || kind === 'pen' || kind === 'connector') && (
        <Swatches colors={INK_COLORS} value={ink && 'stroke' in ink ? ink.stroke : ''} onChange={(stroke) => onPatch({ stroke })} />
      )}
      {(kind === 'sticky' || kind === 'text' || kind === 'shape') && node && isNode(node) && (
        <>
          <BarSep />
          <Tiny label="Smaller text" onClick={() => onPatch({ fontSize: SIZES[Math.max(0, SIZES.indexOf(node.fontSize) - 1)] || Math.max(10, node.fontSize - 2) })}><Minus size={13} /></Tiny>
          <span className="w-6 text-center text-[11px] tabular-nums text-[#3C3C43]">{node.fontSize}</span>
          <Tiny label="Larger text" onClick={() => onPatch({ fontSize: SIZES[Math.min(SIZES.length - 1, Math.max(0, SIZES.indexOf(node.fontSize)) + 1)] || node.fontSize + 4 })}><Plus size={13} /></Tiny>
          <Tiny label="Bold" pressed={node.bold} onClick={() => onPatch({ bold: !node.bold })}><Bold size={13} /></Tiny>
          <Tiny label="Align left" pressed={node.align === 'left'} onClick={() => onPatch({ align: 'left' })}><AlignLeft size={13} /></Tiny>
          <Tiny label="Align center" pressed={node.align === 'center'} onClick={() => onPatch({ align: 'center' })}><AlignCenter size={13} /></Tiny>
        </>
      )}
      {kind === 'connector' && items[0]?.type === 'connector' && (
        <>
          <BarSep />
          {(['straight', 'elbow', 'curve'] as const).map((route) => (
            <button key={route} type="button" className={cn('rounded-[7px] px-1.5 py-1 text-[11px] capitalize', items[0].type === 'connector' && items[0].route === route ? 'bg-[#E7ECFF] text-[#4262FF]' : 'text-[#3C3C43] hover:bg-[#F2F3F5]')} onClick={() => onPatch({ route })}>
              {route}
            </button>
          ))}
          <button type="button" className="rounded-[7px] px-1.5 py-1 text-[11px] text-[#3C3C43] hover:bg-[#F2F3F5]" onClick={() => onPatch({ arrow: items[0].type === 'connector' && items[0].arrow === 'end' ? 'both' : items[0].type === 'connector' && items[0].arrow === 'both' ? 'none' : 'end' })}>
            Arrow
          </button>
        </>
      )}
      {(kind === 'pen' || kind === 'connector' || kind === 'shape') && (
        <>
          <BarSep />
          {[2, 4, 8].map((strokeWidth) => (
            <button key={strokeWidth} type="button" aria-label={`${strokeWidth}px stroke`} className="flex h-7 w-7 items-center justify-center rounded-[7px] hover:bg-[#F2F3F5]" onClick={() => onPatch({ strokeWidth })}>
              <span className="rounded-full bg-[#1C1C1E]" style={{ width: strokeWidth + 2, height: strokeWidth + 2 }} />
            </button>
          ))}
        </>
      )}
      {items.filter(isNode).length > 1 && (
        <>
          <BarSep />
          <Tiny label="Align left" onClick={() => onAlign('left')}><AlignLeft size={13} /></Tiny>
          <Tiny label="Align center" onClick={() => onAlign('center')}><AlignCenter size={13} /></Tiny>
          <Tiny label="Align right" onClick={() => onAlign('right')}><AlignRight size={13} /></Tiny>
          <Tiny label="Align top" onClick={() => onAlign('top')}><AlignVerticalJustifyStart size={13} /></Tiny>
          <Tiny label="Align middle" onClick={() => onAlign('middle')}><AlignVerticalJustifyCenter size={13} /></Tiny>
          <Tiny label="Align bottom" onClick={() => onAlign('bottom')}><AlignVerticalJustifyEnd size={13} /></Tiny>
        </>
      )}
      <BarSep />
      <Tiny label={locked ? 'Unlock' : 'Lock'} onClick={onLock}>{locked ? <Unlock size={13} /> : <Lock size={13} />}</Tiny>
      <Tiny label="Duplicate" onClick={onDuplicate}><Copy size={13} /></Tiny>
      <Tiny label="Send to back" onClick={() => onStack(false)}><SendToBack size={13} /></Tiny>
      <Tiny label="Bring to front" onClick={() => onStack(true)}><BringToFront size={13} /></Tiny>
      <Tiny label="Delete" onClick={onDelete}><Trash2 size={13} /></Tiny>
    </div>
  )
}

function Swatches({ colors, value, onChange }: { colors: string[]; value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex items-center gap-1 px-0.5">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color === 'transparent' ? 'No fill' : color}
          aria-pressed={value === color}
          className="h-[18px] w-[18px] rounded-full"
          style={{
            background: color === 'transparent' ? 'repeating-conic-gradient(#ddd 0% 25%, white 0% 50%)' : color,
            backgroundSize: color === 'transparent' ? '8px 8px' : undefined,
            boxShadow: value === color ? '0 0 0 1.5px white, 0 0 0 3px #4262FF' : 'inset 0 0 0 1px rgba(0,0,0,.16)',
          }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}

function MiniMap({ items, cam, view, onJump }: { items: BoardItem[]; cam: Camera; view: { w: number; h: number }; onJump: (world: Point) => void }) {
  const bounds = unionBounds(items) ?? { x: -500, y: -360, w: 1000, h: 720 }
  const pad = 140
  const world = { x: bounds.x - pad, y: bounds.y - pad, w: bounds.w + pad * 2, h: bounds.h + pad * 2 }
  const width = 176
  const height = 112
  const scale = Math.min(width / world.w, height / world.h)
  const ox = (width - world.w * scale) / 2
  const oy = (height - world.h * scale) / 2
  const vx = -cam.x / cam.zoom
  const vy = -cam.y / cam.zoom
  return (
    <button
      type="button"
      aria-label="Minimap"
      className="relative overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_rgba(0,0,0,.12)]"
      style={{ width, height }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = world.x + (event.clientX - rect.left - ox) / scale
        const y = world.y + (event.clientY - rect.top - oy) / scale
        onJump({ x, y })
      }}
    >
      {items.map((item) => {
        const box = item.type === 'connector' ? itemAabb(item, items) : item
        return <span key={item.id} className="absolute rounded-[1px]" style={{ left: ox + (box.x - world.x) * scale, top: oy + (box.y - world.y) * scale, width: Math.max(2, box.w * scale), height: Math.max(2, box.h * scale), background: item.type === 'sticky' && isNode(item) ? item.fill : item.type === 'pen' || item.type === 'connector' ? '#1C1C1E' : '#C5C7CF' }} />
      })}
      <span
        className="absolute border border-[#4262FF] bg-[#4262FF]/10"
        style={{ left: ox + (vx - world.x) * scale, top: oy + (vy - world.y) * scale, width: (view.w / cam.zoom) * scale, height: (view.h / cam.zoom) * scale }}
      />
    </button>
  )
}

function Tiny({ children, label, onClick, pressed, disabled }: { children: React.ReactNode; label: string; onClick: () => void; pressed?: boolean; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} onClick={onClick} className={cn('flex h-7 w-7 items-center justify-center rounded-[8px] text-[#1C1C1E] hover:bg-[#F2F3F5] disabled:text-[#C5C7CF]', pressed && 'bg-[#E7ECFF] text-[#4262FF]')}>
      {children}
    </button>
  )
}

function BarSep() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-black/10" />
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span>{label}</span>
      <span className="font-medium tabular-nums text-[#1C1C1E]">{keys}</span>
    </div>
  )
}

function boxStyle(box: Box): React.CSSProperties {
  return { left: box.x, top: box.y, width: box.w, height: box.h }
}

function project(items: BoardItem[], g: Gesture | null, zoom: number, snap: boolean): { items: BoardItem[]; lines: Guide[] } {
  if (!g) return { items, lines: [] }
  if (g.kind === 'move') {
    const snapped = snapMove(g.start, g.ids, g.dx, g.dy, zoom, snap)
    return { items: translateItems(g.start, g.ids, snapped.dx, snapped.dy), lines: snapped.lines }
  }
  if (g.kind === 'resize') return { items: items.map((item) => (item.id === g.id && isNode(item) ? { ...item, ...g.box } : item)), lines: [] }
  if (g.kind === 'rotate') return { items: items.map((item) => (item.id === g.id ? { ...item, rotation: g.rotation } : item)), lines: [] }
  if (g.kind === 'erase') return { items: g.items, lines: [] }
  if (g.kind === 'end') {
    return {
      items: items.map((item) => {
        if (item.id !== g.id || item.type !== 'connector') return item
        const x1 = g.which === 'a' ? g.x : item.x1
        const y1 = g.which === 'a' ? g.y : item.y1
        const x2 = g.which === 'b' ? g.x : item.x2
        const y2 = g.which === 'b' ? g.y : item.y2
        return { ...item, fromId: g.which === 'a' ? undefined : item.fromId, toId: g.which === 'b' ? undefined : item.toId, ...linkBox(x1, y1, x2, y2) }
      }),
      lines: [],
    }
  }
  return { items, lines: [] }
}
