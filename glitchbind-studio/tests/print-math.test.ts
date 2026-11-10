import { describe, expect, it } from 'vitest'
import { coverDpi, dpiLevel, effectiveDpi } from '@/lib/dpi'
import { KDP_GUTTER_TABLE, coverGeometry, gutterBand, kdpGutter, resolveInsideMargin, spineWidth, TRIM_SIZES, PRESETS } from '@/lib/kdp'
import { defaultSettings } from '@/lib/defaults'
import { pageGeometry } from '@/lib/bookCss'
import { defaultCoverItems, reflowCover } from '@/lib/cover'
import { blankProject } from '@/lib/defaults'

describe('DPI guardian', () => {
  it('computes effective DPI at the placed size', () => {
    expect(effectiveDpi(1800, 1, 6)).toBe(300)
    expect(effectiveDpi(1800, 0.5, 6)).toBe(150) // cropping to half the width halves the pixels on show
    expect(effectiveDpi(420, 1, 1.75)).toBe(240)
    expect(effectiveDpi(1000, 1, 0)).toBe(0)
  })
  it('classifies amber below 300 and red below 150, never flags vectors', () => {
    expect(dpiLevel(300, 'image/jpeg')).toBe('ok')
    expect(dpiLevel(299, 'image/jpeg')).toBe('amber')
    expect(dpiLevel(150, 'image/png')).toBe('amber')
    expect(dpiLevel(149, 'image/png')).toBe('red')
    expect(dpiLevel(10, 'image/svg+xml')).toBe('vector')
  })
  it('uses the tighter axis for full-bleed pages', () => {
    // 1250×1850 px covering 6.125×9.25 in: width needs 204 px/in, height 200 px/in → 200
    expect(coverDpi(1250, 1850, 6.125, 9.25)).toBe(200)
    expect(coverDpi(3000, 1000, 6, 9)).toBe(111)
  })
})

describe('KDP gutter table', () => {
  it('matches Amazon’s published bands exactly', () => {
    expect(KDP_GUTTER_TABLE.map((b) => [b.min, b.max, b.inside])).toEqual([[24, 150, 0.375], [151, 300, 0.5], [301, 500, 0.625], [501, 700, 0.75], [701, 828, 0.875]])
    const cases: [number, number][] = [[24, 0.375], [150, 0.375], [151, 0.5], [300, 0.5], [301, 0.625], [500, 0.625], [501, 0.75], [700, 0.75], [701, 0.875], [828, 0.875]]
    for (const [pages, inside] of cases) expect(kdpGutter(pages)).toBe(inside)
    expect(kdpGutter(10)).toBe(0.375)
    expect(gutterBand(9999).inside).toBe(0.875)
  })
  it('auto gutter = band + comfort and changes when the book crosses 150 pages', () => {
    const s = defaultSettings()
    expect(resolveInsideMargin(s, 150)).toBe(0.625)
    expect(resolveInsideMargin(s, 151)).toBe(0.75)
    expect(resolveInsideMargin({ ...s, autoGutter: false, margins: { ...s.margins, inside: 0.9 } }, 400)).toBe(0.9)
    // the text block narrows by exactly the extra gutter
    expect(pageGeometry(s, 150).contentW - pageGeometry(s, 151).contentW).toBeCloseTo(0.125 * 96, 5)
  })
  it('every preset keeps outer margins at or above the 0.25 in minimum', () => {
    for (const p of PRESETS) {
      const s = p.apply(defaultSettings())
      expect(Math.min(s.margins.top, s.margins.bottom, s.margins.outside)).toBeGreaterThanOrEqual(0.25)
    }
    expect(TRIM_SIZES.map((t) => t.id)).toEqual(['5x8', '5.25x8', '5.5x8.5', '6x9', '6.14x9.21', '7x10', '8x10', '8.5x11', 'a5', 'a4'])
  })
})

describe('spine and cover geometry', () => {
  it('spine width = pages × paper thickness', () => {
    expect(spineWidth(300, 'white')).toBeCloseTo(0.6756, 4)
    expect(spineWidth(300, 'cream')).toBeCloseTo(0.75, 4)
  })
  it('full wrap = bleed + back + spine + front + bleed', () => {
    const g = coverGeometry(6, 9, 300, 'cream')
    expect(g.width).toBeCloseTo(0.125 + 6 + 0.75 + 6 + 0.125, 4)
    expect(g.height).toBeCloseTo(9.25, 4)
    expect(g.frontX).toBeCloseTo(6.875, 4)
  })
  it('cover items stay attached to their panel when the spine grows', () => {
    const p = blankProject('T', 'A')
    const g1 = coverGeometry(6, 9, 100, 'cream')
    const cover = { ...p.cover, items: defaultCoverItems(p, g1, 100), laidOutFor: { trimW: 6, trimH: 9, spine: g1.spine } }
    const g2 = coverGeometry(6, 9, 400, 'cream')
    const next = reflowCover(cover, g2)
    const title1 = cover.items.find((i) => i.bind === 'title' && i.panel === 'front')!
    const title2 = next.items.find((i) => i.id === title1.id)!
    expect(title2.x - g2.frontX).toBeCloseTo(title1.x - g1.frontX, 4)
    const spine2 = next.items.find((i) => i.panel === 'spine')!
    expect(spine2.w).toBeCloseTo(g2.spine, 4)
    const bar1 = cover.items.find((i) => i.type === 'barcode')!
    const bar2 = next.items.find((i) => i.type === 'barcode')!
    expect(g2.spineX - bar2.x).toBeCloseTo(g1.spineX - bar1.x, 4)
    expect(reflowCover(next, g2)).toBe(next)
  })
})
