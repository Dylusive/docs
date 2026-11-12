import { generateJSON } from '@tiptap/html'
import { getSchema } from '@tiptap/core'
import { DOMSerializer, type Schema } from '@tiptap/pm/model'
import type { PMDoc } from '@/types'
import { extensions } from './extensions'
import { imagesVersion } from '@/lib/images'

const cache = new WeakMap<object, { v: number; html: string }>()
let schema: Schema | null = null
let serializer: DOMSerializer | null = null

/**
 * Serialise with the browser's real DOM, exactly as the live editor renders.
 * (@tiptap/html's generateHTML uses a lightweight virtual DOM that silently drops CSS it does not
 * recognise, such as aspect-ratio, which collapsed image frames on pages that were not being edited.)
 */
function serialize(doc: PMDoc): string {
  schema ??= getSchema(extensions())
  serializer ??= DOMSerializer.fromSchema(schema)
  const node = schema.nodeFromJSON(doc)
  const holder = document.createElement('div')
  holder.appendChild(serializer.serializeFragment(node.content, { document }))
  return holder.innerHTML
}

/** Static HTML for a section document — the same DOM the editor produces. */
export function docHtml(doc: PMDoc | null): string {
  if (!doc) return ''
  const v = imagesVersion()
  const hit = cache.get(doc)
  if (hit && hit.v === v) return hit.html
  let html = ''
  try { html = serialize(doc) } catch (err) { console.warn('Could not render section', err) }
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
