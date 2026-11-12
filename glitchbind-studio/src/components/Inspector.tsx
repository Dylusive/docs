import { useRef, useState } from 'react'
import { NodeSelection } from '@tiptap/pm/state'
import {
  AlignCenter, AlignLeft, AlignRight, BookMarked, Columns3, Eraser, FileImage, Layers, LayoutTemplate, Palette, Rows3, Save, SlidersHorizontal, Table as TableIcon,
  Trash2, Type, Upload,
} from 'lucide-react'
import { useUI, toast } from '@/store/ui'
import { useProject, mutateSection } from '@/store/project'
import { useLayout } from '@/store/layout'
import { controller } from '@/lib/editor/controller'
import { WRAP_LABELS, figureAspect, figureContext, figureDpi, type FigureAttrs, type WrapMode } from '@/lib/editor/figure'
import { imageMeta } from '@/lib/images'
import { coverDpi, dpiLevel } from '@/lib/dpi'
import { replaceSelectedImage } from '@/lib/actions'
import { SECTION_LABELS, isGenerated } from '@/lib/defaults'
import { countDocWords, countWords, formatReadingTime } from '@/lib/wordcount'
import { fontByFamily } from '@/lib/fonts'
import { uid, round } from '@/lib/units'
import type { CustomStyle } from '@/types'
import { ColorField, EmptyState, Field, IconBtn, NumField, Panel, Seg, Select, Slider, Toggle } from './ui'
import { FontPicker } from './FontPicker'
import { DesignPanel } from './DesignPanel'
import { LayoutPanel } from './LayoutPanel'
import { applyStyle, currentStyle } from './FormatBar'

// ------------------------------------------------------------------ text
function TextInspector() {
  const ed = controller.editor
  const project = useProject((s) => s.project)
  const [styleName, setStyleName] = useState('')
  if (!ed || !controller.activeId || !project) return null
  const ts = ed.getAttributes('textStyle') as { fontFamily?: string; fontSize?: number; letterSpacing?: number; fontWeight?: number; color?: string }
  const block = ed.state.selection.$from.parent.attrs as { lineHeight?: number | null; spaceBefore?: number | null; spaceAfter?: number | null; indent?: number | null; textAlign?: string | null }
  const t = project.settings.typography
  const family = ts.fontFamily ?? null
  const weights = fontByFamily(family ?? t.bodyFont)?.weights ?? [400, 700]
  const inTable = ed.isActive('table')
  const sel = ed.state.selection
  const selWords = sel.empty ? 0 : countWords(ed.state.doc.textBetween(sel.from, sel.to, ' '))
  const chapterWords = countWords(ed.state.doc.textBetween(0, ed.state.doc.content.size, ' '))
  const inline = (name: string, value: unknown): void => { ed.chain().focus().setInlineStyle(name, value).run() }
  const blockAttr = (name: string, value: unknown): void => { ed.chain().focus().setBlockAttr(name, value).run() }
  const style = currentStyle()
  const custom = project.customStyles.find((c) => c.id === style)

  const saveStyle = (): void => {
    const name = styleName.trim()
    if (!name) return
    const cs: CustomStyle = {
      id: uid('cs_'), name, fontFamily: ts.fontFamily, fontSize: ts.fontSize ? round(ts.fontSize / t.bodySize, 3) : undefined, fontWeight: ts.fontWeight,
      italic: ed.isActive('italic') || undefined, align: (block.textAlign as CustomStyle['align']) ?? undefined, color: ts.color, letterSpacing: ts.letterSpacing,
      lineHeight: block.lineHeight ?? undefined, indent: block.indent === 0 ? false : undefined, spaceBefore: block.spaceBefore ?? undefined, spaceAfter: block.spaceAfter ?? undefined,
    }
    useProject.getState().mutate((p) => ({ ...p, customStyles: [...p.customStyles, cs] }), { label: `save style “${name}”` })
    requestAnimationFrame(() => applyStyle(cs.id))
    setStyleName('')
    toast(`Saved “${name}”. It is now in the paragraph style menu.`, 'ok')
  }

  return (
    <>
      <Panel title="Character">
        <Field label="Font"><FontPicker label="Font for selection" value={family} allowDefault={`Book default (${t.bodyFont})`} onChange={(f) => inline('fontFamily', f)} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Size"><NumField width={84} value={ts.fontSize ?? t.bodySize} min={5} max={96} step={0.5} unit="pt" onChange={(n) => inline('fontSize', n === t.bodySize ? null : n)} /></Field>
          <Field label="Weight">
            <Select label="Font weight" className="w-full" value={String(ts.fontWeight ?? 'auto')} onChange={(v) => inline('fontWeight', v === 'auto' ? null : parseInt(v, 10))}
              options={[{ value: 'auto', label: 'Auto' }, ...weights.map((w) => ({ value: String(w), label: String(w) }))]} />
          </Field>
          <Field label="Tracking"><NumField width={84} value={ts.letterSpacing ?? 0} min={-0.1} max={0.5} step={0.01} unit="em" onChange={(n) => inline('letterSpacing', n === 0 ? null : n)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Text colour"><ColorField label="Text colour" value={ts.color ?? project.settings.colors.text} onChange={(c) => ed.chain().focus().setColor(c).run()} /></Field>
          <Field label="Highlight"><ColorField label="Highlight colour" value={(ed.getAttributes('highlight').color as string) ?? project.settings.colors.highlight} onChange={(c) => ed.chain().focus().setHighlight({ color: c }).run()} /></Field>
        </div>
        <button type="button" className="gb-btn-ghost w-full" onMouseDown={(e) => e.preventDefault()} onClick={() => ed.chain().focus().unsetAllMarks().run()}><Eraser size={13} /> Clear character formatting</button>
      </Panel>

      <Panel title="Paragraph">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Line spacing"><NumField width={128} value={block.lineHeight ?? t.lineHeight} min={0.9} max={3} step={0.05} unit="×" onChange={(n) => blockAttr('lineHeight', n === t.lineHeight ? null : n)} /></Field>
          <Field label="First-line indent"><NumField width={128} value={block.indent ?? t.indent} min={0} max={5} step={0.1} unit="em" onChange={(n) => blockAttr('indent', n === t.indent ? null : n)} /></Field>
          <Field label="Space before"><NumField width={128} value={block.spaceBefore ?? 0} min={0} max={6} step={0.1} unit="em" onChange={(n) => blockAttr('spaceBefore', n === 0 ? null : n)} /></Field>
          <Field label="Space after"><NumField width={128} value={block.spaceAfter ?? t.paraSpacing} min={0} max={6} step={0.1} unit="em" onChange={(n) => blockAttr('spaceAfter', n === t.paraSpacing ? null : n)} /></Field>
        </div>
        <p className="text-[11px] text-fog-400 leading-snug">These override the book-wide settings in <button type="button" className="text-cyan hover:underline" onClick={() => useUI.setState({ rightTab: 'design' })}>Design</button> for the selected paragraphs only.</p>
      </Panel>

      {inTable && (
        <Panel title="Table">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="gb-btn-outline" onClick={() => ed.chain().focus().addRowAfter().run()}><Rows3 size={13} /> Add row</button>
            <button type="button" className="gb-btn-outline" onClick={() => ed.chain().focus().addColumnAfter().run()}><Columns3 size={13} /> Add column</button>
            <button type="button" className="gb-btn-ghost" onClick={() => ed.chain().focus().deleteRow().run()}>Remove row</button>
            <button type="button" className="gb-btn-ghost" onClick={() => ed.chain().focus().deleteColumn().run()}>Remove column</button>
            <button type="button" className="gb-btn-ghost" onClick={() => ed.chain().focus().toggleHeaderRow().run()}><TableIcon size={13} /> Header row</button>
            <button type="button" className="gb-btn-danger" onClick={() => ed.chain().focus().deleteTable().run()}><Trash2 size={13} /> Delete table</button>
          </div>
        </Panel>
      )}

      <Panel title="My styles" defaultOpen={project.customStyles.length > 0}>
        <p className="text-[11px] text-fog-400 leading-snug">Format a paragraph the way you like, then save it as a reusable style.</p>
        <div className="flex gap-2">
          <input className="gb-input" placeholder="Style name" aria-label="New style name" value={styleName} onChange={(e) => setStyleName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveStyle() }} />
          <button type="button" className="gb-btn-outline shrink-0" disabled={!styleName.trim()} onClick={saveStyle}><Save size={13} /> Save</button>
        </div>
        {project.customStyles.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <button type="button" className={`flex-1 text-left gb-btn-ghost justify-start ${custom?.id === c.id ? 'text-cyan' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle(c.id)}>{c.name}</button>
            <IconBtn icon={Trash2} label="Delete style" side="left" className="h-7 w-7" onClick={() => useProject.getState().mutate((p) => ({ ...p, customStyles: p.customStyles.filter((x) => x.id !== c.id) }), { label: 'delete style' })} />
          </div>
        ))}
      </Panel>

      <Panel title="This section">
        <div className="grid grid-cols-3 gap-2 text-[12px]">
          {[['Words', chapterWords.toLocaleString()], ['Selected', selWords ? selWords.toLocaleString() : '—'], ['Reading', formatReadingTime(chapterWords)]].map(([k, v]) => (
            <div key={k}><div className="text-fog-100 font-medium tabular-nums">{v}</div><div className="text-[10px] uppercase tracking-wider text-fog-400 mt-0.5">{k}</div></div>
          ))}
        </div>
      </Panel>
    </>
  )
}

// ------------------------------------------------------------------ footnote
function FootnoteInspector() {
  const ed = controller.editor
  const sel = ed?.state.selection
  const mode = useProject((s) => s.project?.settings.footnotes)
  if (!ed || !(sel instanceof NodeSelection) || sel.node.type.name !== 'footnote') return null
  const set = (text: string): void => {
    const tr = ed.state.tr.setNodeMarkup(sel.from, undefined, { ...sel.node.attrs, text })
    ed.view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, sel.from)))
  }
  return (
    <Panel title="Footnote">
      <Field label="Note text" hint={`Numbered automatically per chapter. Notes are set at the ${mode === 'chapter' ? 'end of the chapter' : 'foot of the page'} — change this in Layout.`}>
        <textarea autoFocus className="gb-input h-32 py-2 leading-snug resize-none" aria-label="Footnote text" data-testid="footnote-text" value={sel.node.attrs.text as string} onChange={(e) => set(e.target.value)} />
      </Field>
      <button type="button" className="gb-btn-danger w-full" onClick={() => ed.chain().focus().deleteSelection().run()}><Trash2 size={13} /> Delete footnote</button>
    </Panel>
  )
}

// ------------------------------------------------------------------ image
const pct = (n: number): string => `${Math.round(n)}%`
function ImageInspector() {
  const ed = controller.editor
  const fileRef = useRef<HTMLInputElement>(null)
  const sel = ed?.state.selection
  const settings = useProject((s) => s.project?.settings)
  if (!ed || !settings || !(sel instanceof NodeSelection) || sel.node.type.name !== 'figure') return null
  const a = sel.node.attrs as FigureAttrs
  const meta = imageMeta(a.imageId)
  const set = (patch: Partial<FigureAttrs>): void => { ed.commands.updateFigure(patch) }
  const aspect = figureAspect(a)
  const isPage = a.wrap === 'page'
  const maxW = a.wrap === 'behind' ? settings.trim.w : figureContext.contentWidthIn
  const placedW = a.wrap === 'full' ? figureContext.contentWidthIn : Math.min(a.widthIn, maxW)
  let dpi = figureDpi(a, placedW)
  if (meta && isPage) {
    const d = coverDpi(meta.width, meta.height, (a.spread ? 2 : 1) * (settings.trim.w + (settings.bleed ? 0.125 : 0)), settings.trim.h + (settings.bleed ? 0.25 : 0))
    dpi = { dpi: d, level: dpiLevel(d, meta.type) }
  }
  const tone = dpi?.level === 'red' ? 'bg-danger/15 text-danger' : dpi?.level === 'amber' ? 'bg-amber/15 text-amber' : 'bg-ok/15 text-ok'
  const right = round((1 - a.cx - a.cw) * 100, 1)
  const bottom = round((1 - a.cy - a.ch) * 100, 1)
  const crop = (l: number, t: number, r: number, b: number): void => {
    const cx = Math.min(0.9, l / 100)
    const cy = Math.min(0.9, t / 100)
    set({ cx, cy, cw: Math.max(0.05, 1 - cx - r / 100), ch: Math.max(0.05, 1 - cy - b / 100) })
  }
  return (
    <>
      <Panel title="Image">
        {meta ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12.5px] text-fog-100 truncate">{meta.name}</div>
              <div className="text-[11px] text-fog-400">{meta.width} × {meta.height}px</div>
            </div>
            {dpi && <span className={`gb-chip ${dpi.level === 'vector' ? 'bg-ok/15 text-ok' : tone}`} data-testid="dpi-chip">{dpi.level === 'vector' ? 'Vector' : `${dpi.dpi} DPI`}</span>}
          </div>
        ) : <p className="text-[12px] text-fog-300 leading-snug">{a.slot ? `Empty slot: ${a.slot}.` : 'No image.'} Choose a file to fill it.</p>}
        {dpi && (dpi.level === 'amber' || dpi.level === 'red') && (
          <p className="text-[11px] leading-snug text-fog-300">{dpi.level === 'red' ? 'Below 150 DPI — this will print visibly soft.' : 'Below 300 DPI — acceptable, but not crisp.'} Make it smaller or replace it with a larger original. The badge is never exported.</p>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void replaceSelectedImage(f); e.target.value = '' }} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="gb-btn-outline" onClick={() => fileRef.current?.click()}><Upload size={13} /> {meta ? 'Replace' : 'Choose image'}</button>
          <button type="button" className="gb-btn-danger" data-testid="delete-image" onClick={() => ed.chain().focus().deleteSelection().run()}><Trash2 size={13} /> Delete</button>
        </div>
      </Panel>

      <Panel title="Placement">
        <Field label="Text wrap">
          <Select label="Text wrap" className="w-full" value={a.wrap} onChange={(v) => set({ wrap: v as WrapMode, ...(v === 'page' ? {} : { spread: false }) })}
            options={(Object.keys(WRAP_LABELS) as WrapMode[]).map((w) => ({ value: w, label: WRAP_LABELS[w] }))} />
        </Field>
        {(a.wrap === 'inline' || a.wrap === 'break') && (
          <Field label="Alignment" row>
            <Seg value={a.align} onChange={(v) => set({ align: v })} options={[{ value: 'left', label: <AlignLeft size={14} />, tip: 'Left' }, { value: 'center', label: <AlignCenter size={14} />, tip: 'Centre' }, { value: 'right', label: <AlignRight size={14} />, tip: 'Right' }]} />
          </Field>
        )}
        {!isPage && a.wrap !== 'full' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width"><NumField width={128} value={round(a.widthIn, 3)} min={0.25} max={round(maxW, 3)} step={0.05} unit="in" onChange={(n) => set({ widthIn: n })} /></Field>
            <Field label="Height"><NumField width={128} value={round(placedW / aspect, 3)} min={0.1} max={30} step={0.05} unit="in" onChange={(n) => set({ widthIn: Math.min(maxW, round(n * aspect, 3)) })} /></Field>
          </div>
        )}
        {!isPage && a.wrap !== 'full' && <button type="button" className="gb-btn-ghost w-full" onClick={() => set({ widthIn: round(figureContext.contentWidthIn, 3) })}>Fit to text width</button>}
        {a.wrap === 'behind' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From left"><NumField width={128} value={a.x} min={-2} max={12} step={0.05} unit="in" onChange={(n) => set({ x: n })} /></Field>
            <Field label="From top"><NumField width={128} value={a.y} min={-2} max={14} step={0.05} unit="in" onChange={(n) => set({ y: n })} /></Field>
          </div>
        )}
        {isPage && (
          <>
            <Toggle label="Two-page spread" hint="One image across facing pages. It always starts on a left-hand page." checked={a.spread} onChange={(v) => set({ spread: v })} />
            <Field label="Fit" row><Seg value={a.fit} onChange={(v) => set({ fit: v })} options={[{ value: 'cover', label: 'Fill page' }, { value: 'contain', label: 'Fit inside' }]} /></Field>
            <Field label="Focus across"><Slider value={a.focusX * 100} min={0} max={100} onChange={(n) => set({ focusX: n / 100 })} format={pct} /></Field>
            <Field label="Focus down"><Slider value={a.focusY * 100} min={0} max={100} onChange={(n) => set({ focusY: n / 100 })} format={pct} /></Field>
            {a.spread && <Field label="Gutter compensation" hint="Repeats this much image on each side of the fold so nothing is swallowed by the binding."><Slider value={a.gutterComp} min={0} max={0.375} step={0.025} onChange={(n) => set({ gutterComp: n })} format={(n) => `${n.toFixed(3)}″`} /></Field>}
            {!settings.bleed && <p className="text-[11px] text-amber leading-snug">Bleed is off, so this image stops at the trim edge. Turn on bleed in Layout for a true full-bleed page.</p>}
          </>
        )}
      </Panel>

      {!isPage && (
        <Panel title="Crop" defaultOpen={false} action={<button type="button" className="text-[11px] text-fog-400 hover:text-cyan" onClick={() => set({ cx: 0, cy: 0, cw: 1, ch: 1 })}>Reset</button>}>
          <Field label="Left"><Slider value={round(a.cx * 100, 1)} min={0} max={80} step={0.5} onChange={(n) => crop(n, a.cy * 100, right, bottom)} format={pct} /></Field>
          <Field label="Right"><Slider value={right} min={0} max={80} step={0.5} onChange={(n) => crop(a.cx * 100, a.cy * 100, n, bottom)} format={pct} /></Field>
          <Field label="Top"><Slider value={round(a.cy * 100, 1)} min={0} max={80} step={0.5} onChange={(n) => crop(a.cx * 100, n, right, bottom)} format={pct} /></Field>
          <Field label="Bottom"><Slider value={bottom} min={0} max={80} step={0.5} onChange={(n) => crop(a.cx * 100, a.cy * 100, right, n)} format={pct} /></Field>
        </Panel>
      )}

      <Panel title="Frame" defaultOpen={false}>
        {!isPage && <Field label="Rotation"><Slider value={a.rotation} min={-180} max={180} step={1} onChange={(n) => set({ rotation: n })} format={(n) => `${n}°`} /></Field>}
        <Field label="Opacity"><Slider value={a.opacity * 100} min={5} max={100} onChange={(n) => set({ opacity: n / 100 })} format={pct} /></Field>
        {!isPage && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Border"><NumField width={128} value={a.borderW} min={0} max={12} step={0.25} unit="pt" onChange={(n) => set({ borderW: n })} /></Field>
              <Field label="Corner radius"><NumField width={128} value={a.radius} min={0} max={200} step={1} unit="pt" onChange={(n) => set({ radius: n })} /></Field>
            </div>
            {a.borderW > 0 && <Field label="Border colour"><ColorField label="Border colour" value={a.borderColor} onChange={(c) => set({ borderColor: c })} /></Field>}
            <Field label="Shadow" row><Seg value={String(a.shadow)} onChange={(v) => set({ shadow: parseInt(v, 10) })} options={[{ value: '0', label: 'None' }, { value: '1', label: 'S' }, { value: '2', label: 'M' }, { value: '3', label: 'L' }]} /></Field>
          </>
        )}
      </Panel>

      <Panel title="Adjust" defaultOpen={false} action={<button type="button" className="text-[11px] text-fog-400 hover:text-cyan" onClick={() => set({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 })}>Reset</button>}>
        <Field label="Brightness"><Slider value={a.brightness} min={20} max={200} onChange={(n) => set({ brightness: n })} format={pct} /></Field>
        <Field label="Contrast"><Slider value={a.contrast} min={20} max={200} onChange={(n) => set({ contrast: n })} format={pct} /></Field>
        <Field label="Saturation"><Slider value={a.saturate} min={0} max={200} onChange={(n) => set({ saturate: n })} format={pct} /></Field>
        <Field label="Grayscale"><Slider value={a.grayscale} min={0} max={100} onChange={(n) => set({ grayscale: n })} format={pct} /></Field>
        <Field label="Sepia"><Slider value={a.sepia} min={0} max={100} onChange={(n) => set({ sepia: n })} format={pct} /></Field>
      </Panel>

      <Panel title="Caption & alt text">
        {!isPage && a.wrap !== 'behind' && (
          <>
            <Field label="Caption"><input className="gb-input" aria-label="Caption" data-testid="caption-input" value={a.caption} placeholder="Shown under the image" onChange={(e) => set({ caption: e.target.value })} /></Field>
            <Toggle label="Number this figure" hint="Adds “Figure 1.” automatically, counted per chapter." checked={a.numbered} onChange={(v) => set({ numbered: v })} />
          </>
        )}
        <Field label="Alt text" hint="Read aloud by screen readers in the EPUB. Describe what the image shows.">
          <textarea className="gb-input h-20 py-2 leading-snug resize-none" aria-label="Alt text" value={a.alt} onChange={(e) => set({ alt: e.target.value })} />
        </Field>
      </Panel>
    </>
  )
}

// ------------------------------------------------------------------ page / section
function PageInspector() {
  const project = useProject((s) => s.project)
  const activeId = useUI((s) => s.activeSectionId)
  const sectionPages = useLayout((s) => s.sectionPages)
  const firstPage = useLayout((s) => s.firstPage)
  const pages = useLayout((s) => s.pages)
  const sec = project?.sections.find((s) => s.id === activeId)
  if (!project) return null
  if (!sec) return <EmptyState icon={LayoutTemplate} title="Nothing selected">Click a page to edit its text, or pick a section in the structure panel to change how it starts.</EmptyState>
  const generated = isGenerated(sec.kind)
  const follow = project.settings.chaptersStartRight
  return (
    <>
      <Panel title={SECTION_LABELS[sec.kind]}>
        <Field label="Title"><input className="gb-input" aria-label="Section title" data-testid="section-title-input" value={sec.title} onChange={(e) => mutateSection(sec.id, { title: e.target.value }, 'rename section')} /></Field>
        <div className="grid grid-cols-3 gap-2 text-[12px] pt-1">
          {[['Pages', String(sectionPages[sec.id] ?? '–')], ['Starts on', firstPage[sec.id] !== undefined ? pages[firstPage[sec.id]]?.folio || '—' : '—'], ['Words', countDocWords(sec.doc).toLocaleString()]].map(([k, v]) => (
            <div key={k}><div className="text-fog-100 font-medium tabular-nums">{v}</div><div className="text-[10px] uppercase tracking-wider text-fog-400 mt-0.5">{k}</div></div>
          ))}
        </div>
        {generated && (
          <div className="rounded-md bg-ink-900 border border-ink-600 p-3">
            <p className="text-[11.5px] text-fog-300 leading-snug">
              {sec.kind === 'toc' ? 'The contents page writes itself from your sections, with live page numbers.' : 'This page is generated from Book Metadata, so the details are never typed twice.'}
            </p>
            {sec.kind !== 'toc' && <button type="button" className="gb-btn-outline w-full mt-3" onClick={() => useUI.setState({ dialog: 'metadata' })}><BookMarked size={13} /> Edit book metadata</button>}
          </div>
        )}
      </Panel>
      <Panel title="Section options">
        {!generated && <Toggle label="Show title on the opening page" checked={sec.showTitle} onChange={(v) => mutateSection(sec.id, { showTitle: v }, 'section title visibility')} />}
        {sec.kind === 'chapter' && <Toggle label="Numbered chapter" hint="Counts towards “Chapter One, Two…”." checked={sec.numbered} onChange={(v) => mutateSection(sec.id, { numbered: v }, 'chapter numbering')} />}
        {sec.kind !== 'toc' && <Toggle label="List in contents" checked={sec.includeInToc} onChange={(v) => mutateSection(sec.id, { includeInToc: v }, 'contents listing')} />}
        <Field label="Starts on">
          <Select label="Starts on" className="w-full" value={sec.startOnRight === null ? 'auto' : sec.startOnRight ? 'right' : 'any'}
            onChange={(v) => mutateSection(sec.id, { startOnRight: v === 'auto' ? null : v === 'right' }, 'section start page')}
            options={[{ value: 'auto', label: `Book default (${sec.kind === 'chapter' && follow ? 'right-hand page' : 'next page'})` }, { value: 'right', label: 'Always a right-hand page' }, { value: 'any', label: 'The next page' }]} />
        </Field>
        {!generated && (
          <Field label="Vertical position" row>
            <Seg value={sec.vAlign} onChange={(v) => mutateSection(sec.id, { vAlign: v }, 'vertical position')} options={[{ value: 'top', label: 'Top' }, { value: 'third', label: 'Upper third' }]} />
          </Field>
        )}
        <Field label="Part of the book">
          <Select label="Part of the book" className="w-full" value={sec.matter} onChange={(v) => mutateSection(sec.id, { matter: v }, 'matter')}
            options={[{ value: 'front', label: 'Front matter (roman numerals)' }, { value: 'body', label: 'Body (arabic numerals)' }, { value: 'back', label: 'Back matter' }]} />
        </Field>
      </Panel>
    </>
  )
}

export function Inspector() {
  useUI((s) => s.tick)
  const tab = useUI((s) => s.rightTab)
  const context = useUI((s) => s.context)
  const hasEditor = !!controller.activeId
  const ctxIcon = context === 'image' ? FileImage : context === 'text' || context === 'footnote' ? Type : Layers
  const ctxLabel = !hasEditor ? 'Page' : context === 'image' ? 'Image' : context === 'footnote' ? 'Footnote' : context === 'text' ? 'Text' : 'Page'
  const tabs = [
    { id: 'context' as const, icon: ctxIcon, label: ctxLabel },
    { id: 'design' as const, icon: Palette, label: 'Design' },
    { id: 'layout' as const, icon: SlidersHorizontal, label: 'Layout' },
  ]
  return (
    <aside className="w-[304px] shrink-0 flex flex-col bg-ink-800 border-l border-ink-600/80 gb-fade-in" aria-label="Inspector" data-testid="inspector">
      <div className="h-11 shrink-0 flex items-stretch px-2 border-b border-ink-600/80" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} data-testid={`inspector-tab-${t.id}`} onClick={() => useUI.setState({ rightTab: t.id })}
            className={`relative flex-1 flex items-center justify-center gap-2 text-[12px] font-medium transition-colors duration-150 ${tab === t.id ? 'text-white' : 'text-fog-400 hover:text-fog-100'}`}>
            <t.icon size={14} strokeWidth={1.75} /> {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded gb-accent-line" />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto" data-context={ctxLabel.toLowerCase()}>
        {tab === 'context' && (
          <>
            {hasEditor && context === 'image' && <ImageInspector />}
            {hasEditor && context === 'footnote' && <FootnoteInspector />}
            {hasEditor && context === 'text' && <TextInspector />}
            {(!hasEditor || context === 'page' || context === 'text') && <PageInspector />}
          </>
        )}
        {tab === 'design' && <DesignPanel />}
        {tab === 'layout' && <LayoutPanel />}
      </div>
    </aside>
  )
}
