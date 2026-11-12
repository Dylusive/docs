/**
 * A deterministic, DOM-free line breaker used ONLY by unit tests (Node has no layout engine).
 * It approximates proportional serif widths with per-class advance widths and greedy wrapping,
 * then emits the same `Unit[]` the browser measurer produces, so the real pagination core is
 * what gets tested. The live app never uses this — it measures the browser's own layout.
 */
import type { Unit } from './core'

const NARROW = new Set("iljtfrI.,;:'!|()[]‘’\"“” ".split(''))
const WIDE = new Set('mwMWGOQD—'.split(''))
export function advance(ch: string): number {
  if (ch === ' ') return 0.25
  if (NARROW.has(ch)) return 0.29
  if (WIDE.has(ch)) return 0.78
  if (ch >= 'A' && ch <= 'Z') return 0.64
  return 0.46
}
export const textWidthEm = (s: string): number => { let w = 0; for (const c of s) w += advance(c); return w }

export function wrapLines(text: string, widthPx: number, fontPx: number, indentPx = 0): number {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return 1
  let lines = 1
  let x = indentPx
  const space = advance(' ') * fontPx
  for (const word of words) {
    const w = textWidthEm(word) * fontPx
    if (x > indentPx || lines > 1 || x > 0) {
      if (x + (x > 0 ? space : 0) + w > widthPx && x > 0) { lines++; x = w; continue }
    }
    x += (x > 0 ? space : 0) + w
  }
  return lines
}

export interface EstBlock { kind: 'p' | 'h'; text: string }
export interface EstStyle { widthPx: number; fontPx: number; lineHeight: number; indentEm: number; headingScale: number; headingSpaceEm: number }

export function estimateUnits(blocks: EstBlock[], s: EstStyle): Unit[] {
  const units: Unit[] = []
  let y = 0
  let tb = 0
  blocks.forEach((b, bi) => {
    const isH = b.kind === 'h'
    const font = isH ? s.fontPx * s.headingScale : s.fontPx
    const lh = font * (isH ? 1.25 : s.lineHeight)
    if (isH && bi > 0) y += s.headingSpaceEm * font
    const n = wrapLines(b.text, s.widthPx, font, isH ? 0 : s.indentEm * font)
    for (let i = 0; i < n; i++) {
      units.push({
        src: 0, top: y, bottom: y + lh, startY: y, endY: y + lh, tb, line: i, lines: n,
        keepWithNext: isH && i === n - 1, noBreakBefore: isH && i > 0, forceBreakBefore: isH && i === 0 && bi > 0,
      })
      y += lh
    }
    if (isH) y += 0.6 * font
    tb++
  })
  return units
}
