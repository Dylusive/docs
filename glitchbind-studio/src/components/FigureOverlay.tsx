import { useLayoutEffect, useRef, useState } from 'react'
import { NodeSelection } from '@tiptap/pm/state'
import { useUI } from '@/store/ui'
import { useLayout } from '@/store/layout'
import { controller } from '@/lib/editor/controller'
import { figureAspect, figureContext, figureDpi, type FigureAttrs } from '@/lib/editor/figure'
import { imageMeta } from '@/lib/images'
import { clamp, round } from '@/lib/units'

interface Box { x: number; y: number; w: number; h: number; pageX: number; pageY: number; contentX: number }
interface Snap { x?: number; y?: number }
type Corner = 'nw' | 'ne' | 'sw' | 'se'
const SNAP = 7

function selectedFigure(): { attrs: FigureAttrs; el: HTMLElement } | null {
  const sel = controller.editor?.state.selection
  if (!controller.activeId || !(sel instanceof NodeSelection) || sel.node.type.name !== 'figure') return null
  const attrs = sel.node.attrs as FigureAttrs
  const anchored = attrs.wrap === 'page' || attrs.wrap === 'behind'
  const q = `figure[data-fig-id="${attrs.id}"]`
  const el = (anchored ? document.querySelector(`.gb-screen .gb-page ${q}`) : document.querySelector(`.gb-live ${q}`)) as HTMLElement | null
  return el ? { attrs, el } : null
}

/**
 * Selection handles for the selected image: corner resize (Shift = free aspect, which crops),
 * rotate, and — for behind-text images — free move with snap guides to the margins and page centre.
 * In-flow images are moved by dragging the image itself to a new place in the text.
 */
export function FigureOverlay({ zoom }: { zoom: number }) {
  useUI((s) => s.tick)
  useUI((s) => s.livePage)
  useLayout((s) => s.gen)
  const geo = useLayout((s) => s.geo)
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [snap, setSnap] = useState<Snap>({})
  const [, force] = useState(0)
  const drag = useRef<{ kind: 'resize' | 'rotate' | 'move'; corner?: Corner; sx: number; sy: number; a: FigureAttrs; w: number; h: number; cxp: number; cyp: number } | null>(null)

  const fig = selectedFigure()
  const figId = fig?.attrs.id

  useLayoutEffect(() => {
    const measure = (): void => {
      const f = selectedFigure()
      const world = ref.current?.parentElement
      if (!f || !world) { setBox((b) => (b ? null : b)); return }
      const frame = (f.el.querySelector('.gb-fig-frame') as HTMLElement | null) ?? f.el
      const wr = world.getBoundingClientRect()
      const r = frame.getBoundingClientRect()
      // while the app is hidden (print view showing) nothing has a size: keep the last good box
      if (wr.width < 1 || !(world as HTMLElement).offsetWidth) return
      const z = wr.width / (world as HTMLElement).offsetWidth
      const pageEl = (f.el.closest('.gb-page') ?? document.querySelector('.gb-page[data-live="true"]')) as HTMLElement | null
      const page = pageEl?.getBoundingClientRect()
      const content = pageEl?.querySelector('.gb-page-content') as HTMLElement | null
      const w = f.attrs.wrap === 'page' ? r.width / z : frame.offsetWidth
      const h = f.attrs.wrap === 'page' ? r.height / z : frame.offsetHeight
      const cx = (r.left + r.width / 2 - wr.left) / z
      const cy = (r.top + r.height / 2 - wr.top) / z
      const next: Box = { x: cx - w / 2, y: cy - h / 2, w, h, pageX: page ? (page.left - wr.left) / z : 0, pageY: page ? (page.top - wr.top) / z : 0, contentX: (page ? (page.left - wr.left) / z : 0) + (content?.offsetLeft ?? 0) }
      if (![next.x, next.y, next.w, next.h, next.pageX, next.pageY, next.contentX].every(Number.isFinite)) return
      setBox((b) => (b && Math.abs(b.x - next.x) < 0.2 && Math.abs(b.y - next.y) < 0.2 && Math.abs(b.w - next.w) < 0.2 && Math.abs(b.h - next.h) < 0.2 && b.pageX === next.pageX && b.pageY === next.pageY ? b : next))
    }
    measure()
    const id = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(id)
  })

  if (!fig || !box || !figId) return <div ref={ref} className="absolute left-0 top-0" />
  const a = fig.attrs
  const isPage = a.wrap === 'page'
  const meta = imageMeta(a.imageId)
  const maxW = a.wrap === 'behind' ? figureContext.trimWIn : figureContext.contentWidthIn
  const set = (patch: Partial<FigureAttrs>): void => { controller.editor?.commands.updateFigure(patch) }

  const onDown = (kind: 'resize' | 'rotate' | 'move', corner?: Corner) => (e: React.PointerEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { kind, corner, sx: e.clientX, sy: e.clientY, a: { ...a }, w: box.w, h: box.h, cxp: box.x + box.w / 2, cyp: box.y + box.h / 2 }
  }
  const onMove = (e: React.PointerEvent): void => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / zoom
    const dy = (e.clientY - d.sy) / zoom
    if (d.kind === 'rotate') {
      const world = ref.current?.parentElement?.getBoundingClientRect()
      if (!world) return
      let deg = (Math.atan2(e.clientY - (world.top + d.cyp * zoom), e.clientX - (world.left + d.cxp * zoom)) * 180) / Math.PI + 90
      if (deg > 180) deg -= 360
      if (e.shiftKey) deg = Math.round(deg / 15) * 15
      else for (const s of [0, 90, -90, 180, -180, 45, -45]) if (Math.abs(deg - s) < 3) deg = s
      set({ rotation: Math.round(deg) })
      return
    }
    if (d.kind === 'move') {
      // behind-text images: free placement, in inches from the text block's corner
      let x = d.a.x * 96 + dx
      let y = d.a.y * 96 + dy
      const s: Snap = {}
      const targetsX: [number, number][] = [[0, 0], [(geo.contentW - d.w) / 2, geo.contentW / 2], [geo.contentW - d.w, geo.contentW]]
      const targetsY: [number, number][] = [[0, 0], [(geo.contentH - d.h) / 2, geo.contentH / 2], [geo.contentH - d.h, geo.contentH]]
      for (const [pos, line] of targetsX) if (Math.abs(x - pos) < SNAP) { x = pos; s.x = line }
      for (const [pos, line] of targetsY) if (Math.abs(y - pos) < SNAP) { y = pos; s.y = line }
      setSnap(s)
      set({ x: round(x / 96, 3), y: round(y / 96, 3) })
      return
    }
    const east = d.corner === 'ne' || d.corner === 'se'
    const south = d.corner === 'sw' || d.corner === 'se'
    const growX = (east ? dx : -dx) * (d.a.wrap === 'inline' || d.a.wrap === 'break' ? (d.a.align === 'center' ? 2 : 1) : 1)
    let w = clamp(d.w + growX, 24, maxW * 96)
    const s: Snap = {}
    if (a.wrap !== 'behind') {
      for (const t of [geo.contentW, geo.contentW / 2, geo.contentW / 3]) if (Math.abs(w - t) < SNAP) { w = t; if (t === geo.contentW) s.x = east ? geo.contentW : 0 }
    }
    setSnap(s)
    if (e.shiftKey && meta) {
      // free aspect: the frame changes shape and the picture is cropped to fit (never stretched)
      const h = clamp(d.h + (south ? dy : -dy), 24, 2000)
      const target = w / h
      const full = meta.width / meta.height
      let cw = d.a.cw
      let ch = d.a.ch
      if (target > (full * cw) / ch) ch = clamp((full * cw) / target, 0.05, 1 - d.a.cy)
      else cw = clamp((target * ch) / full, 0.05, 1 - d.a.cx)
      set({ widthIn: round(w / 96, 3), cw: round(cw, 4), ch: round(ch, 4) })
    } else set({ widthIn: round(w / 96, 3) })
  }
  const onUp = (): void => { drag.current = null; setSnap({}); force((n) => n + 1) }

  const aspect = figureAspect(a)
  const placed = a.wrap === 'full' ? figureContext.contentWidthIn : Math.min(a.widthIn, maxW)
  const dpi = figureDpi(a, placed)
  const corners: { c: Corner; style: React.CSSProperties }[] = [
    { c: 'nw', style: { left: -6, top: -6, cursor: 'nwse-resize' } }, { c: 'ne', style: { right: -6, top: -6, cursor: 'nesw-resize' } },
    { c: 'sw', style: { left: -6, bottom: -6, cursor: 'nesw-resize' } }, { c: 'se', style: { right: -6, bottom: -6, cursor: 'nwse-resize' } },
  ]
  const contentLeft = box.contentX
  const contentTop = box.pageY + geo.top
  return (
    <div ref={ref} className="absolute left-0 top-0" style={{ zIndex: 6 }}>
      <div className="gb-handles" data-testid="figure-overlay" style={{ left: box.x, top: box.y, width: box.w, height: box.h, transform: a.rotation && !isPage ? `rotate(${a.rotation}deg)` : undefined }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {a.wrap === 'behind' && <div className="gb-handle-move" data-testid="figure-move" onPointerDown={onDown('move')} />}
        {!isPage && a.wrap !== 'full' && corners.map(({ c, style }) => <div key={c} className="gb-handle" data-testid={`handle-${c}`} style={style} onPointerDown={onDown('resize', c)} />)}
        {!isPage && <div className="gb-handle-rot" data-testid="handle-rotate" title="Rotate (Shift = 15° steps)" onPointerDown={onDown('rotate')} />}
        <div className="gb-size-tag" style={{ transform: `translateX(-50%) scale(${1 / zoom})`, transformOrigin: 'top center' }}>
          {isPage ? (a.spread ? 'Two-page spread' : 'Full-bleed page') : `${round(placed, 2)} × ${round(placed / aspect, 2)} in`}{dpi && dpi.level !== 'vector' && !isPage ? ` · ${dpi.dpi} DPI` : ''}
        </div>
      </div>
      {snap.x !== undefined && <div className="gb-snapline" style={{ left: contentLeft + snap.x, top: box.pageY, width: 1, height: geo.trimH }} />}
      {snap.y !== undefined && <div className="gb-snapline" style={{ left: box.pageX, top: contentTop + snap.y, width: geo.trimW, height: 1 }} />}
    </div>
  )
}
