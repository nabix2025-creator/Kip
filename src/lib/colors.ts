export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '')
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned
  const value = Number.parseInt(full, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

export function mixHex(fromHex: string, towardHex: string, amount: number): string {
  const from = hexToRgb(fromHex)
  const toward = hexToRgb(towardHex)
  const channel = (start: number, end: number) => Math.round(start + (end - start) * amount)
  const r = channel(from.r, toward.r)
  const g = channel(from.g, toward.g)
  const b = channel(from.b, toward.b)
  return `rgb(${r}, ${g}, ${b})`
}

export function eventStyle(hex: string, theme: 'light' | 'dark'): { background: string; color: string; bar: string } {
  const { r, g, b } = hexToRgb(hex)
  if (theme === 'dark') {
    return {
      background: `rgba(${r}, ${g}, ${b}, 0.28)`,
      color: mixHex('#ffffff', hex, 0.35),
      bar: hex,
    }
  }
  // Soft macOS Calendar pastel wash
  return {
    background: `rgba(${r}, ${g}, ${b}, 0.16)`,
    color: mixHex(hex, '#1c1c1e', 0.55),
    bar: hex,
  }
}
