import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { TextSelection } from '@tiptap/pm/state'
import { useLayout } from '@/store/layout'
import { useUI, toast } from '@/store/ui'
import { useProject } from '@/store/project'
import { canvasMetrics, visibleRange } from '@/lib/canvasLayout'
import { controller, canvasBridge } from '@/lib/editor/controller'
import { editorCtx } from '@/lib/editor/extensions'
import { isImageFile } from '@/lib/images'
import { clamp } from '@/lib/units'
import { BookPage } from './BookPage'
import { FigureOverlay } from './FigureOverlay'

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 2

export function Canvas() {
  const pages = useLayout((s) => s.pages)
  const geo = useLayout((s) => s.geo)
  const ready = useLayout((s) => s.ready)
  const view = useUI((s) => s.view)
  const zoomPref = useUI((s) => s.zoom)
  const fit = useUI((s) => s.fit)
  const guides = useUI((s) => s.guides)
  const livePage = useUI((s) => s.livePage)
  const focusMode = useUI((s) => s.focusMode)
  const settings = useProject((s) => s.project?.settings)
  const scroller = useRef<HTMLDivElement>(null)
  const mover = useRef<HTMLDivElement>(null)
  const windowEl = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ w: 1200, h: 800 })
  const [range, setRange] = useState<[number, number]>([0, 3])

  const metrics = useMemo(() => canvasMetrics(pages.length, geo, view), [pages.length, geo, view])
  const fitZoom = useMemo(() => {
    const byW = (viewport.w - 24) / metrics.width
    const byH = (viewport.h - 8) / (geo.trimH + metrics.pad * 1.2)
    return clamp(view === 'continuous' ? Math.min(byW, 1.35) : Math.min(byW, byH), ZOOM_MIN, ZOOM_MAX)
  }, [viewport, metrics, geo.trimH, view])
  const zoom = fit ? fitZoom : zoomPref
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewport({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setViewport({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const updateRange = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const z = zoomRef.current
    const top = el.scrollTop / z
    const bottom = (el.scrollTop + el.clientHeight) / z
    const next = visibleRange(metrics, pages.length, top, bottom, 1)
    setRange((r) => (r[0] === next[0] && r[1] === next[1] ? r : next))
    const mid = (top + bottom) / 2
    const row = Math.max(0, Math.floor((mid - metrics.pad + 20) / metrics.rowPitch))
    const cur = Math.min(pages.length - 1, metrics.perRow === 1 ? row : row === 0 ? 0 : row * 2 - 1)
    if (useUI.getState().currentPage !== cur) useUI.setState({ currentPage: Math.max(0, cur) })
  }, [metrics, pages.length])
  useEffect(() => { updateRange() }, [updateRange, zoom, viewport])

  // mount the one live editor inside the roaming window
  useLayoutEffect(() => {
    controller.ensure()
    if (mover.current && controller.host) mover.current.appendChild(controller.host)
  }, [])

  // scrolling API for the controller / sidebar / preflight
  useEffect(() => {
    canvasBridge.revealPage = (index, flowY) => {
      const el = scroller.current
      const pos = metrics.positions[index]
      const data = useLayout.getState().pages[index]
      if (!el || !pos) return
      const z = zoomRef.current
      if (flowY === undefined || !data?.page) {
        el.scrollTo({ top: Math.max(0, (pos.y - 24) * z), behavior: 'auto' })
        return
      }
      const page = data.page
      let before = page.offsetY
      let y0 = 0
      for (const seg of page.segments) { if (seg.key === 'main') { y0 = seg.y0; break } before += seg.y1 - seg.y0 }
      const y = (pos.y + geo.top + before + (flowY - y0)) * z
      const margin = Math.min(110, el.clientHeight / 4)
      if (y < el.scrollTop + margin) el.scrollTo({ top: Math.max(0, y - margin) })
      else if (y > el.scrollTop + el.clientHeight - margin) el.scrollTo({ top: y - el.clientHeight + margin })
    }
    return () => { canvasBridge.revealPage = () => {} }
  }, [metrics, geo.top])

  // Ctrl/⌘ + wheel zoom
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const next = clamp(Math.round((zoomRef.current * (e.deltaY < 0 ? 1.08 : 0.925)) * 100) / 100, ZOOM_MIN, ZOOM_MAX)
      useUI.getState().setPref({ zoom: next, fit: false })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const pageAt = (target: EventTarget | null): number => {
    const el = (target as Element | null)?.closest?.('[data-page-index]')
    return el ? parseInt(el.getAttribute('data-page-index') ?? '-1', 10) : -1
  }

  /** Put the live window on a page of the active section and return the document position under the pointer. */
  const posAtPoint = (index: number, clientX: number, clientY: number): number | null => {
    const view = controller.view
    if (!view) return null
    flushSync(() => useUI.setState({ livePage: index }))
    const r = windowEl.current?.getBoundingClientRect()
    if (!r || r.height < 2) return null
    const x = clamp(clientX, r.left + 1, r.right - 1)
    const y = clamp(clientY, r.top + 1, r.bottom - 1)
    return view.posAtCoords({ left: x, top: y })?.pos ?? null
  }

  const onMouseMove = (e: React.MouseEvent): void => {
    const idx = pageAt(e.target)
    if (idx < 0 || idx === useUI.getState().livePage) return
    const data = pages[idx]
    if (data && data.sectionId === controller.activeId && data.page?.segments.some((s) => s.key === 'main')) {
      controller.lastInput = 'pointer'
      useUI.setState({ livePage: idx })
    }
  }

  const onMouseDown = (e: React.MouseEvent): void => {
    if (e.button !== 0) return
    const idx = pageAt(e.target)
    if (idx < 0) return
    const data = pages[idx]
    if (!data?.sectionId) return
    const target = e.target as Element
    const toc = target.closest('[data-toc]')
    if (toc) {
      const first = useLayout.getState().firstPage[toc.getAttribute('data-toc') ?? '']
      if (first !== undefined) { e.preventDefault(); canvasBridge.revealPage(first); return }
    }
    const node = target.closest('[data-fig-id]') ?? target.closest('[data-note-id]')
    if (node && data.editable) {
      e.preventDefault()
      controller.activate(data.sectionId)
      const id = node.getAttribute('data-fig-id') ?? node.getAttribute('data-note-id') ?? ''
      if (controller.selectNodeById(id)) { useUI.setState({ livePage: idx }); controller.focus() }
      return
    }
    if (!data.editable) { controller.activate(data.sectionId); return }
    e.preventDefault()
    controller.activate(data.sectionId)
    const view = controller.view
    if (!view) return
    if (!data.page?.segments.some((s) => s.key === 'main')) { view.focus(); return }
    const pos = posAtPoint(idx, e.clientX, e.clientY)
    if (pos !== null) {
      const $pos = view.state.doc.resolve(pos)
      const sel = e.shiftKey ? TextSelection.between(view.state.selection.$anchor, $pos) : TextSelection.near($pos)
      view.dispatch(view.state.tr.setSelection(sel))
    }
    view.focus()
  }

  const onDragOver = (e: React.DragEvent): void => {
    const types = Array.from(e.dataTransfer.types)
    if (!types.includes('Files') && !types.includes('application/x-glitchbind-image')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    onMouseMove(e as unknown as React.MouseEvent)
  }
  const onDrop = (e: React.DragEvent): void => {
    if ((e.target as Element).closest('.gb-live')) return // the editor handles its own drops
    const lib = e.dataTransfer.getData('application/x-glitchbind-image')
    const files = Array.from(e.dataTransfer.files).filter(isImageFile)
    if (!lib && !files.length) return
    e.preventDefault()
    const idx = pageAt(e.target)
    const data = pages[idx]
    if (!data?.sectionId || !data.editable) { toast('Drop images onto a page of a chapter or other editable section.', 'warn'); return }
    controller.activate(data.sectionId)
    const pos = data.page?.segments.some((s) => s.key === 'main') ? posAtPoint(idx, e.clientX, e.clientY) : null
    if (lib) editorCtx.onLibraryImage?.(lib, pos)
    else editorCtx.onFiles?.(files, pos)
  }

  // live window geometry
  const live = pages[livePage]
  const liveSeg = live?.page && live.sectionId === controller.activeId ? live.page.segments.find((s) => s.key === 'main') : undefined
  let liveStyle: React.CSSProperties = { left: 0, top: 0, width: geo.contentW, height: 0 }
  if (live && liveSeg && live.page && metrics.positions[livePage]) {
    const mirrored = settings?.preset !== 'screen'
    const mLeft = mirrored ? (live.side === 'left' ? geo.outside : geo.inside) : (geo.inside + geo.outside) / 2
    let before = live.page.offsetY
    for (const seg of live.page.segments) { if (seg === liveSeg) break; before += seg.y1 - seg.y0 }
    liveStyle = { left: metrics.positions[livePage].x + mLeft, top: metrics.positions[livePage].y + geo.top + before, width: geo.contentW, height: liveSeg.y1 - liveSeg.y0 }
  }

  const paper = settings?.colors.page ?? '#fff'
  const folio = settings?.headers.folio ?? 'bottom-center'
  const mirrored = settings?.preset !== 'screen'
  const visible = []
  for (let i = range[0]; i <= range[1] && i < pages.length; i++) visible.push(i)

  return (
    <div ref={scroller} className="absolute inset-0 overflow-auto bg-ink-900" data-testid="canvas" onScroll={updateRange}
      style={{ scrollSnapType: view === 'single' ? 'y proximity' : undefined, backgroundImage: 'radial-gradient(circle at 50% 0%, #15151f 0%, #0B0B10 60%)' }}>
      <div className="relative mx-auto" style={{ width: metrics.width * zoom, height: metrics.height * zoom }}>
        <div className={`gb-book gb-screen absolute left-0 top-0 origin-top-left ${focusMode ? 'gb-focus' : ''}`} lang="en"
          style={{ width: metrics.width, height: metrics.height, transform: `scale(${zoom})` }}
          onMouseMove={onMouseMove} onMouseDown={onMouseDown} onDragOver={onDragOver} onDrop={onDrop}>
          {ready && visible.map((i) => (
            <BookPage key={i} data={pages[i]} geo={geo} mode="screen" paper={paper} folio={folio} mirrored={mirrored} guides={guides} live={i === livePage && !!liveSeg}
              style={{ left: metrics.positions[i].x, top: metrics.positions[i].y, scrollSnapAlign: view === 'single' ? 'center' : undefined }} />
          ))}
          <div ref={windowEl} className="gb-live-window" style={liveStyle}>
            <div ref={mover} className="gb-live-mover" style={{ top: liveSeg ? -liveSeg.y0 : 0 }} />
          </div>
          <FigureOverlay zoom={zoom} />
        </div>
      </div>
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 gb-fade-in">
          <div className="gb-loader" />
          <div className="gb-label">Setting type</div>
        </div>
      )}
    </div>
  )
}
