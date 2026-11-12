/**
 * Lays out one book section (a chapter, a dedication, the contents page…) into real pages.
 * A section is a sequence of source flows — optional opener, main text, optional end-notes —
 * measured in the browser, paginated by the pure core, then cut into static page slices.
 */
import { paginateUnits, type CorePageKind, type PageFloat, type Unit } from './core'
import { endsHyphenated, measureFlow, type Measured, type MUnit } from './measure'
import { sliceHtml } from './fragments'

export interface SourceSpec {
  key: 'opener' | 'main' | 'notes'
  /** extra class names for the slice container (section kind etc.) */
  cls: string
  html?: string
  /** measure this live element (the editor) instead of rendering `html` off-screen */
  live?: HTMLElement
}
export interface LayoutEnv {
  contentW: number
  contentH: number
  orphans: number
  widows: number
  footnotes: 'page' | 'chapter'
  firstPageRecto: boolean
  vAlign: 'top' | 'third'
}
export interface PageSegment { key: SourceSpec['key']; cls: string; html: string; y0: number; y1: number; fnStart: number; figStart: number }
export interface PageNote { n: number; id: string; text: string }
export interface SectionPage {
  kind: CorePageKind
  segments: PageSegment[]
  notes: PageNote[]
  noteHeight: number
  used: number
  overflow: boolean
  forced: boolean
  offsetY: number
  /** outerHTML of the figure for full-page illustration / spread pages */
  figureHtml?: string
  /** behind-text figures anchored on this page */
  behind: string[]
}
export interface SectionLayout { pages: SectionPage[]; ms: number; hasSpread: boolean; footnoteCount: number; lines: number }

let host: HTMLDivElement | null = null
let inner: HTMLDivElement | null = null
export function measureHost(contentW: number): HTMLDivElement {
  if (!host || !host.isConnected) {
    host = document.createElement('div')
    host.className = 'gb-book gb-measure'
    host.lang = 'en'
    inner = document.createElement('div')
    host.appendChild(inner)
    document.body.appendChild(host)
  }
  inner!.style.width = `${contentW}px`
  return inner!
}

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const noteItemHtml = (n: number, text: string): string =>
  `<div class="gb-fn-item"><span class="gb-fn-n">${n}</span>${escapeHtml(text) || '&nbsp;'}</div>`

const cleanFigure = (el: Element): string => {
  const c = el.cloneNode(true) as Element
  c.classList.remove('ProseMirror-selectednode')
  c.removeAttribute('contenteditable')
  c.removeAttribute('draggable')
  return c.outerHTML
}

export function layoutSection(sources: SourceSpec[], env: LayoutEnv): SectionLayout {
  const t0 = performance.now()
  const hostEl = measureHost(env.contentW)
  const temp: HTMLElement[] = []
  const mount = (cls: string, html: string): HTMLElement => {
    const el = document.createElement('div')
    el.className = `gb-content ${cls}`
    el.innerHTML = html
    hostEl.appendChild(el)
    temp.push(el)
    return el
  }

  const specs: SourceSpec[] = []
  const measured: Measured[] = []
  for (const s of sources) {
    const root = s.live ?? mount(s.cls, s.html ?? '')
    specs.push(s)
    measured.push(measureFlow(root, specs.length - 1))
  }
  const main = measured[specs.findIndex((s) => s.key === 'main')]
  const noteList = main?.footnotes ?? []
  const noteNumber = new Map<string, number>()
  noteList.forEach((f, i) => noteNumber.set(f.id, i + 1))
  const noteText = new Map(noteList.map((f) => [f.id, f.text]))

  // chapter-end notes become one more flow after the main text
  if (env.footnotes === 'chapter' && noteList.length) {
    const html = `<p class="gb-notes-title" data-keep-next>Notes</p>` + noteList.map((f, i) => `<p class="gb-note">${i + 1}.&ensp;${escapeHtml(f.text)}</p>`).join('')
    specs.push({ key: 'notes', cls: 'gb-src-notes', html })
    measured.push(measureFlow(mount('gb-src-notes', html), specs.length - 1))
  }

  // page-foot notes: measure each note's height once
  let footnoteHeight: ((id: string) => number) | undefined
  let footnoteGap = 0
  if (env.footnotes === 'page' && noteList.length) {
    const box = document.createElement('div')
    box.className = 'gb-footnotes'
    box.style.position = 'static'
    box.innerHTML = noteList.map((f, i) => noteItemHtml(i + 1, f.text)).join('')
    hostEl.appendChild(box)
    temp.push(box)
    const heights = new Map<string, number>()
    Array.from(box.children).forEach((c, i) => {
      const cs = getComputedStyle(c)
      heights.set(noteList[i].id, (c as HTMLElement).offsetHeight + parseFloat(cs.marginTop))
    })
    footnoteGap = parseFloat(getComputedStyle(box).paddingTop) + 8
    footnoteHeight = (id) => heights.get(id) ?? 0
  }

  // one global unit list across all sources
  const offsets: number[] = []
  const units: Unit[] = []
  const floats: (PageFloat & { el: Element })[] = []
  const behind: { atUnit: number; el: Element }[] = []
  measured.forEach((m) => {
    const off = units.length
    offsets.push(off)
    for (const u of m.units) units.push(u)
    for (const f of m.floats) floats.push({ ...f, atUnit: f.atUnit + off })
    for (const b of m.behind) behind.push({ atUnit: b.atUnit + off, el: b.el })
  })

  const hyphenCache = new Map<number, boolean>()
  const core = paginateUnits(units, floats, {
    pageHeight: env.contentH, orphans: env.orphans, widows: env.widows, footnoteHeight, footnoteGap, firstPageRecto: env.firstPageRecto,
    hyphenBefore: (i) => {
      let hit = hyphenCache.get(i)
      if (hit === undefined) { hit = endsHyphenated(units[i] as MUnit).hyphen; hyphenCache.set(i, hit) }
      return hit
    },
  })

  const pages: SectionPage[] = core.map((p) => {
    const segments: PageSegment[] = p.segments.map((seg) => {
      const m = measured[seg.src]
      const off = offsets[seg.src]
      return {
        key: specs[seg.src].key, cls: specs[seg.src].cls,
        html: sliceHtml(m, seg.from - off, seg.to - off),
        y0: seg.y0, y1: seg.y1,
        fnStart: m.fnBefore[seg.from - off] ?? 0, figStart: m.figBefore[seg.from - off] ?? 0,
      }
    })
    const float = p.floatId ? floats.find((f) => f.id === p.floatId) : undefined
    return {
      kind: p.kind, segments,
      notes: env.footnotes === 'page' ? p.footnotes.map((id) => ({ id, n: noteNumber.get(id) ?? 0, text: noteText.get(id) ?? '' })) : [],
      noteHeight: p.footnoteHeight, used: p.used, overflow: p.overflow, forced: p.forced, offsetY: 0,
      figureHtml: float ? cleanFigure(float.el) : undefined,
      behind: [],
    }
  })

  // behind-text figures belong to the page that holds their anchor
  const flowPages = core.map((p, i) => ({ p, i })).filter((x) => x.p.kind === 'flow')
  for (const b of behind) {
    const hit = flowPages.find((x) => b.atUnit >= x.p.from && b.atUnit < x.p.to) ?? flowPages[flowPages.length - 1]
    if (hit) pages[hit.i].behind.push(cleanFigure(b.el))
  }
  if (!pages.length) pages.push({ kind: 'flow', segments: [], notes: [], noteHeight: 0, used: 0, overflow: false, forced: false, offsetY: 0, behind: [] })
  if (env.vAlign === 'third' && pages.length === 1) pages[0].offsetY = Math.max(0, (env.contentH - pages[0].used - pages[0].noteHeight) / 3)

  for (const el of temp) el.remove()
  return { pages, ms: performance.now() - t0, hasSpread: floats.some((f) => f.spread), footnoteCount: noteList.length, lines: units.length }
}
