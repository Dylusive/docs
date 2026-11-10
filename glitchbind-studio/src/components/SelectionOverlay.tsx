import { useLayoutEffect, useState } from 'react'
import { NodeSelection } from '@tiptap/pm/state'
import { useUI } from '@/store/ui'
import { useLayout } from '@/store/layout'
import { controller } from '@/lib/editor/controller'
import type { CanvasMetrics } from '@/lib/canvasLayout'
import type { PageGeometry } from '@/lib/bookCss'

interface Rect { left: number; top: number; width: number; height: number }

/**
 * A text selection can run across several pages, but the live editor is only showing through one of them.
 * This paints the rest of the selection on the other (static) pages of the chapter, from the same DOM range.
 */
export function SelectionOverlay({ metrics, geo, mirrored }: { metrics: CanvasMetrics; geo: PageGeometry; mirrored: boolean }) {
  const tick = useUI((s) => s.tick)
  const livePage = useUI((s) => s.livePage)
  const gen = useLayout((s) => s.gen)
  const [rects, setRects] = useState<Rect[]>([])

  useLayoutEffect(() => {
    const view = controller.view
    const root = controller.root()
    const sel = view?.state.selection
    if (!view || !root || !sel || sel.empty || sel instanceof NodeSelection) { setRects((r) => (r.length ? [] : r)); return }
    const pages = useLayout.getState().pages.filter((p) => p.sectionId === controller.activeId && p.index !== livePage && p.page?.segments.some((s) => s.key === 'main'))
    const y0 = controller.flowY(sel.from)
    const y1 = controller.flowY(sel.to)
    if (!pages.length || y0 === null || y1 === null) { setRects((r) => (r.length ? [] : r)); return }
    const touched = pages.filter((p) => { const seg = p.page!.segments.find((s) => s.key === 'main')!; return y1 >= seg.y0 && y0 < seg.y1 })
    if (!touched.length) { setRects((r) => (r.length ? [] : r)); return }
    const range = document.createRange()
    try {
      const a = view.domAtPos(sel.from)
      const b = view.domAtPos(sel.to)
      range.setStart(a.node, a.offset)
      range.setEnd(b.node, b.offset)
    } catch { return }
    const rr = root.getBoundingClientRect()
    const scale = root.offsetWidth ? rr.width / root.offsetWidth : 1
    const flow = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 2).slice(0, 1500)
      .map((r) => ({ x: (r.left - rr.left) / scale, y: (r.top - rr.top) / scale, w: r.width / scale, h: r.height / scale }))
    const out: Rect[] = []
    for (const p of touched) {
      const page = p.page!
      const pos = metrics.positions[p.index]
      if (!pos) continue
      const mLeft = mirrored ? (p.side === 'left' ? geo.outside : geo.inside) : (geo.inside + geo.outside) / 2
      let before = page.offsetY
      let seg = page.segments[0]
      for (const s of page.segments) { if (s.key === 'main') { seg = s; break } before += s.y1 - s.y0 }
      for (const r of flow) {
        const mid = r.y + r.h / 2
        if (mid < seg.y0 || mid >= seg.y1) continue
        out.push({ left: pos.x + mLeft + r.x, top: pos.y + geo.top + before + (r.y - seg.y0), width: r.w, height: r.h })
      }
    }
    setRects(out)
  }, [tick, livePage, gen, metrics, geo, mirrored])

  return <>{rects.map((r, i) => <div key={i} className="gb-sel-rect" style={r} />)}</>
}
