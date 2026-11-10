import { generateHTML, generateJSON } from '@tiptap/html'
import type { PMDoc } from '@/types'
import { extensions } from './extensions'
import { imagesVersion } from '@/lib/images'

const cache = new WeakMap<object, { v: number; html: string }>()
/** Static HTML for a section document — the same DOM the editor produces. */
export function docHtml(doc: PMDoc | null): string {
  if (!doc) return ''
  const v = imagesVersion()
  const hit = cache.get(doc)
  if (hit && hit.v === v) return hit.html
  let html = ''
  try { html = generateHTML(doc, extensions()) } catch (err) { console.warn('Could not render section', err) }
  cache.set(doc, { v, html })
  return html
}
export const htmlToDoc = (html: string): PMDoc => generateJSON(html, extensions()) as PMDoc

/** Chapters open with a drop cap on their first plain paragraph (mirrors the editor decoration). */
export function withDropCap(html: string): string {
  const m = /^<p(?![^>]*\b(class|style)=)[^>]*>(?!<\/p>)/.exec(html)
  if (!m) return html
  const end = html.indexOf('</p>')
  const text = html.slice(m[0].length, end).replace(/<[^>]+>/g, '').trim()
  return text.length > 1 ? '<p class="gb-dropcap"' + html.slice(2) : html
}
