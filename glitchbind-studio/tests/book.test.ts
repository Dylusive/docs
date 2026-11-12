import { describe, expect, it } from 'vitest'
import { assembleBook, romanLower, type AsmSection } from '@/lib/pagination/book'
import type { CorePageKind } from '@/lib/pagination/core'
import { tocHtml } from '@/lib/generated'

const sec = (id: string, kind: AsmSection['kind'], matter: AsmSection['matter'], extra: Partial<AsmSection> = {}): AsmSection => ({
  id, kind, matter, title: id, numbered: kind === 'chapter', includeInToc: kind === 'chapter' || kind === 'preface' || kind === 'about', startOnRight: false, ...extra,
})
const flow = (n: number): CorePageKind[] => Array.from({ length: n }, () => 'flow' as const)

describe('book assembly + contents mapping', () => {
  const sections = [
    sec('title', 'title', 'front', { startOnRight: true }), sec('copyright', 'copyright', 'front'), sec('toc', 'toc', 'front', { startOnRight: true }),
    sec('preface', 'preface', 'front'), sec('c1', 'chapter', 'body'), sec('c2', 'chapter', 'body'), sec('c3', 'chapter', 'body'), sec('about', 'about', 'back'),
  ]
  const counts: Record<string, number> = { title: 1, copyright: 1, toc: 1, preface: 2, c1: 11, c2: 7, c3: 4, about: 1 }
  const book = assembleBook(sections, (s) => flow(counts[s.id]), { insertBlanks: true })

  it('contents page numbers are the real first pages of each chapter', () => {
    for (const entry of book.toc) {
      const first = book.pages.find((p) => p.sectionId === entry.sectionId && p.pageInSection === 0)!
      expect(entry.page).toBe(first.folio)
      expect(entry.pageIndex).toBe(first.index)
    }
    expect(book.toc.map((t) => [t.sectionId, t.label, t.page])).toEqual([['preface', '', 'iv'], ['c1', '1', '1'], ['c2', '2', '12'], ['c3', '3', '19'], ['about', '', '23']])
  })

  it('numbers front matter in roman and starts arabic 1 on a right-hand page at the first chapter', () => {
    expect(book.pages.slice(0, 5).map((p) => p.folio)).toEqual(['i', 'ii', 'iii', 'iv', 'v'])
    const c1 = book.pages[book.firstPage.c1]
    expect(c1.folio).toBe('1')
    expect(c1.side).toBe('right')
    // 5 front pages → a blank left page is inserted so chapter one opens on a recto
    expect(book.pages[book.firstPage.c1 - 1].kind).toBe('blank')
    expect(book.frontPages).toBe(6)
  })

  it('alternates sides and hides headers and folios on openers, bare pages and blanks', () => {
    book.pages.forEach((p, i) => expect(p.side).toBe(i % 2 === 0 ? 'right' : 'left'))
    expect(book.pages[0].showFolio).toBe(false) // title page
    expect(book.pages[book.firstPage.c2].showHeader).toBe(false) // chapter opening
    expect(book.pages[book.firstPage.c2].showFolio).toBe(false)
    expect(book.pages[book.firstPage.c2 + 1].showHeader).toBe(true)
    expect(book.pages.filter((p) => p.kind === 'blank').every((p) => !p.showFolio && !p.showHeader)).toBe(true)
  })

  it('honours “chapters start on a right-hand page” and passes page parity to each section', () => {
    const right = sections.map((s) => (s.kind === 'chapter' ? { ...s, startOnRight: true } : s))
    const seen: Record<string, boolean> = {}
    const b = assembleBook(right, (s, recto) => { seen[s.id] = recto; return flow(counts[s.id]) }, { insertBlanks: true })
    for (const id of ['c1', 'c2', 'c3']) { expect(b.pages[b.firstPage[id]].side).toBe('right'); expect(seen[id]).toBe(true) }
    expect(b.chapterNumbers).toEqual({ c1: 1, c2: 2, c3: 3 })
    // screen-only books never get blank pages
    const screen = assembleBook(right, (s) => flow(counts[s.id]), { insertBlanks: false })
    expect(screen.pages.some((p) => p.kind === 'blank')).toBe(false)
  })

  it('renders the contents page with dot leaders from the mapping', () => {
    const html = tocHtml(book.toc)
    expect(html).toContain('gb-toc-dots')
    expect(html).toContain('<span class="gb-toc-page">12</span>')
    expect(romanLower(14)).toBe('xiv')
  })
})
