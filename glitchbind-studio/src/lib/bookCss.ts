import type { BookSettings, CustomStyle } from '@/types'
import { fontStack } from './fonts'
import { inToPx, ptToPx, round } from './units'
import { resolveInsideMargin } from './kdp'

export interface PageGeometry {
  /** all values in CSS px at 96 px/in */
  trimW: number; trimH: number
  top: number; bottom: number; inside: number; outside: number
  contentW: number; contentH: number
  bleed: number
  insideIn: number
}
export function pageGeometry(s: BookSettings, pageCount: number): PageGeometry {
  const insideIn = resolveInsideMargin(s, pageCount)
  const trimW = inToPx(s.trim.w)
  const trimH = inToPx(s.trim.h)
  const top = inToPx(s.margins.top)
  const bottom = inToPx(s.margins.bottom)
  const inside = inToPx(insideIn)
  const outside = inToPx(s.margins.outside)
  return {
    trimW, trimH, top, bottom, inside, outside, insideIn,
    contentW: round(trimW - inside - outside, 3), contentH: round(trimH - top - bottom, 3),
    bleed: s.bleed ? inToPx(0.125) : 0,
  }
}

const cssString = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Everything that can change how text is laid out. Used as a cache key for pagination. */
export function layoutKey(s: BookSettings, geo: PageGeometry, customStyles: CustomStyle[]): string {
  return JSON.stringify([geo.contentW, geo.contentH, s.typography, s.footnotes, s.figureNumbers, s.widows, s.orphans, customStyles, geo.trimW, geo.trimH, geo.bleed])
}

export function bookVarsCss(s: BookSettings, geo: PageGeometry, customStyles: CustomStyle[]): string {
  const t = s.typography
  const vars: Record<string, string> = {
    '--gb-body-font': fontStack(t.bodyFont),
    '--gb-heading-font': fontStack(t.headingFont),
    '--gb-chapter-font': fontStack(t.chapterFont),
    '--gb-caption-font': fontStack(t.captionFont),
    '--gb-body-size': `${round(ptToPx(t.bodySize), 3)}px`,
    '--gb-body-weight': String(t.bodyWeight),
    '--gb-lh': String(t.lineHeight),
    '--gb-para-gap': `${t.paraSpacing}em`,
    '--gb-indent': `${t.indent}em`,
    '--gb-ls': `${t.letterSpacing}em`,
    '--gb-align': t.align,
    '--gb-hyphens': t.hyphenate ? 'auto' : 'manual',
    '--gb-dc': String(t.dropCapLines),
    '--gb-scene': cssString(t.sceneBreak),
    '--gb-chapter-size': `${round(ptToPx(t.chapterSize), 3)}px`,
    '--gb-chapter-align': t.chapterAlign,
    '--gb-chapter-case': t.chapterUppercase ? 'uppercase' : 'none',
    '--gb-sink': `${round(geo.contentH * t.chapterSink, 2)}px`,
    '--gb-text': s.colors.text,
    '--gb-accent': s.colors.accent,
    '--gb-highlight': s.colors.highlight,
    '--gb-paper': s.colors.page,
    '--gb-cw': `${geo.contentW}px`,
    '--gb-ch': `${geo.contentH}px`,
    '--gb-trim-w': `${geo.trimW}px`,
    '--gb-trim-h': `${geo.trimH}px`,
  }
  let css = `.gb-book{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}\n`
  for (const c of customStyles) {
    const d: string[] = []
    if (c.fontFamily) d.push(`font-family:${fontStack(c.fontFamily)}`)
    if (c.fontSize) d.push(`font-size:${c.fontSize}em`)
    if (c.fontWeight) d.push(`font-weight:${c.fontWeight}`)
    if (c.italic !== undefined) d.push(`font-style:${c.italic ? 'italic' : 'normal'}`)
    if (c.align) d.push(`text-align:${c.align}`)
    if (c.color) d.push(`color:${c.color}`)
    if (c.letterSpacing !== undefined) d.push(`letter-spacing:${c.letterSpacing}em`)
    if (c.lineHeight) d.push(`line-height:${c.lineHeight}`)
    if (c.indent === false) d.push('text-indent:0')
    if (c.spaceBefore !== undefined) d.push(`margin-top:${c.spaceBefore}em`)
    if (c.spaceAfter !== undefined) d.push(`margin-bottom:${c.spaceAfter}em`)
    if (c.uppercase) d.push('text-transform:uppercase')
    css += `.gb-book .gb-content p.gb-v-${c.id}{${d.join(';')}}\n`
  }
  return css
}

let styleEl: HTMLStyleElement | null = null
export function applyBookVars(css: string): void {
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'gb-book-vars'
    document.head.appendChild(styleEl)
  }
  if (styleEl.textContent !== css) styleEl.textContent = css
}
