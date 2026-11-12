/** Import .txt / .md / .docx manuscripts, splitting chapters on "Chapter X" lines or top-level headings. */
import type { PMDoc, Section } from '@/types'
import { makeSection } from './defaults'
import { escapeHtml } from './pagination/section'

export interface ImportedChapter { title: string; html: string }

const CHAPTER_LINE = /^\s*(chapter|part|book)\s+([0-9]+|[ivxlcdm]+|[a-z-]+)\b[\s.:—–-]*(.*)$|^\s*(prologue|epilogue|introduction|preface|foreword|afterword)\s*$/i

/** "Chapter 3: The Storm" → "The Storm"; "CHAPTER THREE" → "Chapter Three". */
export function chapterTitleFrom(line: string): string | null {
  const text = line.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  if (!text || text.length > 90) return null
  const m = CHAPTER_LINE.exec(text)
  if (!m) return null
  if (m[4]) return m[4].charAt(0).toUpperCase() + m[4].slice(1).toLowerCase()
  const rest = (m[3] ?? '').trim()
  if (rest) return rest
  const n = m[2]
  const num = /^\d+$/.test(n) ? n : /^[ivxlcdm]+$/i.test(n) && !/^(mix|mid|civil|dim|lid|mild|vivid|did|ill)$/i.test(n) ? n.toUpperCase() : n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
  return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} ${num}`
}

const inlineMd = (s: string): string =>
  escapeHtml(s)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_m, a: string, b: string) => `<strong>${a ?? b}</strong>`)
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*|(^|[^_\w])_(?!\s)(.+?)_/g, (_m, p1: string, a: string, p2: string, b: string) => `${p1 ?? p2 ?? ''}<em>${a ?? b}</em>`)
    .replace(/~~(.+?)~~/g, '<s>$1</s>')

/** Plain text: paragraphs are separated by blank lines; chapter lines start a new chapter. */
export function parsePlainText(text: string, fallbackTitle = 'Imported Text'): ImportedChapter[] {
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean)
  // manuscripts that use one line per paragraph (no blank lines) are split on single newlines instead
  const paras = blocks.length <= 2 && text.split('\n').filter((l) => l.trim()).length > 6 ? text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean) : blocks
  const chapters: ImportedChapter[] = []
  let cur: ImportedChapter | null = null
  for (const p of paras) {
    const firstLine = p.split('\n')[0]
    const title = chapterTitleFrom(firstLine)
    if (title) {
      cur = { title, html: '' }
      chapters.push(cur)
      const rest = p.split('\n').slice(1).join(' ').trim()
      if (rest) cur.html += `<p>${escapeHtml(rest)}</p>`
      continue
    }
    if (!cur) { cur = { title: fallbackTitle, html: '' }; chapters.push(cur) }
    if (/^(\*\s*){3,}$|^#{1,3}$|^[-–—]{3,}$/.test(p)) cur.html += '<div data-scene></div>'
    else cur.html += `<p>${escapeHtml(p.replace(/\s*\n\s*/g, ' '))}</p>`
  }
  return chapters
}

/** Markdown: `# Heading` starts a chapter; `##`/`###` become in-chapter headings. */
export function parseMarkdown(text: string, fallbackTitle = 'Imported Text'): ImportedChapter[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const chapters: ImportedChapter[] = []
  let cur: ImportedChapter | null = null
  let para: string[] = []
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null
  let quote: string[] = []
  const need = (): ImportedChapter => { if (!cur) { cur = { title: fallbackTitle, html: '' }; chapters.push(cur) } return cur }
  const flush = (): void => {
    if (para.length) { need().html += `<p>${inlineMd(para.join(' '))}</p>`; para = [] }
    if (list) { need().html += `<${list.type}>${list.items.map((i) => `<li><p>${inlineMd(i)}</p></li>`).join('')}</${list.type}>`; list = null }
    if (quote.length) { need().html += `<blockquote><p>${inlineMd(quote.join(' '))}</p></blockquote>`; quote = [] }
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    const h = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line)
    if (h) {
      flush()
      if (h[1].length === 1) { cur = { title: chapterTitleFrom(h[2]) ?? h[2].replace(/[*_]/g, ''), html: '' }; chapters.push(cur) }
      else need().html += `<h${Math.min(3, h[1].length - 1)}>${inlineMd(h[2])}</h${Math.min(3, h[1].length - 1)}>`
      continue
    }
    if (!line.trim()) { flush(); continue }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); need().html += '<div data-scene></div>'; continue }
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line)
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const bq = /^\s*>\s?(.*)$/.exec(line)
    if (ul || ol) {
      const type = ul ? 'ul' : 'ol'
      if (para.length || quote.length || (list && list.type !== type)) flush()
      list ??= { type, items: [] }
      list.items.push((ul ?? ol)![1])
      continue
    }
    if (bq) { if (para.length || list) flush(); quote.push(bq[1]); continue }
    if (list || quote.length) flush()
    const title = !para.length ? chapterTitleFrom(line) : null
    if (title && !cur?.html) { cur = { title, html: '' }; chapters.push(cur); continue }
    para.push(line.trim())
  }
  flush()
  return chapters
}

/** HTML from a word processor: Heading 1 (or a "Chapter X" paragraph) starts a chapter. */
export function splitHtmlChapters(html: string, fallbackTitle = 'Imported Document'): ImportedChapter[] {
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  const chapters: ImportedChapter[] = []
  let cur: ImportedChapter | null = null
  for (const node of Array.from(tpl.content.childNodes)) {
    const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : null
    const text = (node.textContent ?? '').trim()
    if (el && el.tagName === 'H1') { cur = { title: chapterTitleFrom(text) ?? text ?? fallbackTitle, html: '' }; chapters.push(cur); continue }
    if (el && el.tagName === 'P' && !el.querySelector('img')) {
      const title = chapterTitleFrom(text)
      if (title && text.length < 60) { cur = { title, html: '' }; chapters.push(cur); continue }
    }
    if (!el && !text) continue
    if (!cur) { cur = { title: fallbackTitle, html: '' }; chapters.push(cur) }
    if (el && /^H[2-6]$/.test(el.tagName)) { const l = Math.min(3, parseInt(el.tagName[1], 10) - 1); cur.html += `<h${l}>${el.innerHTML}</h${l}>` }
    else cur.html += el ? el.outerHTML : `<p>${escapeHtml(text)}</p>`
  }
  return chapters.filter((c) => c.html || c.title)
}

export interface ImportResult { sections: Section[]; images: number; note: string }

export async function importManuscript(file: File, storeImage: (blob: Blob, name: string) => Promise<string>, toDoc: (html: string) => PMDoc): Promise<ImportResult> {
  const name = file.name.replace(/\.[^.]+$/, '')
  const ext = file.name.split('.').pop()?.toLowerCase()
  let chapters: ImportedChapter[]
  let images = 0
  if (ext === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser')
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    let html = result.value
    // embedded pictures arrive as data: URLs — store each original and swap in a figure
    const found = Array.from(html.matchAll(/<img[^>]*src="(data:image\/[^"]+)"[^>]*>/g))
    for (const m of found) {
      const blob = await (await fetch(m[1])).blob()
      const id = await storeImage(blob, `${name}-image-${++images}.${blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'}`)
      const alt = /alt="([^"]*)"/.exec(m[0])?.[1] ?? ''
      html = html.replace(m[0], `</p><figure data-fig='${JSON.stringify({ imageId: id, widthIn: 3.5, wrap: 'inline', alt }).replace(/'/g, '&#39;')}'></figure><p>`)
    }
    html = html.replace(/<p>\s*<\/p>/g, '')
    chapters = splitHtmlChapters(html, name)
  } else if (ext === 'md' || ext === 'markdown') chapters = parseMarkdown(await file.text(), name)
  else chapters = parsePlainText(await file.text(), name)
  if (!chapters.length) throw new Error('No text was found in that file.')
  const sections = chapters.map((c) => ({ ...makeSection('chapter', c.title || 'Untitled Chapter'), doc: toDoc(c.html || '<p></p>') }))
  return { sections, images, note: `${sections.length} chapter${sections.length === 1 ? '' : 's'}${images ? ` and ${images} image${images === 1 ? '' : 's'}` : ''}` }
}
