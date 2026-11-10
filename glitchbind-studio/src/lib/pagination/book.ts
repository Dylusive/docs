/**
 * Book assembly — pure. Takes the per-section page lists and produces the physical page sequence:
 * left/right sides, blank pages for "start on right", folios (roman front matter, arabic from the
 * first body section), running-head visibility, chapter numbers and the contents-page mapping.
 */
import type { Matter, SectionKind } from '@/types'
import type { CorePageKind } from './core'

export interface AsmSection {
  id: string
  kind: SectionKind
  matter: Matter
  title: string
  numbered: boolean
  includeInToc: boolean
  startOnRight: boolean
}
export interface AsmPage {
  index: number
  side: 'left' | 'right'
  sectionId: string | null
  sectionIndex: number
  pageInSection: number
  kind: CorePageKind
  folio: string
  showFolio: boolean
  showHeader: boolean
  first: boolean
  runningTitle: string
}
export interface AsmTocEntry { sectionId: string; label: string; title: string; page: string; minor: boolean; pageIndex: number }
export interface Assembled {
  pages: AsmPage[]
  toc: AsmTocEntry[]
  chapterNumbers: Record<string, number>
  firstPage: Record<string, number>
  frontPages: number
}

const BARE: SectionKind[] = ['title', 'copyright', 'dedication', 'epigraph']

export function romanLower(n: number): string {
  const map: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]
  let out = ''
  for (const [v, s] of map) while (n >= v) { out += s; n -= v }
  return out
}

export function chapterNumbering(sections: AsmSection[]): Record<string, number> {
  const out: Record<string, number> = {}
  let n = 0
  for (const s of sections) if (s.numbered) out[s.id] = ++n
  return out
}

/**
 * @param pagesOf called once per section, in order, with whether its first page is a right-hand page
 *                (two-page spreads inside the section depend on it). Returns that section's page kinds.
 */
export function assembleBook(
  sections: AsmSection[],
  pagesOf: (section: AsmSection, firstPageRecto: boolean, index: number) => CorePageKind[],
  opts: { insertBlanks: boolean },
): Assembled {
  const pages: AsmPage[] = []
  const firstPage: Record<string, number> = {}
  const chapterNumbers = chapterNumbering(sections)
  const hasFront = sections.some((s) => s.matter === 'front')
  let bodyStart = -1 // physical index where arabic numbering starts
  let frontPages = 0

  sections.forEach((s, si) => {
    const startsBody = bodyStart < 0 && s.matter !== 'front'
    const wantRecto = opts.insertBlanks && pages.length > 0 && (s.startOnRight || (startsBody && hasFront))
    if (wantRecto && pages.length % 2 === 1) {
      pages.push({ index: pages.length, side: 'left', sectionId: null, sectionIndex: si, pageInSection: -1, kind: 'blank', folio: '', showFolio: false, showHeader: false, first: false, runningTitle: '' })
    }
    if (startsBody) { bodyStart = pages.length; frontPages = pages.length }
    const kinds = pagesOf(s, pages.length % 2 === 0, si)
    firstPage[s.id] = pages.length
    kinds.forEach((kind, pi) => {
      const index = pages.length
      const folio = bodyStart >= 0 ? String(index - bodyStart + 1) : romanLower(index + 1)
      const plain = kind === 'flow'
      const bare = BARE.includes(s.kind)
      pages.push({
        index, side: index % 2 === 0 ? 'right' : 'left', sectionId: s.id, sectionIndex: si, pageInSection: pi, kind, folio,
        showFolio: plain && !bare && pi > 0, showHeader: plain && !bare && pi > 0 && s.kind !== 'toc', first: pi === 0, runningTitle: s.title,
      })
    })
  })
  if (bodyStart < 0) frontPages = pages.length

  const toc: AsmTocEntry[] = sections.filter((s) => s.includeInToc && s.kind !== 'toc' && firstPage[s.id] !== undefined).map((s) => ({
    sectionId: s.id, label: chapterNumbers[s.id] ? String(chapterNumbers[s.id]) : '', title: s.title,
    page: pages[firstPage[s.id]]?.folio ?? '', minor: s.matter !== 'body', pageIndex: firstPage[s.id],
  }))
  return { pages, toc, chapterNumbers, firstPage, frontPages }
}
