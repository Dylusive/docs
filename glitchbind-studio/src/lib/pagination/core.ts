/**
 * GlitchBind pagination core — a pure function with no DOM access.
 *
 * Input: a flat list of "units" (one per laid-out line of text, or one per unbreakable block),
 * each with its vertical extent in the flow. Output: real pages, each a contiguous range of units.
 *
 * Rules enforced here:
 *  - a page never holds more than `pageHeight` of content (plus that page's footnotes)
 *  - widows / orphans: a paragraph may only split with ≥ `orphans` lines before and ≥ `widows` after
 *  - headings stay with the line that follows them (keepWithNext)
 *  - nothing splits inside a float's wrap zone (noBreakBefore) or an unbreakable block
 *  - forced page breaks, full-page illustrations and two-page spreads (which must start on a left page)
 */
export interface Unit {
  /** index of the source flow this unit came from (opener, main text, notes…) */
  src: number
  top: number
  bottom: number
  /** top including the padding/border of any container that starts with this unit */
  startY: number
  /** bottom including the padding/border of any container that ends with this unit */
  endY: number
  /** ordinal of the text block this line belongs to, or -1 for an unbreakable block */
  tb: number
  line: number
  lines: number
  keepWithNext?: boolean
  noBreakBefore?: boolean
  forceBreakBefore?: boolean
  /** footnote ids referenced on this unit */
  footnotes?: string[]
}

export interface PageFloat { id: string; atUnit: number; spread: boolean }

export interface CoreOptions {
  pageHeight: number
  orphans: number
  widows: number
  /** height a footnote occupies at the foot of a page; omit when notes are not set at page end */
  footnoteHeight?: (id: string) => number
  /** separator rule + spacing above the first footnote on a page */
  footnoteGap?: number
  /** true when the first page produced falls on a right-hand (recto) page */
  firstPageRecto?: boolean
}

export interface CoreSegment { src: number; from: number; to: number; y0: number; y1: number }
export type CorePageKind = 'flow' | 'float' | 'spread-left' | 'spread-right' | 'blank'
export interface CorePage {
  kind: CorePageKind
  from: number
  to: number
  segments: CoreSegment[]
  footnotes: string[]
  /** content height used, excluding footnotes */
  used: number
  footnoteHeight: number
  overflow: boolean
  /** true when no legal break existed and a widow/orphan/keep rule had to be broken */
  forced: boolean
  floatId?: string
}

const EPS = 0.75

export function segmentsOf(units: Unit[], from: number, to: number): CoreSegment[] {
  const segs: CoreSegment[] = []
  let cur: CoreSegment | null = null
  for (let i = from; i < to; i++) {
    const u = units[i]
    if (!cur || cur.src !== u.src) {
      cur = { src: u.src, from: i, to: i + 1, y0: u.startY, y1: u.endY }
      segs.push(cur)
    } else {
      cur.to = i + 1
      if (u.endY > cur.y1) cur.y1 = u.endY
    }
  }
  return segs
}

export function legalBreak(units: Unit[], i: number, orphans: number, widows: number): boolean {
  const u = units[i]
  if (u.forceBreakBefore) return true
  if (u.noBreakBefore) return false
  if (units[i - 1].keepWithNext) return false
  if (u.tb >= 0 && u.line > 0) {
    if (u.line < orphans || u.lines - u.line < widows) return false
  }
  return true
}

export function paginateUnits(units: Unit[], floats: PageFloat[], opts: CoreOptions): CorePage[] {
  const pages: CorePage[] = []
  const n = units.length
  const fnH = opts.footnoteHeight
  const gap = opts.footnoteGap ?? 0
  const pending = [...floats].sort((a, b) => a.atUnit - b.atUnit)
  const firstRecto = opts.firstPageRecto ?? true
  const nextIsRecto = (): boolean => (pages.length % 2 === 0) === firstRecto

  const measure = (from: number, to: number): { used: number; notes: string[]; noteH: number } => {
    let used = 0
    for (const s of segmentsOf(units, from, to)) used += s.y1 - s.y0
    const notes: string[] = []
    let noteH = 0
    if (fnH) {
      for (let i = from; i < to; i++) {
        const f = units[i].footnotes
        if (f) for (const id of f) if (!notes.includes(id)) { notes.push(id); noteH += fnH(id) }
      }
      if (notes.length) noteH += gap
    }
    return { used, notes, noteH }
  }
  const fits = (from: number, to: number): boolean => {
    const m = measure(from, to)
    return m.used + m.noteH <= opts.pageHeight + EPS
  }
  const blank = (at: number): CorePage => ({ kind: 'blank', from: at, to: at, segments: [], footnotes: [], used: 0, footnoteHeight: 0, overflow: false, forced: false })

  /** Emit every pending full-page figure anchored at or before `at`. Spreads wait for a left-hand page. */
  const flushFloats = (at: number, final: boolean): void => {
    while (pending.length && pending[0].atUnit <= at) {
      const f = pending[0]
      if (f.spread) {
        if (nextIsRecto()) {
          if (!final) return // let one more page of text run first, then try again
          pages.push(blank(at))
        }
        pages.push({ ...blank(at), kind: 'spread-left', floatId: f.id })
        pages.push({ ...blank(at), kind: 'spread-right', floatId: f.id })
      } else {
        pages.push({ ...blank(at), kind: 'float', floatId: f.id })
      }
      pending.shift()
    }
  }

  let a = 0
  while (a < n) {
    flushFloats(a, false)
    let b = a + 1
    while (b < n && !units[b].forceBreakBefore && fits(a, b + 1)) b++
    let forced = false
    if (b < n && !units[b].forceBreakBefore) {
      let k = b
      while (k > a && !legalBreak(units, k, opts.orphans, opts.widows)) k--
      if (k > a) b = k
      else forced = b > a + 1 || !legalBreak(units, b, opts.orphans, opts.widows)
    }
    const m = measure(a, b)
    pages.push({
      kind: 'flow', from: a, to: b, segments: segmentsOf(units, a, b), footnotes: m.notes,
      used: m.used, footnoteHeight: m.noteH, overflow: m.used + m.noteH > opts.pageHeight + EPS, forced,
    })
    a = b
  }
  flushFloats(Number.POSITIVE_INFINITY, true)
  return pages
}

/** Rule audit used by tests and preflight: returns the indices of pages that begin or end badly. */
export function auditPages(units: Unit[], pages: CorePage[], orphans: number, widows: number): { page: number; reason: string }[] {
  const out: { page: number; reason: string }[] = []
  pages.forEach((p, idx) => {
    if (p.kind !== 'flow' || p.from === 0) return
    const u = units[p.from]
    if (u.forceBreakBefore) return
    if (u.tb >= 0 && u.line > 0) {
      if (u.lines - u.line < widows) out.push({ page: idx, reason: 'widow' })
      else if (u.line < orphans) out.push({ page: idx - 1, reason: 'orphan' })
    }
    if (units[p.from - 1].keepWithNext) out.push({ page: idx - 1, reason: 'stranded heading' })
  })
  return out
}
