/** Preflight: everything worth knowing before the files go to a printer. Pure given project + pages. */
import type { Project } from '@/types'
import type { BookPageData } from '@/store/layout'
import type { PageGeometry } from './bookCss'
import { KDP_MAX_PAGES, KDP_MIN_OUTER, KDP_MIN_PAGES, kdpGutter } from './kdp'
import { luminance } from './themes'
import { walkDoc } from './wordcount'
import { round } from './units'

export type IssueLevel = 'error' | 'warn' | 'info'
export interface Issue {
  id: string
  level: IssueLevel
  title: string
  detail: string
  /** physical page index to jump to */
  page?: number
  sectionId?: string
  open?: 'metadata' | 'layout' | 'design'
}

const isGray = (hex: string): boolean => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return true
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16))
  return Math.max(r, g, b) - Math.min(r, g, b) < 10
}

interface FigureHit { id: string; level: string; dpi: string; empty: boolean; wrap: string }
function figuresIn(html: string): FigureHit[] {
  if (!html.includes('gb-fig')) return []
  const out: FigureHit[] = []
  if (typeof document === 'undefined') return out
  const t = document.createElement('template')
  t.innerHTML = html
  t.content.querySelectorAll('figure.gb-fig').forEach((f) => out.push({
    id: f.getAttribute('data-fig-id') ?? '', level: f.getAttribute('data-dpi-level') ?? '', dpi: f.getAttribute('data-dpi') ?? '',
    empty: f.hasAttribute('data-empty'), wrap: f.getAttribute('data-wrap') ?? '',
  }))
  return out
}

export function runPreflight(project: Project, pages: BookPageData[], geo: PageGeometry): Issue[] {
  const issues: Issue[] = []
  const s = project.settings
  const m = project.meta
  const kdp = s.preset === 'kdp-paperback' || s.preset === 'kdp-hardcover'
  const total = pages.length
  const add = (i: Issue): void => { issues.push(i) }
  const pageNo = (i: number): string => `page ${i + 1}`

  // ---- per-page checks
  const seen = new Set<string>()
  let hasPlate = false
  pages.forEach((p) => {
    const pg = p.page
    if (!pg) return
    if (pg.overflow) add({ id: `overflow-${p.index}`, level: 'error', title: `Content overflows ${pageNo(p.index)}`, detail: 'Something on this page (usually an image, table or text box) is taller than the text block. Make it smaller or split it.', page: p.index })
    if (pg.forced) add({ id: `widow-${p.index}`, level: 'warn', title: `Widow or orphan line near ${pageNo(p.index)}`, detail: 'A paragraph or heading had to be split against the two-line rule because nothing else fitted. Edit a line or add a page break to fix it.', page: p.index })
    const htmls = [...pg.segments.map((x) => x.html), pg.figureHtml ?? '', ...pg.behind]
    const figs = htmls.flatMap(figuresIn)
    if (p.kind !== 'flow') hasPlate = true
    for (const f of figs) {
      if (seen.has(f.id)) continue
      seen.add(f.id)
      if (f.empty) add({ id: `empty-${f.id}`, level: 'warn', title: `Empty image slot on ${pageNo(p.index)}`, detail: 'An image placeholder has no picture. Fill it or delete it — empty slots print as a blank box.', page: p.index, sectionId: p.sectionId ?? undefined })
      else if (f.level === 'red') add({ id: `dpi-${f.id}`, level: 'error', title: `Low-resolution image on ${pageNo(p.index)} (${f.dpi})`, detail: 'Below 150 DPI at its placed size. It will print visibly blurred. Shrink it or replace it with a larger original.', page: p.index, sectionId: p.sectionId ?? undefined })
      else if (f.level === 'amber') add({ id: `dpi-${f.id}`, level: 'warn', title: `Image below 300 DPI on ${pageNo(p.index)} (${f.dpi})`, detail: 'Printable, but softer than the 300 DPI printers recommend. Shrink it a little or use a larger original.', page: p.index, sectionId: p.sectionId ?? undefined })
    }
    if (p.kind === 'flow' && p.sectionId) {
      const text = pg.segments.map((x) => x.html.replace(/<[^>]+>/g, '')).join('').trim()
      if (!text && !figs.length && !pg.behind.length) add({ id: `emptypage-${p.index}`, level: 'warn', title: `${pageNo(p.index)} is empty`, detail: `“${p.runningTitle}” has a page with nothing on it. Add text or remove the section.`, page: p.index, sectionId: p.sectionId })
    }
  })

  // ---- structure
  project.sections.forEach((sec) => {
    if (sec.kind === 'chapter' && !sec.title.trim()) add({ id: `title-${sec.id}`, level: 'warn', title: 'A chapter has no title', detail: 'Chapter titles feed the contents page and running heads.', sectionId: sec.id })
  })
  if (!project.sections.some((x) => x.kind === 'copyright')) add({ id: 'no-copyright', level: 'warn', title: 'No copyright page', detail: 'Add one from the structure panel (+). It fills itself from Book Metadata.' })
  if (!project.sections.some((x) => x.kind === 'toc')) add({ id: 'no-toc', level: 'info', title: 'No contents page', detail: 'Fiction can skip it; non-fiction readers expect one. Add “Contents” from the structure panel.' })
  if (!m.title.trim() || m.title === 'Untitled Book') add({ id: 'no-title', level: 'error', title: 'The book has no title', detail: 'Set it in Book Metadata — it appears on the title page, cover, running heads and in every export.', open: 'metadata' })
  if (!m.author.trim()) add({ id: 'no-author', level: 'warn', title: 'No author name', detail: 'Set it in Book Metadata.', open: 'metadata' })
  if (!m.isbn13.trim() && !m.isbn10.trim()) add({ id: 'no-isbn', level: 'info', title: 'No ISBN in metadata', detail: 'KDP can assign a free ISBN at upload; IngramSpark requires your own. Add it in Book Metadata and it appears on the copyright page and the cover barcode box.', open: 'metadata' })

  // ---- print geometry
  if (kdp) {
    const need = kdpGutter(total)
    if (round(geo.insideIn, 4) < need) add({ id: 'gutter', level: 'error', title: `Gutter too small for ${total} pages`, detail: `KDP requires an inside margin of at least ${need}″ at this page count; yours is ${round(geo.insideIn, 3)}″. Turn on “Automatic KDP gutter” in Layout or raise the inside margin.`, open: 'layout' })
    if (total < KDP_MIN_PAGES) add({ id: 'min-pages', level: 'warn', title: `Only ${total} pages`, detail: `KDP paperbacks need at least ${KDP_MIN_PAGES} pages.` })
    if (total > KDP_MAX_PAGES) add({ id: 'max-pages', level: 'error', title: `${total} pages is over KDP's limit`, detail: `The maximum is ${KDP_MAX_PAGES} pages. Use a larger trim size or smaller type.`, open: 'layout' })
    if (total % 2 === 1) add({ id: 'odd-pages', level: 'info', title: 'Odd page count', detail: 'The printer will add one blank page at the end so the book has an even number of pages.' })
  }
  if (s.preset !== 'screen') {
    const small = (['top', 'bottom', 'outside'] as const).filter((k) => s.margins[k] < KDP_MIN_OUTER)
    if (small.length) add({ id: 'margins', level: 'error', title: 'Margins below 0.25″', detail: `The ${small.join(', ')} margin is under the 0.25″ minimum. 0.375″ or more is recommended.`, open: 'layout' })
  }
  if (hasPlate && !s.bleed && s.preset !== 'screen') add({ id: 'bleed-plate', level: 'warn', title: 'Full-bleed pages without bleed', detail: 'This book has full-page images but bleed is off, so they stop exactly at the trim edge and may show a white sliver after cutting. Turn on bleed in Layout.', open: 'layout' })
  if (s.printPageColor && !s.bleed && !isGray(s.colors.page) ) add({ id: 'bleed-colour', level: 'warn', title: 'Printed page colour without bleed', detail: 'A coloured page background needs bleed to reach the paper edge.', open: 'layout' })

  // ---- colour honesty
  if (!s.printPageColor && luminance(s.colors.text) > 0.55) add({ id: 'light-text', level: 'error', title: 'Light text on a page colour that will not print', detail: 'Your text colour is light because the page colour is dark — but page colour is preview-only, so the PDF would have pale text on white paper. Enable “Print the page colour” in Layout, or choose a dark text colour.', open: 'layout' })
  const colourReasons: string[] = []
  if (!isGray(s.colors.text)) colourReasons.push('text colour')
  if (!isGray(s.colors.accent)) colourReasons.push('chapter accent colour')
  if (s.printPageColor && !isGray(s.colors.page)) colourReasons.push('page colour')
  const usedIds = new Set<string>()
  const desaturated = new Set<string>()
  for (const sec of project.sections) walkDoc(sec.doc, (n) => {
    if (n.type !== 'figure' || !n.attrs?.imageId) return
    usedIds.add(String(n.attrs.imageId))
    if (Number(n.attrs.grayscale) >= 100 || Number(n.attrs.saturate) === 0) desaturated.add(String(n.attrs.imageId))
  })
  const colourImages = project.images.filter((im) => usedIds.has(im.id) && !desaturated.has(im.id) && im.hasColor !== false)
  if (colourImages.length) colourReasons.push(`${colourImages.length} colour image${colourImages.length === 1 ? '' : 's'}`)
  if (colourReasons.length && s.preset !== 'screen') add({ id: 'colour', level: 'info', title: 'This interior contains colour', detail: `Found: ${colourReasons.join(', ')}. Screens are RGB and the PDF is RGB; the printer converts it. On KDP a colour interior costs noticeably more per copy than black & white — if you choose black & white there, these print in grey.` })

  // ---- fonts + accessibility
  const unlicensed = project.customFonts.filter((f) => !f.licenceConfirmed)
  if (unlicensed.length) add({ id: 'font-licence', level: 'info', title: 'Custom font licence not confirmed', detail: `${unlicensed.map((f) => f.family).join(', ')}: the EPUB will not embed ${unlicensed.length === 1 ? 'this font' : 'these fonts'} (readers fall back to their own). You are responsible for the print licence too.`, open: 'design' })
  let noAlt = 0
  for (const sec of project.sections) walkDoc(sec.doc, (n) => { if (n.type === 'figure' && n.attrs?.imageId && !String(n.attrs.alt ?? '').trim()) noAlt++ })
  if (noAlt) add({ id: 'alt', level: 'info', title: `${noAlt} image${noAlt === 1 ? '' : 's'} without alt text`, detail: 'Alt text is read aloud in the EPUB. Select an image and describe it under “Caption & alt text”.' })

  const order: Record<IssueLevel, number> = { error: 0, warn: 1, info: 2 }
  return issues.sort((a, b) => order[a.level] - order[b.level] || (a.page ?? 1e9) - (b.page ?? 1e9))
}
