/** HTML for the parts of a book the app writes itself: chapter openers, title page, copyright page, contents. */
import type { BookMeta, ChapterNumberStyle, Section, Typography } from '@/types'
import { escapeHtml } from './pagination/section'

const ONES = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
export function numberWord(n: number): string {
  if (n < 20) return ONES[n] ?? String(n)
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')
  return String(n)
}
export function roman(n: number, lower = false): string {
  if (n <= 0) return String(n)
  const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''
  for (const [v, s] of map) while (n >= v) { out += s; n -= v }
  return lower ? out.toLowerCase() : out
}
export function chapterLabel(n: number, style: ChapterNumberStyle): string {
  if (style === 'none') return ''
  if (style === 'word') return `Chapter ${numberWord(n)}`
  if (style === 'roman') return roman(n)
  return `Chapter ${n}`
}

export function openerHtml(section: Pick<Section, 'title' | 'numbered' | 'showTitle'>, chapterNo: number, t: Typography): string {
  if (!section.showTitle) return ''
  const label = section.numbered ? chapterLabel(chapterNo, t.chapterNumber) : ''
  return `<div class="gb-opener" data-mono data-keep-next>${label ? `<div class="gb-ch-label">${escapeHtml(label)}</div>` : ''}<div class="gb-ch-title">${escapeHtml(section.title) || '&nbsp;'}</div>${t.ornament ? `<div class="gb-ch-orn">${escapeHtml(t.ornament)}</div>` : ''}</div>`
}

export function titlePageHtml(meta: BookMeta, t: Typography, logoUrl: string | null): string {
  return `<div class="gb-titlepage" data-mono><div class="gb-tp-title">${escapeHtml(meta.title) || 'Untitled'}</div>${meta.subtitle ? `<div class="gb-tp-sub">${escapeHtml(meta.subtitle)}</div>` : ''}${t.ornament ? `<div class="gb-tp-orn">${escapeHtml(t.ornament)}</div>` : ''}${meta.author ? `<div class="gb-tp-author">${escapeHtml(meta.author)}</div>` : ''}<div class="gb-tp-foot">${logoUrl ? `<img class="gb-tp-logo" src="${logoUrl}" alt="${escapeHtml(meta.publisher)} logo">` : ''}${meta.publisher ? `<div>${escapeHtml(meta.publisher)}</div>` : ''}</div></div>`
}

/** The copyright page is always generated from Book Metadata — it is never typed twice. */
export function copyrightLines(meta: BookMeta): string[] {
  const lines: string[] = []
  const holder = meta.copyrightHolder || meta.author
  lines.push(`${meta.title}${meta.subtitle ? `: ${meta.subtitle}` : ''}`)
  lines.push(`Copyright © ${meta.copyrightYear}${holder ? ` ${holder}` : ''}`)
  if (meta.rights) lines.push(meta.rights)
  const ids: string[] = []
  if (meta.isbn13) ids.push(`ISBN-13: ${meta.isbn13}`)
  if (meta.isbn10) ids.push(`ISBN-10: ${meta.isbn10}`)
  if (ids.length) lines.push(ids.join('\n'))
  const pub: string[] = []
  if (meta.edition) pub.push(meta.edition)
  if (meta.publisher) pub.push(`Published by ${meta.publisher}`)
  if (pub.length) lines.push(pub.join('\n'))
  return lines
}
export const copyrightHtml = (meta: BookMeta): string =>
  `<div class="gb-copyright" data-mono>${copyrightLines(meta).map((l) => `<p>${escapeHtml(l)}</p>`).join('')}</div>`

export interface TocEntry { sectionId: string; label: string; title: string; page: string; minor: boolean }
export function tocHtml(entries: TocEntry[], heading = 'Contents'): string {
  const rows = entries.map((e) =>
    `<div class="gb-toc-row${e.minor ? ' gb-toc-minor' : ''}" data-mono data-toc="${e.sectionId}">${e.label ? `<span class="gb-toc-num">${escapeHtml(e.label)}</span>` : ''}<span class="gb-toc-title-text">${escapeHtml(e.title)}</span><span class="gb-toc-dots"></span><span class="gb-toc-page">${escapeHtml(e.page)}</span></div>`).join('')
  return `<div class="gb-toc-title" data-mono data-keep-next>${escapeHtml(heading)}</div>${rows}`
}
