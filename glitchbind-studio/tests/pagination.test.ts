import { describe, expect, it } from 'vitest'
import { FIXTURE, FIXTURE_WORDS } from '@/lib/pagination/fixture'
import { auditPages, legalBreak, paginateUnits, type Unit } from '@/lib/pagination/core'
import { estimateUnits, type EstBlock } from '@/lib/pagination/textMeasure'
import { defaultSettings } from '@/lib/defaults'
import { pageGeometry } from '@/lib/bookCss'
import { trimById } from '@/lib/kdp'
import { ptToPx } from '@/lib/units'

const blocks: EstBlock[] = FIXTURE.map((b) => (b.h ? { kind: 'h', text: b.h } : { kind: 'p', text: b.p ?? '' }))

function paginateAt(trimId: string) {
  const t = trimById(trimId)!
  const s = { ...defaultSettings(), trimId, trim: { w: t.w, h: t.h } }
  const geo = pageGeometry(s, 40)
  const units = estimateUnits(blocks, { widthPx: geo.contentW, fontPx: ptToPx(s.typography.bodySize), lineHeight: s.typography.lineHeight, indentEm: s.typography.indent, headingScale: 1.7, headingSpaceEm: 1.3 })
  const pages = paginateUnits(units, [], { pageHeight: geo.contentH, orphans: 2, widows: 2 })
  return { units, pages, geo }
}

describe('pagination engine', () => {
  it('fixture is exactly 10,000 words of prose', () => {
    const words = FIXTURE.reduce((n, b) => n + (b.p ? b.p.split(/\s+/).filter(Boolean).length : 0), 0)
    expect(words).toBe(FIXTURE_WORDS)
    expect(words).toBe(10000)
  })

  it('gives different, correctly ordered page counts at 6×9 and 5.5×8.5', () => {
    const a = paginateAt('6x9')
    const b = paginateAt('5.5x8.5')
    console.log(`[vitest] 10k-word fixture → 6×9: ${a.pages.length} pages · 5.5×8.5: ${b.pages.length} pages`)
    expect(a.pages.length).toBeGreaterThan(20)
    expect(a.pages.length).toBeLessThan(60)
    expect(b.pages.length).toBeGreaterThan(a.pages.length)
    // a smaller text block means more lines AND fewer lines per page
    expect(b.units.length).toBeGreaterThan(a.units.length)
  })

  it('places every line on exactly one page, in order, without overflow', () => {
    for (const id of ['6x9', '5.5x8.5']) {
      const { units, pages, geo } = paginateAt(id)
      let next = 0
      for (const p of pages) {
        expect(p.from).toBe(next)
        expect(p.to).toBeGreaterThan(p.from)
        expect(p.used).toBeLessThanOrEqual(geo.contentH + 0.75)
        expect(p.overflow).toBe(false)
        next = p.to
      }
      expect(next).toBe(units.length)
    }
  })

  it('never leaves a widow, an orphan or a stranded heading', () => {
    for (const id of ['6x9', '5.5x8.5', '5x8', 'a4']) {
      const { units, pages } = paginateAt(id)
      expect(auditPages(units, pages, 2, 2)).toEqual([])
      expect(pages.some((p) => p.forced)).toBe(false)
    }
  })

  it('honours forced breaks, keep-with-next and footnote space', () => {
    const line = (tb: number, i: number, n: number, y: number, extra: Partial<Unit> = {}): Unit => ({ src: 0, top: y, bottom: y + 10, startY: y, endY: y + 10, tb, line: i, lines: n, ...extra })
    // heading (1 line) then a 6-line paragraph; page fits 4 lines → the heading must not be stranded
    const units: Unit[] = [line(0, 0, 3, 0), line(0, 1, 3, 10), line(0, 2, 3, 20), line(1, 0, 1, 30, { keepWithNext: true }), ...[0, 1, 2, 3, 4, 5].map((i) => line(2, i, 6, 40 + i * 10))]
    const pages = paginateUnits(units, [], { pageHeight: 50, orphans: 2, widows: 2 })
    expect(pages[0].to).toBe(3) // heading moved to page 2 with its paragraph
    expect(legalBreak(units, 4, 2, 2)).toBe(false)
    // footnotes reserve room at the foot of the page
    const withNote = units.map((u, i) => (i === 1 ? { ...u, footnotes: ['a'] } : u))
    const p2 = paginateUnits(withNote, [], { pageHeight: 50, orphans: 2, widows: 2, footnoteHeight: () => 15, footnoteGap: 5 })
    expect(p2[0].footnotes).toEqual(['a'])
    expect(p2[0].used + p2[0].footnoteHeight).toBeLessThanOrEqual(50.75)
    // forced break
    const forced = units.map((u, i) => (i === 2 ? { ...u, forceBreakBefore: true } : u))
    expect(paginateUnits(forced, [], { pageHeight: 500, orphans: 2, widows: 2 })[0].to).toBe(2)
  })

  it('puts two-page spreads on a left-hand page and full-page figures after the current page', () => {
    const units: Unit[] = Array.from({ length: 12 }, (_, i) => ({ src: 0, top: i * 10, bottom: i * 10 + 10, startY: i * 10, endY: i * 10 + 10, tb: i, line: 0, lines: 1 }))
    const pages = paginateUnits(units, [{ id: 'spread', atUnit: 1, spread: true }, { id: 'plate', atUnit: 9, spread: false }], { pageHeight: 40, orphans: 2, widows: 2, firstPageRecto: true })
    const kinds = pages.map((p) => p.kind)
    const left = kinds.indexOf('spread-left')
    expect(left % 2).toBe(1) // physical index 1, 3, 5… are left-hand pages when the first page is a recto
    expect(kinds[left + 1]).toBe('spread-right')
    expect(kinds.filter((k) => k === 'float').length).toBe(1)
    expect(pages.filter((p) => p.kind === 'flow').reduce((n, p) => n + (p.to - p.from), 0)).toBe(12)
  })
})
