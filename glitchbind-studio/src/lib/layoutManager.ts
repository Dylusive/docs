/**
 * Orchestrates pagination for the whole book: per-section layout cache, gutter-band loop,
 * contents-page fix-point, and publishing the assembled pages to the layout store.
 */
import type { Project, Section } from '@/types'
import { useProject } from '@/store/project'
import { useLayout, type BookPageData } from '@/store/layout'
import { toast } from '@/store/ui'
import { applyBookVars, bookVarsCss, layoutKey, pageGeometry, type PageGeometry } from './bookCss'
import { assembleBook, chapterNumbering, type AsmSection, type Assembled } from './pagination/book'
import { layoutSection, type SectionLayout, type SourceSpec } from './pagination/section'
import { copyrightHtml, openerHtml, titlePageHtml, tocHtml } from './generated'
import { docHtml, withDropCap } from './editor/html'
import { imageUrl, imagesVersion, onImagesChange } from './images'
import { ensureFonts } from './fonts'
import { kdpGutter, resolveInsideMargin } from './kdp'
import { figureContext } from './editor/figure'
import { controller } from './editor/controller'
import { pxToIn } from './units'

interface CacheEntry { key: string; recto: boolean; layout: SectionLayout }
const cache = new Map<string, CacheEntry>()
const docIds = new WeakMap<object, number>()
let nextDocId = 1
let fontEpoch = 0
let raf = 0
let tocUsed = ''
let lastBand: { projectId: string; inside: number } | null = null
let fontsKey = ''

const docId = (doc: object | null): number => {
  if (!doc) return 0
  let id = docIds.get(doc)
  if (!id) { id = nextDocId++; docIds.set(doc, id) }
  return id
}

export const usedFamilies = (p: Project): string[] => {
  const t = p.settings.typography
  return [t.bodyFont, t.headingFont, t.chapterFont, t.captionFont, ...p.customStyles.map((c) => c.fontFamily ?? '').filter(Boolean)]
}

export function scheduleLayout(): void {
  if (raf) return
  raf = requestAnimationFrame(() => { raf = 0; runLayout() })
}
export function invalidateLayout(): void { cache.clear(); scheduleLayout() }

if (typeof document !== 'undefined') {
  document.fonts?.addEventListener('loadingdone', () => { fontEpoch++; scheduleLayout() })
  onImagesChange(() => scheduleLayout())
}

export const asmSection = (s: Section, p: Project): AsmSection => ({
  id: s.id, kind: s.kind, matter: s.matter, title: s.title, numbered: s.numbered, includeInToc: s.includeInToc,
  startOnRight: s.startOnRight ?? (s.kind === 'chapter' ? p.settings.chaptersStartRight : false),
})

function sourcesFor(s: Section, p: Project, chapterNo: number, live: HTMLElement | null): SourceSpec[] {
  const t = p.settings.typography
  if (s.kind === 'title') return [{ key: 'opener', cls: 'gb-src-gen', html: titlePageHtml(p.meta, t, imageUrl(p.meta.logoImageId)) }]
  if (s.kind === 'copyright') return [{ key: 'opener', cls: 'gb-src-gen', html: copyrightHtml(p.meta) }]
  if (s.kind === 'toc') return [{ key: 'opener', cls: 'gb-src-gen', html: tocUsed }]
  const out: SourceSpec[] = []
  const opener = openerHtml(s, chapterNo, t)
  if (opener) out.push({ key: 'opener', cls: 'gb-src-opener', html: opener })
  const cls = `gb-src-main gb-sec-${s.kind}`
  if (live) out.push({ key: 'main', cls, live })
  else {
    const html = docHtml(s.doc)
    out.push({ key: 'main', cls, html: s.kind === 'chapter' && t.dropCap ? withDropCap(html) : html })
  }
  return out
}

function layoutAll(p: Project, geo: PageGeometry, lk: string): { asm: Assembled; layouts: Map<string, SectionLayout> } {
  const sections = p.sections.map((s) => asmSection(s, p))
  const numbering = chapterNumbering(sections)
  const metaKey = JSON.stringify(p.meta)
  let asm!: Assembled
  const layouts = new Map<string, SectionLayout>()
  for (let pass = 0; pass < 4; pass++) {
    asm = assembleBook(sections, (a, recto, i) => {
      const s = p.sections[i]
      const live = controller.activeId === s.id ? controller.root() : null
      const key = [lk, fontEpoch, s.kind, s.title, s.showTitle, s.numbered, numbering[s.id] ?? 0, s.vAlign,
        live ? `live:${controller.version(s.id)}` : `doc:${docId(s.doc)}:${imagesVersion()}`,
        s.kind === 'toc' ? tocUsed : '', s.kind === 'title' || s.kind === 'copyright' ? metaKey + imagesVersion() : ''].join('|')
      const hit = cache.get(a.id)
      let layout: SectionLayout
      if (hit && hit.key === key && (!hit.layout.hasSpread || hit.recto === recto)) layout = hit.layout
      else {
        layout = layoutSection(sourcesFor(s, p, numbering[s.id] ?? 0, live), {
          contentW: geo.contentW, contentH: geo.contentH, orphans: p.settings.orphans, widows: p.settings.widows,
          footnotes: p.settings.footnotes, firstPageRecto: recto, vAlign: s.vAlign,
        })
        cache.set(a.id, { key, recto, layout })
      }
      layouts.set(a.id, layout)
      return layout.pages.map((pg) => pg.kind)
    }, { insertBlanks: p.settings.preset !== 'screen' })
    const toc = tocHtml(asm.toc)
    if (toc === tocUsed || !p.sections.some((s) => s.kind === 'toc')) break
    tocUsed = toc
  }
  for (const id of Array.from(cache.keys())) if (!layouts.has(id)) cache.delete(id)
  return { asm, layouts }
}

export function runLayout(): void {
  const p = useProject.getState().project
  if (!p) return
  const fam = usedFamilies(p)
  const fk = fam.join('|')
  if (fk !== fontsKey) {
    fontsKey = fk
    void ensureFonts(fam).then(() => { fontEpoch++; scheduleLayout() })
    if (!useLayout.getState().ready) return // first paint waits for real fonts
  }
  const t0 = performance.now()
  const prev = useLayout.getState()
  let count = lastBand?.projectId === p.id ? Math.max(prev.pages.length, 1) : 1
  let geo = pageGeometry(p.settings, count)
  let result!: ReturnType<typeof layoutAll>
  for (let iter = 0; iter < 5; iter++) {
    geo = pageGeometry(p.settings, count)
    applyBookVars(bookVarsCss(p.settings, geo, p.customStyles))
    Object.assign(figureContext, {
      contentWidthIn: pxToIn(geo.contentW), trimWIn: p.settings.trim.w, trimHIn: p.settings.trim.h,
      bleedIn: p.settings.bleed ? 0.125 : 0, figureNumbers: p.settings.figureNumbers,
    })
    result = layoutAll(p, geo, layoutKey(p.settings, geo, p.customStyles))
    const total = result.asm.pages.length
    if (Math.abs(resolveInsideMargin(p.settings, total) - geo.insideIn) < 1e-6) break
    count = total
  }
  const { asm, layouts } = result
  const h = p.settings.headers
  const pick = (which: typeof h.left, title: string): string =>
    which === 'author' ? p.meta.author : which === 'title' ? p.meta.title : which === 'chapter' ? title : ''
  const sectionPages: Record<string, number> = {}
  const pages: BookPageData[] = asm.pages.map((a) => {
    const sec = a.sectionId ? p.sections[a.sectionIndex] : null
    const page = a.sectionId && a.pageInSection >= 0 ? layouts.get(a.sectionId)?.pages[a.pageInSection] ?? null : null
    if (a.sectionId) sectionPages[a.sectionId] = (sectionPages[a.sectionId] ?? 0) + 1
    return {
      ...a, page, editable: !!sec?.doc,
      showHeader: a.showHeader && h.enabled, showFolio: a.showFolio && h.folio !== 'none',
      header: h.enabled ? pick(a.side === 'left' ? h.left : h.right, a.runningTitle) : '',
    }
  })
  useLayout.setState((s) => ({
    pages, geo, toc: asm.toc, chapterNumbers: asm.chapterNumbers, firstPage: asm.firstPage, sectionPages, frontPages: asm.frontPages,
    ready: true, gen: s.gen + 1, lastMs: performance.now() - t0,
  }))
  if (p.settings.autoGutter) {
    const inside = kdpGutter(pages.length)
    if (lastBand && lastBand.projectId === p.id && lastBand.inside !== inside) {
      toast(`Your book is now ${pages.length} pages. KDP requires a ${inside}″ gutter at this length — the inside margin was updated to ${geo.insideIn}″ automatically.`, 'warn')
    }
    lastBand = { projectId: p.id, inside }
  } else lastBand = { projectId: p.id, inside: -1 }
  controller.afterLayout()
}

/** Layout exactly as it will be exported — used by print/proof to guarantee the same pages. */
export const currentPages = (): BookPageData[] => useLayout.getState().pages
