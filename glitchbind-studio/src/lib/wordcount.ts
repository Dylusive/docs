import type { PMDoc } from '@/types'

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu
export const countWords = (text: string): number => text.match(WORD)?.length ?? 0

/** Plain text of a document. Blocks are separated by `sep`; footnote text is not included. */
export function docText(node: PMDoc | null | undefined, sep = '\n'): string {
  if (!node) return ''
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'sceneBreak') return '* * *' + sep
  const kids = node.content ?? []
  const inner = kids.map((k) => docText(k, sep)).join('')
  const isBlock = node.type === 'paragraph' || node.type === 'heading' || node.type === 'pullQuote' || node.type === 'tableCell' || node.type === 'tableHeader'
  if (node.type === 'figure') return node.attrs?.caption ? String(node.attrs.caption) + sep : ''
  return isBlock ? inner + sep : inner
}

const cache = new WeakMap<object, number>()
export function countDocWords(doc: PMDoc | null | undefined): number {
  if (!doc) return 0
  const hit = cache.get(doc)
  if (hit !== undefined) return hit
  const n = countWords(docText(doc, ' '))
  cache.set(doc, n)
  return n
}
export const readingMinutes = (words: number): number => Math.max(1, Math.round(words / 250))
export function formatReadingTime(words: number): string {
  if (words === 0) return '0 min'
  const m = readingMinutes(words)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

/** Walk every node of a document. */
export function walkDoc(node: PMDoc | null | undefined, fn: (n: PMDoc) => void): void {
  if (!node) return
  fn(node)
  for (const k of node.content ?? []) walkDoc(k, fn)
}
