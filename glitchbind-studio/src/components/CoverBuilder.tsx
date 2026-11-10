import { useEffect, useMemo, useRef, useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Barcode, Download, ImagePlus, RotateCcw, Trash2, Type } from 'lucide-react'
import type { CoverItem, Project } from '@/types'
import { useProject } from '@/store/project'
import { useLayout } from '@/store/layout'
import { BARCODE_H, BARCODE_W, SAFE, boundText, coverGeo, defaultCoverItems, panelAt, reflowCover } from '@/lib/cover'
import { SPINE_TEXT_MIN_PAGES, spineWidth, type CoverGeometry } from '@/lib/kdp'
import { fontStack } from '@/lib/fonts'
import { imageUrl, isImageFile } from '@/lib/images'
import { addImagesToLibrary } from '@/lib/actions'
import { printBook } from '@/lib/export/print'
import { clamp, round, uid } from '@/lib/units'
import { ColorField, EmptyState, Field, IconBtn, NumField, Panel, Seg, Select, Toggle } from './ui'
import { FontPicker } from './FontPicker'

const PX = 96

function ItemView({ item, project }: { item: CoverItem; project: Project }) {
  if (item.type === 'barcode') {
    const isbn = project.meta.isbn13 || project.meta.isbn10
    return (
      <div style={{ width: '100%', height: '100%', background: '#fff', color: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.04em' }}>{isbn ? `ISBN ${isbn}` : 'ISBN — add it in Book Metadata'}</div>
        <div className="gb-cover-edit-only" style={{ fontSize: 7.5, color: '#667', marginTop: 5, textAlign: 'center', lineHeight: 1.35, padding: '0 10px' }}>Barcode area (2 × 1.2 in). The printer places the barcode here — keep it clear.</div>
      </div>
    )
  }
  if (item.type === 'image') {
    const url = imageUrl(item.imageId)
    return url
      ? <img src={url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: item.fit ?? 'cover', opacity: item.opacity ?? 1, display: 'block' }} />
      : <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(135deg,#23232f 0 10px,#1b1b26 10px 20px)' }} />
  }
  const text = boundText(item, project.meta)
  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden', fontFamily: fontStack(item.font ?? 'Inter'), fontSize: `${item.size ?? 14}pt`, fontWeight: item.weight ?? 400,
      fontStyle: item.italic ? 'italic' : 'normal', color: item.color ?? '#fff', textAlign: item.align ?? 'left', letterSpacing: `${item.letterSpacing ?? 0}em`,
      lineHeight: item.lineHeight ?? 1.2, textTransform: item.uppercase ? 'uppercase' : 'none', whiteSpace: 'pre-wrap', overflowWrap: 'break-word',
      ...(item.vertical ? { writingMode: 'vertical-rl' as const, display: 'flex', alignItems: 'center', justifyContent: item.align === 'right' ? 'flex-end' : item.align === 'center' ? 'center' : 'flex-start', lineHeight: 1 } : {}),
    }}>
      {text || (item.bind ? `[${item.bind}]` : 'Text')}
    </div>
  )
}

/**
 * The full-wrap cover at true size (96 px per inch): bleed + back + spine + front + bleed.
 * `mode="print"` renders exactly the artwork — no guides, no labels, no selection.
 */
export function CoverCanvas({ project, pageCount, mode, selected, onPointerDownItem }: {
  project: Project; pageCount: number; mode: 'edit' | 'print'; selected?: string | null; onPointerDownItem?: (e: React.PointerEvent, item: CoverItem) => void
}) {
  const g = coverGeo(project, pageCount)
  const c = project.cover
  return (
    <div className={`gb-cover ${mode === 'print' ? 'gb-cover-print gb-print' : ''}`} style={{ position: 'relative', width: `${g.width}in`, height: `${g.height}in`, overflow: 'hidden', background: c.background }} data-testid="cover-canvas"
      data-width-in={g.width} data-height-in={g.height}>
      {c.backColor && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${g.spineX}in`, background: c.backColor }} />}
      {c.spineColor && <div style={{ position: 'absolute', left: `${g.spineX}in`, top: 0, bottom: 0, width: `${g.spine}in`, background: c.spineColor }} />}
      {c.items.map((it) => (
        <div key={it.id} data-cover-item={it.id} data-type={it.type} onPointerDown={onPointerDownItem ? (e) => onPointerDownItem(e, it) : undefined}
          style={{ position: 'absolute', left: `${it.x}in`, top: `${it.y}in`, width: `${it.w}in`, height: `${it.h}in`, transform: it.rotation ? `rotate(${it.rotation}deg)` : undefined, cursor: mode === 'edit' ? 'move' : undefined, outline: mode === 'edit' && selected === it.id ? '1.5px solid #00E5FF' : undefined, outlineOffset: 1 }}>
          <ItemView item={it} project={project} />
        </div>
      ))}
      {mode === 'edit' && <CoverGuides g={g} />}
    </div>
  )
}

function CoverGuides({ g }: { g: CoverGeometry }) {
  const line = (left: number, color: string, dashed = true): JSX.Element => <div key={`${left}${color}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}in`, borderLeft: `1px ${dashed ? 'dashed' : 'solid'} ${color}`, pointerEvents: 'none' }} />
  const safe = (x: number, w: number): JSX.Element => <div key={`s${x}`} style={{ position: 'absolute', left: `${x + SAFE}in`, top: `${g.bleed + SAFE}in`, width: `${Math.max(0, w - SAFE * 2)}in`, height: `${g.trimH - SAFE * 2}in`, outline: '1px dashed rgba(124,77,255,.7)', pointerEvents: 'none' }} />
  return (
    <>
      <div style={{ position: 'absolute', inset: `${g.bleed}in`, outline: '1px solid rgba(255,60,80,.9)', pointerEvents: 'none' }} />
      {line(g.spineX, 'rgba(0,229,255,.9)')}
      {line(g.frontX, 'rgba(0,229,255,.9)')}
      {safe(g.backX, g.trimW)}
      {safe(g.frontX, g.trimW)}
    </>
  )
}

export function CoverBuilder() {
  const project = useProject((s) => s.project)
  const pageCount = useLayout((s) => s.pages.length)
  const [selected, setSelected] = useState<string | null>(null)
  const [size, setSize] = useState({ w: 900, h: 600 })
  const [snap, setSnap] = useState<{ x?: number; y?: number }>({})
  const area = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const drag = useRef<{ id: string; mode: 'move' | 'resize'; sx: number; sy: number; item: CoverItem; started: boolean } | null>(null)
  const g = useMemo(() => (project ? coverGeo(project, pageCount) : null), [project, pageCount])

  const mutateCover = (fn: (items: CoverItem[]) => CoverItem[], undoable = true): void =>
    useProject.getState().mutate((p) => ({ ...p, cover: { ...p.cover, items: fn(p.cover.items) } }), { label: 'cover edit', undoable })
  const patch = (id: string, p: Partial<CoverItem>, undoable = true): void => mutateCover((items) => items.map((it) => (it.id === id ? { ...it, ...p } : it)), undoable)

  // first visit: lay out a starting cover; later: keep items attached when spine/trim change
  useEffect(() => {
    if (!project || !g || pageCount === 0) return
    const c = project.cover
    if (!c.laidOutFor && c.items.length === 0) {
      useProject.getState().mutate((p) => ({ ...p, cover: { ...p.cover, items: defaultCoverItems(p, g, pageCount), laidOutFor: { trimW: g.trimW, trimH: g.trimH, spine: g.spine } } }), { undoable: false })
    } else {
      const next = reflowCover(c, g)
      if (next !== c) useProject.getState().mutate((p) => ({ ...p, cover: reflowCover(p.cover, g) }), { undoable: false })
    }
  }, [project, g, pageCount])

  useEffect(() => {
    const el = area.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!selected || (e.target as HTMLElement).closest('input, textarea, select')) return
      const step = e.shiftKey ? 0.125 : 0.02
      const it = useProject.getState().project?.cover.items.find((i) => i.id === selected)
      if (!it) return
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); mutateCover((items) => items.filter((i) => i.id !== selected)); setSelected(null) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); patch(selected, { x: round(it.x - step, 4) }) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); patch(selected, { x: round(it.x + step, 4) }) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); patch(selected, { y: round(it.y - step, 4) }) }
      else if (e.key === 'ArrowDown') { e.preventDefault(); patch(selected, { y: round(it.y + step, 4) }) }
      else if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  if (!project || !g) return null
  const scale = clamp(Math.min((size.w - 96) / (g.width * PX), (size.h - 120) / (g.height * PX)), 0.2, 1.5)
  const item = project.cover.items.find((i) => i.id === selected) ?? null
  const hardcover = project.settings.preset === 'kdp-hardcover'

  const startDrag = (mode: 'move' | 'resize') => (e: React.PointerEvent, it: CoverItem): void => {
    e.stopPropagation()
    e.preventDefault()
    setSelected(it.id)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { id: it.id, mode, sx: e.clientX, sy: e.clientY, item: it, started: false }
  }
  const onMove = (e: React.PointerEvent): void => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / (PX * scale)
    const dy = (e.clientY - d.sy) / (PX * scale)
    if (!d.started && Math.abs(dx) + Math.abs(dy) < 0.01) return
    const undoable = !d.started
    d.started = true
    if (d.mode === 'resize') { patch(d.id, { w: round(Math.max(0.2, d.item.w + dx), 3), h: round(Math.max(0.15, d.item.h + dy), 3) }, undoable); return }
    let x = d.item.x + dx
    let y = d.item.y + dy
    const s: { x?: number; y?: number } = {}
    const panel = panelAt(x + d.item.w / 2, g)
    const px = panel === 'front' ? g.frontX : panel === 'spine' ? g.spineX : g.backX
    const pw = panel === 'spine' ? g.spine : g.trimW
    const tol = 0.06 / scale
    for (const [pos, guide] of [[px + (pw - d.item.w) / 2, px + pw / 2], [px + SAFE, px + SAFE], [px + pw - SAFE - d.item.w, px + pw - SAFE]] as [number, number][]) if (Math.abs(x - pos) < tol) { x = pos; s.x = guide }
    for (const [pos, guide] of [[g.bleed + (g.trimH - d.item.h) / 2, g.bleed + g.trimH / 2], [g.bleed + SAFE, g.bleed + SAFE], [g.bleed + g.trimH - SAFE - d.item.h, g.bleed + g.trimH - SAFE]] as [number, number][]) if (Math.abs(y - pos) < tol) { y = pos; s.y = guide }
    setSnap(s)
    patch(d.id, { x: round(x, 4), y: round(y, 4), panel: d.item.type === 'barcode' ? 'back' : panel }, undoable)
  }
  const endDrag = (): void => { drag.current = null; setSnap({}) }

  const addText = (): void => {
    const it: CoverItem = { id: uid('c_'), type: 'text', panel: 'front', text: 'New text', bind: null, x: g.frontX + 0.75, y: g.bleed + g.trimH * 0.62, w: g.trimW - 1.5, h: 0.6, rotation: 0, font: project.settings.typography.headingFont, size: 16, color: '#F2F2F7', align: 'center' }
    mutateCover((items) => [...items, it])
    setSelected(it.id)
  }
  const addImage = (imageId: string, at?: { x: number; y: number }): void => {
    const panel = at ? panelAt(at.x, g) : 'front'
    const px = panel === 'front' ? g.frontX : panel === 'back' ? g.backX : g.spineX
    const full = panel !== 'spine'
    const it: CoverItem = full
      ? { id: uid('c_'), type: 'image', panel, imageId, fit: 'cover', x: panel === 'front' ? px : 0, y: 0, w: g.trimW + g.bleed, h: g.height, rotation: 0, opacity: 1 }
      : { id: uid('c_'), type: 'image', panel, imageId, fit: 'cover', x: px, y: 0, w: g.spine, h: g.height, rotation: 0, opacity: 1 }
    // pictures go underneath the text
    mutateCover((items) => [it, ...items])
    setSelected(it.id)
  }
  const onFiles = async (files: File[], at?: { x: number; y: number }): Promise<void> => {
    const ids = await addImagesToLibrary(files.filter(isImageFile))
    ids.forEach((id) => addImage(id, at))
  }
  const reorder = (dir: 1 | -1): void => {
    if (!item) return
    mutateCover((items) => {
      const i = items.findIndex((x) => x.id === item.id)
      const j = clamp(i + dir, 0, items.length - 1)
      if (i === j) return items
      const next = [...items]
      next.splice(i, 1)
      next.splice(j, 0, item)
      return next
    })
  }
  const resetCover = (): void => {
    useProject.getState().mutate((p) => ({ ...p, cover: { ...p.cover, items: defaultCoverItems(p, g, pageCount), laidOutFor: { trimW: g.trimW, trimH: g.trimH, spine: g.spine } } }), { label: 'reset cover layout' })
    setSelected(null)
  }

  return (
    <div className="absolute inset-0 flex bg-ink-900" data-testid="cover-builder">
      <div ref={area} className="flex-1 min-w-0 relative overflow-hidden" onPointerDown={() => setSelected(null)}
        onDragOver={(e) => { if (Array.from(e.dataTransfer.types).some((t) => t === 'Files' || t === 'application/x-glitchbind-image')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
        onDrop={(e) => {
          e.preventDefault()
          const r = (e.currentTarget.querySelector('[data-testid=cover-canvas]') as HTMLElement).getBoundingClientRect()
          const at = { x: (e.clientX - r.left) / (PX * scale), y: (e.clientY - r.top) / (PX * scale) }
          const lib = e.dataTransfer.getData('application/x-glitchbind-image')
          if (lib) addImage(lib, at)
          else void onFiles(Array.from(e.dataTransfer.files), at)
        }}>
        <div className="absolute left-0 right-0 top-0 h-11 flex items-center gap-1 px-4 z-10">
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif" className="hidden" data-testid="cover-file-input" onChange={(e) => { void onFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          <button type="button" className="gb-btn-ghost" onPointerDown={(e) => e.stopPropagation()} onClick={addText}><Type size={14} /> Text</button>
          <button type="button" className="gb-btn-ghost" onPointerDown={(e) => e.stopPropagation()} onClick={() => fileRef.current?.click()}><ImagePlus size={14} /> Image</button>
          {!project.cover.items.some((i) => i.type === 'barcode') && (
            <button type="button" className="gb-btn-ghost" onPointerDown={(e) => e.stopPropagation()} onClick={() => mutateCover((items) => [...items, { id: uid('c_'), type: 'barcode', panel: 'back', x: round(g.spineX - 0.25 - BARCODE_W, 4), y: round(g.bleed + g.trimH - 0.25 - BARCODE_H, 4), w: BARCODE_W, h: BARCODE_H, rotation: 0 }])}><Barcode size={14} /> Barcode box</button>
          )}
          <button type="button" className="gb-btn-ghost" onPointerDown={(e) => e.stopPropagation()} onClick={resetCover}><RotateCcw size={13} /> Reset layout</button>
          <span className="flex-1" />
          <span className="text-[11px] text-fog-400 tabular-nums" data-testid="cover-dims">Full wrap {g.width.toFixed(3)} × {g.height.toFixed(3)} in · spine {g.spine.toFixed(3)} in</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pt-8">
          <div style={{ width: g.width * PX * scale, height: g.height * PX * scale }} className="relative">
            <div className="absolute -top-6 left-0 right-0 flex text-[9.5px] uppercase tracking-[0.2em] text-fog-400 pointer-events-none">
              <span style={{ width: g.spineX * PX * scale }} className="text-center">Back</span>
              <span style={{ width: Math.max(g.spine * PX * scale, 1) }} className="text-center overflow-visible whitespace-nowrap">{g.spine * PX * scale > 34 ? 'Spine' : ''}</span>
              <span className="flex-1 text-center">Front</span>
            </div>
            <div className="absolute left-0 top-0 origin-top-left shadow-page" style={{ transform: `scale(${scale})` }} onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
              <CoverCanvas project={project} pageCount={pageCount} mode="edit" selected={selected} onPointerDownItem={startDrag('move')} />
              {item && (
                <div className="gb-handle" data-testid="cover-resize" style={{ left: `calc(${item.x + item.w}in - 6px)`, top: `calc(${item.y + item.h}in - 6px)`, cursor: 'nwse-resize', transform: `scale(${1 / scale})` }} onPointerDown={(e) => startDrag('resize')(e, item)} />
              )}
              {snap.x !== undefined && <div className="gb-snapline" style={{ left: `${snap.x}in`, top: 0, width: 1 / scale, height: `${g.height}in` }} />}
              {snap.y !== undefined && <div className="gb-snapline" style={{ top: `${snap.y}in`, left: 0, height: 1 / scale, width: `${g.width}in` }} />}
            </div>
          </div>
        </div>
      </div>

      <aside className="w-[304px] shrink-0 bg-ink-800 border-l border-ink-600/80 overflow-y-auto" aria-label="Cover inspector" onPointerDown={(e) => e.stopPropagation()}>
        <Panel title="Cover size">
          <div className="grid grid-cols-2 gap-y-3 text-[12px]">
            {[['Full wrap', `${g.width.toFixed(3)} × ${g.height.toFixed(3)} in`], ['Spine', `${g.spine.toFixed(3)} in`], ['Pages', String(pageCount)], ['Paper', project.settings.paper === 'cream' ? 'Cream' : 'White'], ['Trim', `${g.trimW} × ${g.trimH} in`], ['Bleed', `${g.bleed} in each edge`]].map(([k, v]) => (
              <div key={k}><div className="text-fog-100 tabular-nums">{v}</div><div className="text-[10px] uppercase tracking-wider text-fog-400 mt-0.5">{k}</div></div>
            ))}
          </div>
          <p className="text-[11px] text-fog-400 leading-snug">Computed from trim, page count and paper with the same spine calculator Export uses. White paper would give {spineWidth(pageCount, 'white').toFixed(3)} in, cream {spineWidth(pageCount, 'cream').toFixed(3)} in. The cover re-fits itself when the page count changes.</p>
          {pageCount < SPINE_TEXT_MIN_PAGES && <p className="text-[11px] text-amber leading-snug">Under {SPINE_TEXT_MIN_PAGES} pages the spine is too narrow for KDP to print text on it, so no spine text was added.</p>}
          {hardcover && <p className="text-[11px] text-amber leading-snug">Hardcover case wraps need extra wrap and hinge allowance that differs by printer. This builder produces the paperback full-wrap size; use your printer's hardcover template for final dimensions.</p>}
          <button type="button" className="gb-btn-solid w-full" data-testid="export-cover" onClick={() => void printBook('cover')}><Download size={14} /> Export Cover PDF</button>
        </Panel>
        <Panel title="Background">
          <Field label="Whole cover"><ColorField label="Cover background" value={project.cover.background} onChange={(c) => useProject.getState().mutate((p) => ({ ...p, cover: { ...p.cover, background: c } }), { label: 'cover colour' })} /></Field>
          <Toggle label="Different back colour" checked={!!project.cover.backColor} onChange={(v) => useProject.getState().mutate((p) => ({ ...p, cover: { ...p.cover, backColor: v ? p.cover.background : null } }), { label: 'cover colour' })} />
          {project.cover.backColor && <ColorField label="Back colour" value={project.cover.backColor} onChange={(c) => useProject.getState().mutate((p) => ({ ...p, cover: { ...p.cover, backColor: c } }), { label: 'cover colour' })} />}
          <Toggle label="Different spine colour" checked={!!project.cover.spineColor} onChange={(v) => useProject.getState().mutate((p) => ({ ...p, cover: { ...p.cover, spineColor: v ? '#000000' : null } }), { label: 'cover colour' })} />
          {project.cover.spineColor && <ColorField label="Spine colour" value={project.cover.spineColor} onChange={(c) => useProject.getState().mutate((p) => ({ ...p, cover: { ...p.cover, spineColor: c } }), { label: 'cover colour' })} />}
        </Panel>
        {!item && <EmptyState icon={Type} title="Select something on the cover">Drag to move, drag the corner square to resize, arrow keys to nudge. Drop an image on the front or back to fill that panel.</EmptyState>}
        {item && (
          <Panel title={item.type === 'text' ? 'Text' : item.type === 'image' ? 'Image' : 'Barcode box'} action={
            <span className="flex">
              <IconBtn icon={ArrowUp} label="Bring forward" side="left" className="h-7 w-7" onClick={() => reorder(1)} />
              <IconBtn icon={ArrowDown} label="Send backward" side="left" className="h-7 w-7" onClick={() => reorder(-1)} />
              <IconBtn icon={Trash2} label="Delete" side="left" className="h-7 w-7" onClick={() => { mutateCover((items) => items.filter((i) => i.id !== item.id)); setSelected(null) }} />
            </span>}>
            {item.type === 'text' && (
              <>
                <Field label="Content">
                  <Select label="Text source" className="w-full" value={item.bind ?? 'custom'} onChange={(v) => patch(item.id, { bind: v === 'custom' ? null : (v as CoverItem['bind']), text: v === 'custom' ? boundText(item, project.meta) : item.text })}
                    options={[{ value: 'title', label: 'Book title (from metadata)' }, { value: 'subtitle', label: 'Subtitle (from metadata)' }, { value: 'author', label: 'Author (from metadata)' }, { value: 'publisher', label: 'Publisher (from metadata)' }, { value: 'description', label: 'Description (from metadata)' }, { value: 'custom', label: 'Custom text' }]} />
                </Field>
                {!item.bind && <textarea className="gb-input h-24 py-2 leading-snug resize-none" aria-label="Cover text" value={item.text ?? ''} onChange={(e) => patch(item.id, { text: e.target.value })} />}
                <Field label="Font"><FontPicker label="Cover font" value={item.font ?? 'Inter'} onChange={(f) => f && patch(item.id, { font: f })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Size"><NumField width={128} value={item.size ?? 14} min={5} max={200} step={1} unit="pt" onChange={(n) => patch(item.id, { size: n })} /></Field>
                  <Field label="Weight"><NumField width={128} value={item.weight ?? 400} min={300} max={700} step={100} onChange={(n) => patch(item.id, { weight: n })} /></Field>
                  <Field label="Tracking"><NumField width={128} value={item.letterSpacing ?? 0} min={-0.05} max={0.6} step={0.01} unit="em" onChange={(n) => patch(item.id, { letterSpacing: n })} /></Field>
                  <Field label="Line height"><NumField width={128} value={item.lineHeight ?? 1.2} min={0.8} max={2.5} step={0.05} unit="×" onChange={(n) => patch(item.id, { lineHeight: n })} /></Field>
                </div>
                <Field label="Colour"><ColorField label="Text colour" value={item.color ?? '#FFFFFF'} onChange={(c) => patch(item.id, { color: c })} /></Field>
                <Field label="Alignment" row><Seg value={item.align ?? 'left'} onChange={(v) => patch(item.id, { align: v })} options={[{ value: 'left', label: <AlignLeft size={14} /> }, { value: 'center', label: <AlignCenter size={14} /> }, { value: 'right', label: <AlignRight size={14} /> }]} /></Field>
                <Toggle label="Italic" checked={!!item.italic} onChange={(v) => patch(item.id, { italic: v })} />
                <Toggle label="Uppercase" checked={!!item.uppercase} onChange={(v) => patch(item.id, { uppercase: v })} />
                <Toggle label="Vertical (spine text)" checked={!!item.vertical} onChange={(v) => patch(item.id, { vertical: v })} />
              </>
            )}
            {item.type === 'image' && (
              <>
                <Field label="Fit" row><Seg value={item.fit ?? 'cover'} onChange={(v) => patch(item.id, { fit: v })} options={[{ value: 'cover', label: 'Fill' }, { value: 'contain', label: 'Fit inside' }]} /></Field>
                <Field label="Opacity"><NumField width={128} value={Math.round((item.opacity ?? 1) * 100)} min={5} max={100} step={5} unit="%" onChange={(n) => patch(item.id, { opacity: n / 100 })} /></Field>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" className="gb-btn-outline px-1" onClick={() => patch(item.id, { panel: 'front', x: g.frontX, y: 0, w: g.trimW + g.bleed, h: g.height })}>Fill front</button>
                  <button type="button" className="gb-btn-outline px-1" onClick={() => patch(item.id, { panel: 'back', x: 0, y: 0, w: g.spineX, h: g.height })}>Fill back</button>
                  <button type="button" className="gb-btn-outline px-1" onClick={() => patch(item.id, { panel: 'back', x: 0, y: 0, w: g.width, h: g.height })}>Full wrap</button>
                </div>
              </>
            )}
            {item.type === 'barcode' && <p className="text-[11.5px] text-fog-300 leading-snug">A white 2 × 1.2 in area on the back cover. The ISBN shown inside comes from Book Metadata. KDP and IngramSpark print the scannable barcode in this space, so keep artwork out of it.</p>}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Field label="X"><NumField width={128} value={round(item.x, 3)} min={-2} max={30} step={0.05} unit="in" onChange={(n) => patch(item.id, { x: n })} /></Field>
              <Field label="Y"><NumField width={128} value={round(item.y, 3)} min={-2} max={20} step={0.05} unit="in" onChange={(n) => patch(item.id, { y: n })} /></Field>
              <Field label="Width"><NumField width={128} value={round(item.w, 3)} min={0.1} max={30} step={0.05} unit="in" onChange={(n) => patch(item.id, { w: n })} /></Field>
              <Field label="Height"><NumField width={128} value={round(item.h, 3)} min={0.1} max={20} step={0.05} unit="in" onChange={(n) => patch(item.id, { h: n })} /></Field>
            </div>
            {item.type !== 'barcode' && <Field label="Rotation"><NumField width={128} value={item.rotation} min={-180} max={180} step={1} unit="°" onChange={(n) => patch(item.id, { rotation: n })} /></Field>}
          </Panel>
        )}
        <Panel title="How this prints" defaultOpen={false}>
          <p className="text-[11.5px] text-fog-300 leading-relaxed">The red line is the trim edge: anything outside it is bleed and will be cut off. Keep text inside the violet safe boxes. The cyan lines are the spine folds. The cover exports as its own one-page PDF — upload it separately from the interior. Drop a picture on the front panel to fill it, then put the title on top.</p>
        </Panel>
      </aside>
    </div>
  )
}
