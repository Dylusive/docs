import type { ViewMode } from '@/types'
import type { PageGeometry } from './bookCss'

export interface CanvasMetrics {
  positions: { x: number; y: number }[]
  width: number
  height: number
  rowPitch: number
  pad: number
  perRow: 1 | 2
}
export const CANVAS_PAD = 56

/** Where every page sits on the (unscaled) canvas for a view mode. Page 1 is a right-hand page. */
export function canvasMetrics(count: number, geo: PageGeometry, view: ViewMode): CanvasMetrics {
  const pad = CANVAS_PAD
  const gap = view === 'continuous' ? 28 : 64
  const rowPitch = geo.trimH + gap
  const positions: { x: number; y: number }[] = []
  if (view === 'spread') {
    for (let i = 0; i < count; i++) {
      const row = Math.ceil(i / 2)
      const right = i % 2 === 0
      positions.push({ x: pad + (right ? geo.trimW : 0), y: pad + row * rowPitch })
    }
    const rows = count ? Math.ceil((count - 1) / 2) + 1 : 1
    return { positions, width: geo.trimW * 2 + pad * 2, height: pad * 2 + rows * rowPitch - gap, rowPitch, pad, perRow: 2 }
  }
  for (let i = 0; i < count; i++) positions.push({ x: pad, y: pad + i * rowPitch })
  return { positions, width: geo.trimW + pad * 2, height: pad * 2 + Math.max(1, count) * rowPitch - gap, rowPitch, pad, perRow: 1 }
}

/** Indices of pages whose rows intersect [top, bottom] (unscaled px), plus overscan rows. */
export function visibleRange(m: CanvasMetrics, count: number, top: number, bottom: number, overscanRows = 1): [number, number] {
  const firstRow = Math.max(0, Math.floor((top - m.pad) / m.rowPitch) - overscanRows)
  const lastRow = Math.max(0, Math.floor((bottom - m.pad) / m.rowPitch) + overscanRows)
  if (m.perRow === 1) return [Math.min(firstRow, Math.max(0, count - 1)), Math.min(lastRow, count - 1)]
  const first = firstRow === 0 ? 0 : firstRow * 2 - 1
  const last = lastRow === 0 ? 0 : lastRow * 2
  return [Math.min(first, Math.max(0, count - 1)), Math.min(last, count - 1)]
}
