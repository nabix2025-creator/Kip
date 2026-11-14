export interface TimedSegment {
  id: string
  startMin: number
  endMin: number
}

export interface PlacedSegment extends TimedSegment {
  col: number
  cols: number
}

export function layoutSegments(segments: TimedSegment[]): PlacedSegment[] {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)
  const parent = sorted.map((_, index) => index)
  const find = (index: number): number => (parent[index] === index ? index : (parent[index] = find(parent[index])))
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b)
  }
  const overlaps = (a: TimedSegment, b: TimedSegment) => a.startMin < b.endMin && b.startMin < a.endMin

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (overlaps(sorted[i], sorted[j])) union(i, j)
    }
  }

  const groups = new Map<number, number[]>()
  sorted.forEach((_, index) => {
    const root = find(index)
    groups.set(root, [...(groups.get(root) ?? []), index])
  })

  const placed: PlacedSegment[] = sorted.map((segment) => ({ ...segment, col: 0, cols: 1 }))
  for (const indexes of groups.values()) {
    const columns: number[] = []
    let maxCol = 0
    const assignment = new Map<number, number>()
    for (const index of indexes) {
      const segment = sorted[index]
      let col = 0
      while (columns[col] !== undefined && columns[col] > segment.startMin) col += 1
      columns[col] = segment.endMin
      assignment.set(index, col)
      maxCol = Math.max(maxCol, col)
    }
    const cols = maxCol + 1
    for (const index of indexes) {
      placed[index] = { ...sorted[index], col: assignment.get(index) ?? 0, cols }
    }
  }
  return placed
}
