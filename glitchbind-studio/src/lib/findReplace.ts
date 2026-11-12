/** Find & Replace across the whole book (every editable section, not just the one on screen). */
import { Transform } from '@tiptap/pm/transform'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { PMDoc, Project } from '@/types'
import { controller } from './editor/controller'
import { editorCtx, findInDoc, type FindMatch } from './editor/extensions'
import { useProject } from '@/store/project'
import { jumpToSection } from './actions'

export interface FindOptions { caseSensitive: boolean; wholeWord: boolean }
export interface BookMatch extends FindMatch { sectionId: string; sectionTitle: string; index: number; snippet: string; snippetAt: number }

const nodeCache = new WeakMap<object, PMNode>()
function nodeOf(doc: PMDoc): PMNode | null {
  const schema = controller.ensure().schema
  const hit = nodeCache.get(doc)
  if (hit) return hit
  try {
    const node = schema.nodeFromJSON(doc)
    nodeCache.set(doc, node)
    return node
  } catch { return null }
}

/** The document to search for a section: the live editor state if it is open, otherwise the stored one. */
function sectionNode(project: Project, sectionId: string): PMNode | null {
  if (controller.activeId === sectionId && controller.view) return controller.view.state.doc
  const sec = project.sections.find((s) => s.id === sectionId)
  return sec?.doc ? nodeOf(sec.doc) : null
}

export function searchBook(project: Project, query: string, opts: FindOptions): BookMatch[] {
  const out: BookMatch[] = []
  if (!query) return out
  for (const sec of project.sections) {
    if (!sec.doc) continue
    const node = sectionNode(project, sec.id)
    if (!node) continue
    findInDoc(node, query, opts.caseSensitive, opts.wholeWord).forEach((m, index) => {
      const start = Math.max(0, m.from - 28)
      const end = Math.min(node.content.size, m.to + 36)
      const before = node.textBetween(start, m.from, ' ', ' ')
      const after = node.textBetween(m.to, end, ' ', ' ')
      out.push({ ...m, sectionId: sec.id, sectionTitle: sec.title, index, snippet: before + node.textBetween(m.from, m.to) + after, snippetAt: before.length })
    })
  }
  return out
}

export function setFindHighlight(query: string, opts: FindOptions, current = -1): void {
  editorCtx.find = { query, caseSensitive: opts.caseSensitive, wholeWord: opts.wholeWord, current }
  controller.refreshDecorations()
}

export function goToMatch(m: BookMatch, query: string, opts: FindOptions): void {
  if (controller.activeId !== m.sectionId) jumpToSection(m.sectionId, false)
  editorCtx.find = { query, caseSensitive: opts.caseSensitive, wholeWord: opts.wholeWord, current: m.index }
  controller.select(m.from, m.to)
  controller.refreshDecorations()
}

/** Replace one match (it must be in the active section). */
export function replaceMatch(m: BookMatch, replacement: string): boolean {
  const view = controller.view
  if (!view || controller.activeId !== m.sectionId) return false
  const tr = replacement ? view.state.tr.insertText(replacement, m.from, m.to) : view.state.tr.delete(m.from, m.to)
  view.dispatch(tr)
  return true
}

/** Replace every match in every section. One undoable book-level step. */
export function replaceAll(query: string, replacement: string, opts: FindOptions): number {
  controller.flush()
  const project = useProject.getState().project
  if (!project || !query) return 0
  let count = 0
  const next = new Map<string, PMDoc>()
  for (const sec of project.sections) {
    if (!sec.doc) continue
    const node = nodeOf(sec.doc)
    if (!node) continue
    const matches = findInDoc(node, query, opts.caseSensitive, opts.wholeWord)
    if (!matches.length) continue
    const tr = new Transform(node)
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i]
      if (replacement) tr.replaceWith(m.from, m.to, node.type.schema.text(replacement, node.resolve(m.from).marks()))
      else tr.delete(m.from, m.to)
    }
    count += matches.length
    next.set(sec.id, tr.doc.toJSON() as PMDoc)
  }
  if (count) {
    useProject.getState().mutate((p) => ({ ...p, sections: p.sections.map((s) => (next.has(s.id) ? { ...s, doc: next.get(s.id) ?? s.doc } : s)) }), { label: `replace all “${query}”`, docs: true })
  }
  return count
}
