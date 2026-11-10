/**
 * DOM measurer: reads the browser's own layout of a content flow and turns it into pagination units.
 * One unit per laid-out line of every text block; one unit per unbreakable block (figure, table row…).
 * Works on hidden (visibility:hidden) hosts and on the live editor, at any CSS zoom transform.
 */
import type { PageFloat, Unit } from './core'

export interface MUnit extends Unit {
  /** the text block or unbreakable element this unit belongs to */
  el: Element
  /** outermost element that begins with this unit (the unit's own block or an enclosing container) */
  startEl: Element
  /** client-space Y of the line top, used to find the split point of lines > 0 */
  clientTop: number
}
export interface BehindAnchor { id: string; atUnit: number; el: Element }
export interface Measured {
  root: HTMLElement
  units: MUnit[]
  floats: (PageFloat & { el: Element })[]
  behind: BehindAnchor[]
  /** footnote ids in document order, with the text stored on each reference */
  footnotes: { id: string; text: string }[]
  /** number of footnote refs / numbered figures before each unit (prefix counts) */
  fnBefore: number[]
  figBefore: number[]
  height: number
}

const TEXT_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'])
const MONO_TAGS = new Set(['FIGURE', 'TR', 'HR', 'IMG', 'SVG'])
const isTextblock = (el: Element): boolean => TEXT_TAGS.has(el.tagName) || el.hasAttribute('data-tb')
const isMono = (el: Element): boolean => MONO_TAGS.has(el.tagName) || el.hasAttribute('data-mono')
const isHeading = (el: Element): boolean => /^H[1-6]$/.test(el.tagName) || el.hasAttribute('data-keep-next')

interface Line { top: number; bottom: number }

function clusterLines(el: Element): Line[] {
  const range = document.createRange()
  range.selectNodeContents(el)
  const rects = Array.from(range.getClientRects()).filter((r) => r.height > 0.5).sort((a, b) => a.top - b.top)
  const lines: Line[] = []
  for (const r of rects) {
    const last = lines[lines.length - 1]
    if (last && r.top < last.bottom - Math.min(r.height, last.bottom - last.top) * 0.5) {
      if (r.bottom > last.bottom) last.bottom = r.bottom
    } else lines.push({ top: r.top, bottom: r.bottom })
  }
  return lines
}

export function measureFlow(root: HTMLElement, src: number): Measured {
  const rootRect = root.getBoundingClientRect()
  const scale = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1
  const Y = (clientY: number): number => (clientY - rootRect.top) / scale
  const units: MUnit[] = []
  const floats: Measured['floats'] = []
  const behind: BehindAnchor[] = []
  const floatUnits: number[] = []
  let tbCount = 0
  let pendingBreak = false

  const push = (u: Omit<MUnit, 'src' | 'startY' | 'endY'>): void => {
    const unit = { ...u, src, startY: u.top, endY: u.bottom } as MUnit
    if (pendingBreak) { unit.forceBreakBefore = true; pendingBreak = false }
    units.push(unit)
  }

  const textblock = (el: Element): void => {
    const rect = el.getBoundingClientRect()
    if (rect.height < 0.5) return
    const cs = getComputedStyle(el)
    const padTop = (parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth)) * scale
    const padBottom = (parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth)) * scale
    const contentTop = rect.top + padTop
    const contentH = rect.height - padTop - padBottom
    const lh = parseFloat(cs.lineHeight) * scale
    let bounds: number[] | null = null // n+1 client-space boundaries
    if (lh > 0 && !el.classList.contains('gb-dropcap')) {
      const n = Math.round(contentH / lh)
      if (n >= 1 && Math.abs(n * lh - contentH) < 0.6) {
        bounds = []
        for (let i = 0; i <= n; i++) bounds.push(contentTop + i * lh)
      }
    }
    if (!bounds) {
      const lines = clusterLines(el)
      if (lines.length <= 1) bounds = [contentTop, contentTop + contentH]
      else {
        bounds = [contentTop]
        for (let i = 1; i < lines.length; i++) bounds.push((lines[i - 1].bottom + lines[i].top) / 2)
        bounds.push(contentTop + contentH)
      }
    }
    const n = bounds.length - 1
    bounds[0] = rect.top
    bounds[n] = rect.bottom
    const heading = isHeading(el)
    const tb = tbCount++
    const first = units.length
    for (let i = 0; i < n; i++) {
      push({
        el, startEl: el, clientTop: bounds[i], top: Y(bounds[i]), bottom: Y(bounds[i + 1]), tb, line: i, lines: n,
        keepWithNext: heading && i === n - 1 ? true : undefined,
        noBreakBefore: heading && i > 0 ? true : undefined,
      })
    }
    const refs = el.querySelectorAll('[data-fn-id]')
    refs.forEach((ref) => {
      const r = ref.getBoundingClientRect()
      const mid = (r.top + r.bottom) / 2
      let li = 0
      while (li < n - 1 && mid >= bounds![li + 1]) li++
      const u = units[first + li]
      ;(u.footnotes ??= []).push(ref.getAttribute('data-fn-id') ?? '')
    })
  }

  const mono = (el: Element): void => {
    const rect = el.getBoundingClientRect()
    if (rect.height < 0.5) return
    const isFloat = getComputedStyle(el).float !== 'none'
    if (isFloat) floatUnits.push(units.length)
    const refs = Array.from(el.querySelectorAll('[data-fn-id]')).map((r) => r.getAttribute('data-fn-id') ?? '')
    push({
      el, startEl: el, clientTop: rect.top, top: Y(rect.top), bottom: Y(rect.bottom), tb: -1, line: 0, lines: 1,
      keepWithNext: isHeading(el) ? true : undefined, footnotes: refs.length ? refs : undefined,
    })
  }

  const walk = (parent: Element): void => {
    for (const el of Array.from(parent.children)) {
      const anchor = el.getAttribute('data-anchor')
      if (anchor) {
        const id = el.getAttribute('data-fig-id') ?? ''
        if (anchor === 'page') floats.push({ id, atUnit: units.length, spread: el.getAttribute('data-spread') === 'true', el })
        else if (anchor === 'behind') behind.push({ id, atUnit: units.length, el })
        else if (anchor === 'break') pendingBreak = true
        continue
      }
      if (isTextblock(el)) textblock(el)
      else if (isMono(el)) mono(el)
      else {
        const start = units.length
        walk(el)
        if (units.length > start) {
          const rect = el.getBoundingClientRect()
          const a = units[start]
          const b = units[units.length - 1]
          if (Y(rect.top) < a.startY) a.startY = Y(rect.top)
          a.startEl = el
          if (Y(rect.bottom) > b.endY) b.endY = Y(rect.bottom)
        } else if (el.getBoundingClientRect().height > 0.5) mono(el)
      }
    }
  }
  walk(root)

  // Text beside a floated figure cannot be split from it: forbid breaks until the float's bottom edge.
  for (const fi of floatUnits) {
    const f = units[fi]
    for (let j = fi + 1; j < units.length && units[j].top < f.bottom - 0.5; j++) units[j].noBreakBefore = true
  }

  const footnotes: Measured['footnotes'] = []
  const fnBefore: number[] = []
  const figBefore: number[] = []
  let fn = 0
  let fig = 0
  const seenFig = new Set<Element>()
  for (const u of units) {
    fnBefore.push(fn)
    figBefore.push(fig)
    if (u.footnotes) fn += u.footnotes.length
    if (!seenFig.has(u.el)) {
      seenFig.add(u.el)
      fig += u.el.matches('figure[data-numbered]') ? 1 : u.tb < 0 ? u.el.querySelectorAll('figure[data-numbered]').length : 0
    }
  }
  root.querySelectorAll('[data-fn-id]').forEach((ref) => {
    footnotes.push({ id: ref.getAttribute('data-fn-id') ?? '', text: ref.getAttribute('data-fn-text') ?? '' })
  })
  return { root, units, floats, behind, footnotes, fnBefore, figBefore, height: Y(rootRect.bottom) }
}

/** Text nodes of a block in order, skipping atoms. */
function textNodes(el: Element): Text[] {
  const out: Text[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) out.push(node as Text)
  return out
}

/** DOM point of the first character laid out on the line whose top edge is `clientTop`. */
export function textPointAtLine(el: Element, clientTop: number): { node: Node; offset: number; charIndex: number; text: string } {
  const nodes = textNodes(el)
  const starts: number[] = []
  let total = 0
  for (const t of nodes) { starts.push(total); total += t.data.length }
  const text = nodes.map((t) => t.data).join('')
  const range = document.createRange()
  const locate = (c: number): { node: Text; offset: number } => {
    let lo = 0
    let hi = nodes.length - 1
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= c) lo = mid; else hi = mid - 1 }
    return { node: nodes[lo], offset: c - starts[lo] }
  }
  /** true when character c (or the next one that has a box) sits on or below the target line */
  const after = (c: number): boolean => {
    for (let k = c; k < total && k < c + 6; k++) {
      const p = locate(k)
      range.setStart(p.node, p.offset)
      range.setEnd(p.node, p.offset + 1)
      const r = range.getClientRects()[0]
      if (r && r.height > 0) return (r.top + r.bottom) / 2 > clientTop
    }
    return true
  }
  let lo = 0
  let hi = total
  while (lo < hi) { const mid = (lo + hi) >> 1; if (after(mid)) hi = mid; else lo = mid + 1 }
  if (lo >= total) {
    const last = nodes[nodes.length - 1]
    return last ? { node: last, offset: last.data.length, charIndex: total, text } : { node: el, offset: el.childNodes.length, charIndex: 0, text }
  }
  const p = locate(lo)
  return { node: p.node, offset: p.offset, charIndex: lo, text }
}

const WORD_CHAR = /\p{L}/u
/** Does the line before `unit` end in the middle of a word (an automatic or soft hyphen)? */
export function endsHyphenated(unit: MUnit): { hyphen: boolean; point: ReturnType<typeof textPointAtLine> } {
  const point = textPointAtLine(unit.el, unit.clientTop)
  const before = point.text[point.charIndex - 1] ?? ''
  const after = point.text[point.charIndex] ?? ''
  return { hyphen: (WORD_CHAR.test(before) && WORD_CHAR.test(after)) || before === '\u00AD', point }
}
