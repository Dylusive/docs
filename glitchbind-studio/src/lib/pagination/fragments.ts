/**
 * Turns a range of measured units into the static HTML for one page slice.
 * Blocks that straddle a page are genuinely split at the measured line boundary (Range.cloneContents),
 * so every page owns real text — nothing is clipped or duplicated in the printed file.
 */
import type { Measured } from './measure'
import { endsHyphenated, textPointAtLine } from './measure'

const STRIP_CLASSES = ['ProseMirror-selectednode', 'gb-find', 'gb-find-current', 'gb-focus-current', 'has-focus']

const depthOf = (el: Element, root: Element): number => {
  let d = 0
  for (let n: Element | null = el; n && n !== root; n = n.parentElement) d++
  return d
}
const ancestorAtDepth = (el: Element, root: Element, depth: number): Element => {
  const chain: Element[] = []
  for (let n: Element | null = el; n && n !== root; n = n.parentElement) chain.unshift(n)
  return chain[depth - 1]
}
const childIndex = (el: Node): number => Array.prototype.indexOf.call(el.parentNode?.childNodes ?? [], el)

export function sliceHtml(m: Measured, from: number, to: number): string {
  const { root, units } = m
  if (from >= to) return ''
  const range = document.createRange()
  const first = units[from]
  const startsMid = first.tb >= 0 && first.line > 0
  if (startsMid) {
    const p = textPointAtLine(first.el, first.clientTop)
    range.setStart(p.node, p.offset)
  } else range.setStart(first.startEl.parentNode as Node, childIndex(first.startEl))

  let endsMid = false
  let hyphen = false
  const next = to < units.length ? units[to] : null
  if (!next) range.setEnd(root, root.childNodes.length)
  else if (next.tb >= 0 && next.line > 0) {
    endsMid = true
    const end = endsHyphenated(next)
    range.setEnd(end.point.node, end.point.offset)
    hyphen = end.hyphen
  } else range.setEnd(next.startEl.parentNode as Node, childIndex(next.startEl))

  const holder = document.createElement('div')
  holder.appendChild(range.cloneContents())

  // ---- start of slice: mark the chain of containers that continue from the previous page
  const startDepth = startsMid ? depthOf(first.el, root) : depthOf(first.startEl, root) - 1
  let node: Element | null = holder
  for (let d = 1; d <= startDepth && node; d++) {
    node = node.firstElementChild
    if (!node) break
    node.classList.add('gb-split-tail')
    const orig = ancestorAtDepth(startsMid ? first.el : first.startEl, root, d)
    if (orig.tagName === 'OL') {
      const path = ancestorAtDepth(startsMid ? first.el : first.startEl, root, d + 1)
      const base = parseInt(orig.getAttribute('start') ?? '1', 10) || 1
      const idx = Array.from(orig.children).filter((c) => c.tagName === 'LI').indexOf(path)
      if (idx >= 0) node.setAttribute('start', String(base + idx))
    }
  }
  const firstTop = Array.from(holder.children).find((c) => !c.hasAttribute('data-anchor'))
  if (firstTop) {
    firstTop.classList.add('gb-first')
    if (startDepth === 0) {
      const orig = ancestorAtDepth(first.startEl, root, 1)
      if (orig) (firstTop as HTMLElement).style.textIndent = getComputedStyle(orig).textIndent
    }
  }

  // ---- end of slice: mark the chain of containers that continue onto the next page
  if (next) {
    const endDepth = endsMid ? depthOf(next.el, root) : depthOf(next.startEl, root) - 1
    node = holder
    for (let d = 1; d <= endDepth && node; d++) {
      node = node.lastElementChild
      if (!node) break
      node.classList.add('gb-split-head')
    }
    if (endsMid && node) {
      if (getComputedStyle(next.el).textAlign === 'justify') node.classList.add('gb-split-head-j')
      if (hyphen) {
        // Last resort (the engine avoids ending a page on a hyphen): show the hyphen ourselves.
        // It hangs slightly into the margin so it can never push the fragment onto another line.
        let last: Node = node
        while (last.lastChild) last = last.lastChild
        if (last.nodeType === Node.TEXT_NODE) (last as Text).data = (last as Text).data.replace(/\u00AD$/, '')
        const span = document.createElement('span')
        span.className = 'gb-hy'
        span.textContent = '-'
        if (last.nodeType === Node.TEXT_NODE) last.parentNode?.insertBefore(span, last.nextSibling)
        else node.appendChild(span)
      }
    }
  }

  // ---- strip editor-only artefacts
  holder.querySelectorAll('[contenteditable],[draggable]').forEach((el) => { el.removeAttribute('contenteditable'); el.removeAttribute('draggable') })
  holder.querySelectorAll(STRIP_CLASSES.map((c) => '.' + c).join(',')).forEach((el) => el.classList.remove(...STRIP_CLASSES))
  holder.querySelectorAll('.ProseMirror-gapcursor,.ProseMirror-widget,.ProseMirror-separator').forEach((el) => el.remove())
  return holder.innerHTML
}
