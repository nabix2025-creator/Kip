export function drawTrayIcon(day: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return ''
  context.clearRect(0, 0, 64, 64)
  context.strokeStyle = '#FFFFFF'
  context.lineWidth = 4
  roundRect(context, 6, 8, 52, 48, 8)
  context.stroke()
  context.fillStyle = '#FF3B30'
  context.fillRect(6, 8, 52, 14)
  context.fillStyle = '#FFFFFF'
  context.font = '700 28px Inter, Segoe UI, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(day), 32, 40)
  return canvas.toDataURL('image/png')
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}
