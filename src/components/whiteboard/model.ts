import { uid } from '@/lib/id'

export type Tool = 'select' | 'hand' | 'sticky' | 'text' | 'shape' | 'connector' | 'pen' | 'frame' | 'eraser'
export type ShapeKind = 'rect' | 'round' | 'ellipse' | 'diamond' | 'triangle' | 'parallelogram'
export type RouteKind = 'straight' | 'elbow' | 'curve'
export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface Point {
  x: number
  y: number
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface NodeItem extends Box {
  id: string
  type: 'sticky' | 'text' | 'shape' | 'frame'
  rotation: number
  z: number
  locked: boolean
  text: string
  fill: string
  color: string
  stroke: string
  strokeWidth: number
  fontSize: number
  bold: boolean
  align: 'left' | 'center'
  shape: ShapeKind
}

export interface PenItem extends Box {
  id: string
  type: 'pen'
  rotation: number
  z: number
  locked: boolean
  points: Point[]
  stroke: string
  strokeWidth: number
}

export interface ConnectorItem extends Box {
  id: string
  type: 'connector'
  rotation: number
  z: number
  locked: boolean
  x1: number
  y1: number
  x2: number
  y2: number
  fromId?: string
  toId?: string
  route: RouteKind
  stroke: string
  strokeWidth: number
  arrow: 'end' | 'both' | 'none'
}

export type BoardItem = NodeItem | PenItem | ConnectorItem

export interface Guide {
  axis: 'x' | 'y'
  at: number
}

export const STICKY_COLORS = ['#FFF6A3', '#F8C4D4', '#C9E8B5', '#B9D6F6', '#D9C8F5', '#FFD7A8', '#E7E7EC']
export const FILL_COLORS = ['#FFFFFF', '#FFF6A3', '#F8C4D4', '#C9E8B5', '#B9D6F6', '#D9C8F5', '#FFD7A8', '#1C1C1E', 'transparent']
export const INK_COLORS = ['#1C1C1E', '#4262FF', '#E5484D', '#2F9E62', '#E29A12', '#8E4EC6']
export const FRAME_COLORS = ['#4262FF', '#E5484D', '#2F9E62', '#E29A12', '#8E4EC6', '#1C1C1E']

export const ACCENT = '#4262FF'
export const CANVAS = '#F4F5F7'

export function isNode(item: BoardItem): item is NodeItem {
  return item.type === 'sticky' || item.type === 'text' || item.type === 'shape' || item.type === 'frame'
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function frontZ(items: BoardItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.z), 0) + 1
}

export function backZ(items: BoardItem[]): number {
  return items.reduce((min, item) => Math.min(min, item.z), 0) - 1
}

function baseNode(type: NodeItem['type'], x: number, y: number, w: number, h: number, z: number): NodeItem {
  return {
    id: uid(),
    type,
    x,
    y,
    w,
    h,
    rotation: 0,
    z,
    locked: false,
    text: '',
    fill: '#FFFFFF',
    color: '#1C1C1E',
    stroke: 'transparent',
    strokeWidth: 0,
    fontSize: 16,
    bold: false,
    align: 'left',
    shape: 'rect',
  }
}

export function createSticky(x: number, y: number, fill: string, z: number): NodeItem {
  return { ...baseNode('sticky', x - 100, y - 100, 200, 200, z), fill, fontSize: 16 }
}

export function createText(x: number, y: number, z: number): NodeItem {
  return { ...baseNode('text', x - 8, y - 22, 280, 52, z), fill: 'transparent', fontSize: 28, bold: true }
}

export function createShape(box: Box, kind: ShapeKind, z: number): NodeItem {
  return {
    ...baseNode('shape', box.x, box.y, Math.max(32, box.w), Math.max(32, box.h), z),
    shape: kind,
    fill: '#FFFFFF',
    stroke: '#1C1C1E',
    strokeWidth: 2,
    align: 'center',
  }
}

export function createFrame(box: Box, z: number): NodeItem {
  return {
    ...baseNode('frame', box.x, box.y, Math.max(120, box.w), Math.max(80, box.h), z),
    text: 'Frame',
    fill: ACCENT,
    fontSize: 13,
    bold: true,
  }
}

export function createPen(points: Point[], stroke: string, width: number, z: number): PenItem | null {
  if (points.length < 2) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  const pad = width
  const x = minX - pad
  const y = minY - pad
  return {
    id: uid(),
    type: 'pen',
    x,
    y,
    w: Math.max(1, maxX - minX + pad * 2),
    h: Math.max(1, maxY - minY + pad * 2),
    rotation: 0,
    z,
    locked: false,
    points: points.map((point) => ({ x: point.x - x, y: point.y - y })),
    stroke,
    strokeWidth: width,
  }
}

export function linkBox(x1: number, y1: number, x2: number, y2: number): Pick<ConnectorItem, 'x' | 'y' | 'w' | 'h' | 'x1' | 'y1' | 'x2' | 'y2'> {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.max(1, Math.abs(x2 - x1)),
    h: Math.max(1, Math.abs(y2 - y1)),
    x1,
    y1,
    x2,
    y2,
  }
}

export function createConnector(x1: number, y1: number, x2: number, y2: number, fromId: string | undefined, toId: string | undefined, stroke: string, z: number): ConnectorItem | null {
  if (Math.hypot(x2 - x1, y2 - y1) < 4) return null
  if (fromId && fromId === toId) return null
  return {
    id: uid(),
    type: 'connector',
    rotation: 0,
    z,
    locked: false,
    route: 'elbow',
    stroke,
    strokeWidth: 2,
    arrow: 'end',
    fromId,
    toId,
    ...linkBox(x1, y1, x2, y2),
  }
}

export function center(box: Box): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

export function toLocal(item: Box & { rotation: number }, x: number, y: number): Point {
  const c = center(item)
  const rad = (-item.rotation * Math.PI) / 180
  const dx = x - c.x
  const dy = y - c.y
  return {
    x: dx * Math.cos(rad) - dy * Math.sin(rad) + item.w / 2,
    y: dx * Math.sin(rad) + dy * Math.cos(rad) + item.h / 2,
  }
}

export function edgePoint(item: NodeItem, tx: number, ty: number): Point {
  const c = center(item)
  const rad = (-item.rotation * Math.PI) / 180
  const dx = tx - c.x
  const dy = ty - c.y
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad)
  if (lx === 0 && ly === 0) return { x: c.x, y: item.y }
  let ex = 0
  let ey = 0
  if (item.type === 'shape' && item.shape === 'ellipse') {
    const len = Math.hypot(lx, ly) || 1
    const nx = lx / len
    const ny = ly / len
    const rx = item.w / 2
    const ry = item.h / 2
    const t = 1 / Math.sqrt((nx * nx) / (rx * rx) + (ny * ny) / (ry * ry))
    ex = nx * t
    ey = ny * t
  } else {
    const sx = Math.abs(lx) > 0.001 ? item.w / 2 / Math.abs(lx) : Infinity
    const sy = Math.abs(ly) > 0.001 ? item.h / 2 / Math.abs(ly) : Infinity
    const s = Math.min(sx, sy)
    ex = lx * s
    ey = ly * s
  }
  const world = (item.rotation * Math.PI) / 180
  return {
    x: c.x + ex * Math.cos(world) - ey * Math.sin(world),
    y: c.y + ex * Math.sin(world) + ey * Math.cos(world),
  }
}

export function resolveEnds(item: ConnectorItem, items: BoardItem[]): { a: Point; b: Point } {
  let a = { x: item.x1, y: item.y1 }
  let b = { x: item.x2, y: item.y2 }
  const from = item.fromId ? items.find((entry) => entry.id === item.fromId && isNode(entry)) : undefined
  const to = item.toId ? items.find((entry) => entry.id === item.toId && isNode(entry)) : undefined
  if (from && isNode(from) && to && isNode(to)) {
    a = edgePoint(from, center(to).x, center(to).y)
    b = edgePoint(to, a.x, a.y)
    a = edgePoint(from, b.x, b.y)
  } else if (from && isNode(from)) a = edgePoint(from, b.x, b.y)
  else if (to && isNode(to)) b = edgePoint(to, a.x, a.y)
  return { a, b }
}

export function connectorPath(a: Point, b: Point, route: RouteKind): string {
  if (route === 'straight') return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  if (route === 'curve') {
    const dx = Math.max(48, Math.abs(b.x - a.x) * 0.45)
    const dir = b.x >= a.x ? 1 : -1
    return `M ${a.x} ${a.y} C ${a.x + dx * dir} ${a.y}, ${b.x - dx * dir} ${b.y}, ${b.x} ${b.y}`
  }
  const mid = (a.x + b.x) / 2
  return `M ${a.x} ${a.y} L ${mid} ${a.y} L ${mid} ${b.y} L ${b.x} ${b.y}`
}

export function curveControls(a: Point, b: Point): [Point, Point] {
  const dx = Math.max(48, Math.abs(b.x - a.x) * 0.45)
  const dir = b.x >= a.x ? 1 : -1
  return [
    { x: a.x + dx * dir, y: a.y },
    { x: b.x - dx * dir, y: b.y },
  ]
}

function bezier(a: Point, c1: Point, c2: Point, b: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  }
}

export function distToSeg(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1)
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function pointInPoly(p: Point, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    const hit = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi || 0.00001) + xi
    if (hit) inside = !inside
  }
  return inside
}

function shapePoly(item: NodeItem): Point[] | null {
  const { w, h } = item
  if (item.shape === 'diamond') return [
    { x: w / 2, y: 0 },
    { x: w, y: h / 2 },
    { x: w / 2, y: h },
    { x: 0, y: h / 2 },
  ]
  if (item.shape === 'triangle') return [
    { x: w / 2, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ]
  if (item.shape === 'parallelogram') return [
    { x: w * 0.18, y: 0 },
    { x: w, y: 0 },
    { x: w * 0.82, y: h },
    { x: 0, y: h },
  ]
  return null
}

function hitsNode(item: NodeItem, x: number, y: number): boolean {
  const p = toLocal(item, x, y)
  if (item.type === 'frame') {
    const title = p.x >= -4 && p.x <= Math.max(120, Math.min(item.w, 240)) && p.y >= -26 && p.y <= 2
    if (title) return true
    if (p.x < 0 || p.y < 0 || p.x > item.w || p.y > item.h) return false
    const pad = 14
    return p.x < pad || p.y < pad || p.x > item.w - pad || p.y > item.h - pad
  }
  if (item.type === 'shape' && item.shape === 'ellipse') {
    const nx = (p.x - item.w / 2) / (item.w / 2)
    const ny = (p.y - item.h / 2) / (item.h / 2)
    return nx * nx + ny * ny <= 1.02
  }
  const poly = item.type === 'shape' ? shapePoly(item) : null
  if (poly) return pointInPoly(p, poly)
  return p.x >= 0 && p.y >= 0 && p.x <= item.w && p.y <= item.h
}

function nearPath(item: ConnectorItem, items: BoardItem[], point: Point, slop: number): boolean {
  const { a, b } = resolveEnds(item, items)
  if (item.route === 'straight') return distToSeg(point, a, b) <= slop
  if (item.route === 'elbow') {
    const mid = (a.x + b.x) / 2
    const c = { x: mid, y: a.y }
    const d = { x: mid, y: b.y }
    return distToSeg(point, a, c) <= slop || distToSeg(point, c, d) <= slop || distToSeg(point, d, b) <= slop
  }
  const [c1, c2] = curveControls(a, b)
  let prev = a
  for (let i = 1; i <= 16; i++) {
    const next = bezier(a, c1, c2, b, i / 16)
    if (distToSeg(point, prev, next) <= slop) return true
    prev = next
  }
  return false
}

export function hitTest(items: BoardItem[], x: number, y: number, zoom: number): BoardItem | null {
  const slop = 8 / zoom
  const ordered = [...items].sort((a, b) => b.z - a.z)
  for (const item of ordered) {
    if (item.type === 'pen') {
      const pts = item.points.map((point) => ({ x: item.x + point.x, y: item.y + point.y }))
      for (let i = 1; i < pts.length; i++) {
        if (distToSeg({ x, y }, pts[i - 1], pts[i]) <= slop + item.strokeWidth / 2) return item
      }
      continue
    }
    if (item.type === 'connector') {
      if (nearPath(item, items, { x, y }, slop + item.strokeWidth / 2)) return item
      continue
    }
    if (hitsNode(item, x, y)) return item
  }
  return null
}

export function plainBounds(items: Box[]): Box | null {
  if (!items.length) return null
  const x = Math.min(...items.map((item) => item.x))
  const y = Math.min(...items.map((item) => item.y))
  const right = Math.max(...items.map((item) => item.x + item.w))
  const bottom = Math.max(...items.map((item) => item.y + item.h))
  return { x, y, w: right - x, h: bottom - y }
}

export function unionBounds(items: BoardItem[]): Box | null {
  if (!items.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  for (const item of items) {
    if (item.type === 'connector') {
      const { a, b } = resolveEnds(item, items)
      grow(a.x, a.y)
      grow(b.x, b.y)
      continue
    }
    const c = center(item)
    const rad = (item.rotation * Math.PI) / 180
    for (const [px, py] of [
      [0, 0],
      [item.w, 0],
      [item.w, item.h],
      [0, item.h],
    ]) {
      const dx = px - item.w / 2
      const dy = py - item.h / 2
      grow(c.x + dx * Math.cos(rad) - dy * Math.sin(rad), c.y + dx * Math.sin(rad) + dy * Math.cos(rad))
    }
  }
  if (!Number.isFinite(minX)) return null
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) }
}

export function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function itemAabb(item: BoardItem, items: BoardItem[]): Box {
  if (item.type === 'connector') {
    const { a, b } = resolveEnds(item, items)
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x) || 1, h: Math.abs(a.y - b.y) || 1 }
  }
  const bounds = unionBounds([item])
  return bounds ?? item
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Box {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

export function resizeBox(item: Box & { rotation: number }, handle: Handle, dx: number, dy: number, shift: boolean): Box {
  const rad = (-item.rotation * Math.PI) / 180
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad)
  let left = -item.w / 2
  let right = item.w / 2
  let top = -item.h / 2
  let bottom = item.h / 2
  if (handle.includes('e')) right += lx
  if (handle.includes('w')) left += lx
  if (handle.includes('s')) bottom += ly
  if (handle.includes('n')) top += ly
  if (shift && item.w > 0 && item.h > 0) {
    const ratio = item.w / item.h
    let nw = right - left
    let nh = bottom - top
    if (handle === 'n' || handle === 's') nw = nh * ratio
    else if (handle === 'e' || handle === 'w') nh = nw / ratio
    else if (Math.abs(nw) > Math.abs(nh * ratio)) nh = nw / ratio
    else nw = nh * ratio
    if (handle.includes('w') && !handle.includes('e')) left = right - nw
    else if (handle.includes('e')) right = left + nw
    else {
      const mid = (left + right) / 2
      left = mid - nw / 2
      right = mid + nw / 2
    }
    if (handle.includes('n') && !handle.includes('s')) top = bottom - nh
    else if (handle.includes('s')) bottom = top + nh
    else {
      const mid = (top + bottom) / 2
      top = mid - nh / 2
      bottom = mid + nh / 2
    }
  }
  const min = 28
  if (right - left < min) {
    if (handle.includes('w')) left = right - min
    else right = left + min
  }
  if (bottom - top < min) {
    if (handle.includes('n')) top = bottom - min
    else bottom = top + min
  }
  const nw = right - left
  const nh = bottom - top
  const lcx = (left + right) / 2
  const lcy = (top + bottom) / 2
  const world = (item.rotation * Math.PI) / 180
  const cx = item.x + item.w / 2
  const cy = item.y + item.h / 2
  return {
    x: cx + (lcx * Math.cos(world) - lcy * Math.sin(world)) - nw / 2,
    y: cy + (lcx * Math.sin(world) + lcy * Math.cos(world)) - nh / 2,
    w: nw,
    h: nh,
  }
}

export function snapMove(start: BoardItem[], ids: string[], dx: number, dy: number, zoom: number, enabled: boolean): { dx: number; dy: number; lines: Guide[] } {
  if (!enabled) return { dx, dy, lines: [] }
  const chosen = new Set(ids)
  const moving = start.filter((item) => chosen.has(item.id) && item.type !== 'connector')
  const others = start.filter((item) => !chosen.has(item.id) && item.type !== 'connector')
  const thresh = 6 / zoom
  let bestX = thresh
  let bestY = thresh
  let corrX = 0
  let corrY = 0
  let xAt: number[] = []
  let yAt: number[] = []
  for (const box of moving) {
    const xs = [box.x + dx, box.x + dx + box.w / 2, box.x + dx + box.w]
    const ys = [box.y + dy, box.y + dy + box.h / 2, box.y + dy + box.h]
    for (const other of others) {
      const ox = [other.x, other.x + other.w / 2, other.x + other.w]
      const oy = [other.y, other.y + other.h / 2, other.y + other.h]
      for (const x of xs) {
        for (const target of ox) {
          const dist = Math.abs(x - target)
          if (dist < bestX - 0.01) {
            bestX = dist
            corrX = target - x
            xAt = [target]
          }
        }
      }
      for (const y of ys) {
        for (const target of oy) {
          const dist = Math.abs(y - target)
          if (dist < bestY - 0.01) {
            bestY = dist
            corrY = target - y
            yAt = [target]
          }
        }
      }
    }
  }
  const snappedX = bestX < thresh
  const snappedY = bestY < thresh
  return {
    dx: dx + (snappedX ? corrX : 0),
    dy: dy + (snappedY ? corrY : 0),
    lines: [...(snappedX ? xAt.map((at) => ({ axis: 'x' as const, at })) : []), ...(snappedY ? yAt.map((at) => ({ axis: 'y' as const, at })) : [])],
  }
}

export function translateItems(start: BoardItem[], ids: string[], dx: number, dy: number): BoardItem[] {
  const chosen = new Set(ids)
  return start.map((item) => {
    if (!chosen.has(item.id) || item.locked) return item
    if (item.type === 'connector') {
      if (item.fromId || item.toId) return item
      return { ...item, ...linkBox(item.x1 + dx, item.y1 + dy, item.x2 + dx, item.y2 + dy) }
    }
    return { ...item, x: item.x + dx, y: item.y + dy }
  })
}

export function cloneItems(items: BoardItem[], dx: number, dy: number): BoardItem[] {
  const map = new Map(items.map((item) => [item.id, uid()]))
  return items.map((item) => {
    const id = map.get(item.id) ?? uid()
    if (item.type === 'connector') {
      return {
        ...item,
        id,
        ...linkBox(item.x1 + dx, item.y1 + dy, item.x2 + dx, item.y2 + dy),
        fromId: item.fromId && map.has(item.fromId) ? map.get(item.fromId) : undefined,
        toId: item.toId && map.has(item.toId) ? map.get(item.toId) : undefined,
      }
    }
    return { ...item, id, x: item.x + dx, y: item.y + dy }
  })
}

let clipboard: BoardItem[] = []
let pasteCount = 0

export function copyItems(items: BoardItem[]): void {
  clipboard = structuredClone(items)
  pasteCount = 0
}

export function pasteItems(z: number): BoardItem[] {
  if (!clipboard.length) return []
  pasteCount += 1
  return cloneItems(clipboard, 28 * pasteCount, 28 * pasteCount).map((item, index) => ({ ...item, z: z + index }))
}

export function deleteItems(items: BoardItem[], ids: Iterable<string>): BoardItem[] {
  const gone = new Set(ids)
  return items
    .filter((item) => !gone.has(item.id))
    .map((item) => {
      if (item.type !== 'connector') return item
      const ends = resolveEnds(item, items)
      let x1 = item.x1
      let y1 = item.y1
      let x2 = item.x2
      let y2 = item.y2
      let fromId = item.fromId
      let toId = item.toId
      if (fromId && gone.has(fromId)) {
        x1 = ends.a.x
        y1 = ends.a.y
        fromId = undefined
      }
      if (toId && gone.has(toId)) {
        x2 = ends.b.x
        y2 = ends.b.y
        toId = undefined
      }
      return { ...item, fromId, toId, ...linkBox(x1, y1, x2, y2) }
    })
}

export function alignItems(items: BoardItem[], ids: string[], mode: AlignMode): BoardItem[] {
  const chosen = items.filter((item) => ids.includes(item.id) && isNode(item))
  const bounds = plainBounds(chosen)
  if (!bounds || chosen.length < 2) return items
  const picked = new Set(chosen.map((item) => item.id))
  return items.map((item) => {
    if (!picked.has(item.id) || !isNode(item)) return item
    if (mode === 'left') return { ...item, x: bounds.x }
    if (mode === 'center') return { ...item, x: bounds.x + bounds.w / 2 - item.w / 2 }
    if (mode === 'right') return { ...item, x: bounds.x + bounds.w - item.w }
    if (mode === 'top') return { ...item, y: bounds.y }
    if (mode === 'middle') return { ...item, y: bounds.y + bounds.h / 2 - item.h / 2 }
    return { ...item, y: bounds.y + bounds.h - item.h }
  })
}

export function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points
  let max = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const dist = distToSeg(points[i], points[0], points[points.length - 1])
    if (dist > max) {
      max = dist
      index = i
    }
  }
  if (max > epsilon) {
    const left = simplify(points.slice(0, index + 1), epsilon)
    const right = simplify(points.slice(index), epsilon)
    return [...left.slice(0, -1), ...right]
  }
  return [points[0], points[points.length - 1]]
}

export function sameItems(a: BoardItem[], b: BoardItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function hexAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  if (value.length !== 6) return hex
  const n = Number.parseInt(value, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function screenPoint(clientX: number, clientY: number, rect: DOMRect, cam: Camera): Point {
  return { x: (clientX - rect.left - cam.x) / cam.zoom, y: (clientY - rect.top - cam.y) / cam.zoom }
}
