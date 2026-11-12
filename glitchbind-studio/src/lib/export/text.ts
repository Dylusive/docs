import type { Project } from '@/types'
import { docText } from '@/lib/wordcount'
import { exportSections } from './model'

/** Plain text: every section in order, blank line between paragraphs, footnotes gathered per section. */
export function buildText(project: Project): string {
  const m = project.meta
  const out: string[] = []
  for (const es of exportSections(project)) {
    const s = es.section
    if (s.kind === 'title') {
      out.push([m.title.toUpperCase(), m.subtitle, m.author ? `by ${m.author}` : '', m.publisher].filter(Boolean).join('\n'))
      continue
    }
    const head = [es.label, es.heading].filter(Boolean).join(' — ')
    const notes: string[] = []
    const collect = (nodes: unknown[]): void => {
      for (const n of nodes as { type?: string; attrs?: { text?: string }; content?: unknown[] }[]) {
        if (n.type === 'footnote') notes.push(String(n.attrs?.text ?? ''))
        if (n.content) collect(n.content)
      }
    }
    collect(es.blocks)
    const body = es.blocks.map((b) => docText(b, '\n').replace(/\n+$/, '')).filter((t) => t.length).join('\n\n')
    out.push([head ? `${head.toUpperCase()}\n` : '', body, notes.length ? `\nNotes\n${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}` : ''].filter(Boolean).join('\n'))
  }
  return out.join('\n\n\n') + '\n'
}
