/**
 * The single live editor. One Tiptap instance is re-used for whichever section is being edited;
 * each section keeps its own EditorState (and therefore its own undo history) in memory.
 */
import { Editor } from '@tiptap/core'
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state'
import { redo, redoDepth, undo, undoDepth } from '@tiptap/pm/history'
import type { PMDoc } from '@/types'
import { useProject, projectHooks } from '@/store/project'
import { useUI } from '@/store/ui'
import { useLayout } from '@/store/layout'
import { editorCtx, extensions } from './extensions'
import { scheduleLayout } from '@/lib/layoutManager'

/** Things the canvas offers the controller (registered when the canvas mounts). */
export const canvasBridge = {
  /** scroll a page into view; with `flowY` (a Y inside the live flow) only scrolls if that line is off-screen */
  revealPage: (_index: number, _flowY?: number): void => {},
}

class EditorController {
  editor: Editor | null = null
  host: HTMLDivElement | null = null
  activeId: string | null = null
  lastInput: 'key' | 'pointer' = 'key'
  pointerDown = false
  private states = new Map<string, EditorState>()
  private synced = new Map<string, PMDoc | null>()
  private versions = new Map<string, number>()
  private histTimes = new Map<string, number[]>()
  private dirty = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private tickRaf = 0
  private depth = 0

  ensure(): Editor {
    if (this.editor) return this.editor
    this.host = document.createElement('div')
    this.host.className = 'gb-live-host'
    this.editor = new Editor({
      element: this.host,
      extensions: extensions(),
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      editorProps: { attributes: { class: 'gb-content gb-live gb-src-main', lang: 'en', spellcheck: 'true' } },
      onTransaction: ({ transaction }) => this.onTransaction(transaction.docChanged, transaction.selectionSet || transaction.docChanged),
      onFocus: () => this.bumpTick(),
      onBlur: () => this.bumpTick(),
    })
    window.addEventListener('pointerdown', () => { this.pointerDown = true; this.lastInput = 'pointer' }, true)
    window.addEventListener('pointerup', () => { this.pointerDown = false }, true)
    window.addEventListener('keydown', () => { this.lastInput = 'key' }, true)
    projectHooks.beforeSave = () => this.flush()
    projectHooks.afterRestore = () => this.resync()
    useProject.subscribe((s, prev) => { if (s.project !== prev.project) this.onProjectChange() })
    return this.editor
  }

  root(): HTMLElement | null { return this.activeId && this.editor ? (this.editor.view.dom as HTMLElement) : null }
  version(id: string): number { return this.versions.get(id) ?? 0 }
  get view() { return this.editor?.view ?? null }

  private bumpTick(): void {
    if (this.tickRaf) return
    this.tickRaf = requestAnimationFrame(() => { this.tickRaf = 0; useUI.setState((s) => ({ tick: s.tick + 1 })) })
  }

  private onTransaction(docChanged: boolean, selectionChanged: boolean): void {
    const ed = this.editor
    const id = this.activeId
    if (!ed || !id) return
    this.states.set(id, ed.state)
    const d = undoDepth(ed.state)
    if (docChanged) {
      this.versions.set(id, this.version(id) + 1)
      this.dirty = true
      if (useProject.getState().saveState === 'saved') useProject.setState({ saveState: 'dirty' })
      if (this.flushTimer) clearTimeout(this.flushTimer)
      this.flushTimer = setTimeout(() => this.flush(), 400)
      const times = this.histTimes.get(id) ?? []
      if (d > this.depth) times.push(Date.now())
      else if (d < this.depth) times.length = Math.max(0, d)
      this.histTimes.set(id, times)
      scheduleLayout()
    }
    this.depth = d
    this.bumpTick()
    if (selectionChanged) {
      this.updateContext()
      if (!this.pointerDown && !docChanged) this.followCaret(true)
    }
  }

  private updateContext(): void {
    const sel = this.editor?.state.selection
    if (!sel) return
    let ctx: 'text' | 'image' | 'footnote' = 'text'
    if (sel instanceof NodeSelection) {
      if (sel.node.type.name === 'figure') ctx = 'image'
      else if (sel.node.type.name === 'footnote') ctx = 'footnote'
    }
    if (useUI.getState().context !== ctx) useUI.setState({ context: ctx, rightTab: 'context' })
  }

  /** Flow-space Y (px, unscaled) of a document position inside the live editor. */
  flowY(pos: number): number | null {
    const view = this.view
    const root = this.root()
    if (!view || !root) return null
    try {
      const c = view.coordsAtPos(Math.max(0, Math.min(pos, view.state.doc.content.size)))
      const r = root.getBoundingClientRect()
      const scale = root.offsetWidth ? r.width / root.offsetWidth : 1
      return ((c.top + c.bottom) / 2 - r.top) / scale
    } catch { return null }
  }

  /** Book page index that shows the given document position. */
  pageOfPos(pos: number): number {
    const y = this.flowY(pos)
    const pages = useLayout.getState().pages
    let best = -1
    let bestDist = Infinity
    if (y === null) return best
    for (const p of pages) {
      if (p.sectionId !== this.activeId || !p.page) continue
      const seg = p.page.segments.find((s) => s.key === 'main')
      if (!seg) continue
      if (y >= seg.y0 - 0.5 && y < seg.y1) return p.index
      const dist = y < seg.y0 ? seg.y0 - y : y - seg.y1
      if (dist < bestDist) { bestDist = dist; best = p.index }
    }
    return best
  }

  caretPage(): number {
    const sel = this.editor?.state.selection
    if (!sel || !this.activeId) return -1
    if (sel instanceof NodeSelection && sel.node.type.name === 'figure' && (sel.node.attrs.wrap === 'page' || sel.node.attrs.wrap === 'behind')) {
      const id = sel.node.attrs.id as string
      const hit = useLayout.getState().pages.find((p) => p.sectionId === this.activeId && (p.page?.figureHtml?.includes(`data-fig-id="${id}"`) || p.page?.behind.some((b) => b.includes(`data-fig-id="${id}"`))))
      if (hit) return hit.index
    }
    return this.pageOfPos(sel.head)
  }

  /** Move the live window to the page holding the caret (keyboard-driven navigation). */
  followCaret(reveal: boolean): void {
    const page = this.caretPage()
    if (page < 0) return
    if (useUI.getState().livePage !== page) useUI.setState({ livePage: page })
    if (reveal && this.editor?.isFocused) {
      const y = this.flowY(this.editor.state.selection.head)
      if (y !== null) canvasBridge.revealPage(page, y)
    }
  }

  afterLayout(): void {
    if (!this.activeId) return
    const ui = useUI.getState()
    const pages = useLayout.getState().pages
    const cur = pages[ui.livePage]
    const stillValid = cur && cur.sectionId === this.activeId && cur.page?.segments.some((s) => s.key === 'main')
    if (this.lastInput === 'key' || !stillValid) this.followCaret(this.lastInput === 'key' && !!this.editor?.isFocused)
  }

  private makeState(doc: PMDoc | null): EditorState {
    const ed = this.ensure()
    let node
    try { node = ed.schema.nodeFromJSON(doc ?? { type: 'doc', content: [{ type: 'paragraph' }] }) } catch (err) {
      console.warn('Section content could not be parsed; opening it empty.', err)
      node = ed.schema.nodeFromJSON({ type: 'doc', content: [{ type: 'paragraph' }] })
    }
    return EditorState.create({ schema: ed.schema, doc: node, plugins: ed.state.plugins })
  }

  /** Make a section the one being edited. Synchronous, so a click can place the caret immediately. */
  activate(sectionId: string | null): void {
    const ed = this.ensure()
    if (sectionId === this.activeId) return
    this.flush()
    const project = useProject.getState().project
    const sec = project?.sections.find((s) => s.id === sectionId) ?? null
    if (!sec || !sec.doc) {
      this.activeId = null
      useUI.setState({ activeSectionId: sectionId, livePage: -1, context: 'page' })
      scheduleLayout()
      return
    }
    let state = this.states.get(sec.id)
    if (!state || this.synced.get(sec.id) !== sec.doc) {
      state = this.makeState(sec.doc)
      this.states.set(sec.id, state)
      this.synced.set(sec.id, sec.doc)
      this.histTimes.set(sec.id, [])
    }
    this.activeId = sec.id
    editorCtx.dropCap = sec.kind === 'chapter' && !!project?.settings.typography.dropCap
    ed.view.setProps({ attributes: { class: `gb-content gb-live gb-src-main gb-sec-${sec.kind}`, lang: 'en', spellcheck: 'true' } })
    ed.view.updateState(state)
    this.depth = undoDepth(state)
    useUI.setState({ activeSectionId: sec.id, context: 'text' })
    this.updateContext()
    scheduleLayout()
  }

  /** Push the live document into the project store (it is the store that gets saved). */
  flush(): void {
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null }
    if (!this.dirty || !this.editor || !this.activeId) return
    this.dirty = false
    const doc = this.editor.getJSON() as PMDoc
    this.synced.set(this.activeId, doc)
    useProject.getState().setSectionDoc(this.activeId, doc)
  }

  /** The store changed underneath us (undo of a structure change, import, replace-all…). */
  private onProjectChange(): void {
    const project = useProject.getState().project
    if (!project) { this.reset(); return }
    const sec = project.sections.find((s) => s.id === this.activeId)
    if (this.activeId && (!sec || this.synced.get(this.activeId) !== sec.doc)) this.resync()
    else if (sec) {
      const dc = sec.kind === 'chapter' && project.settings.typography.dropCap
      if (editorCtx.dropCap !== dc) { editorCtx.dropCap = dc; this.refreshDecorations() }
    }
    scheduleLayout()
  }

  resync(): void {
    const id = this.activeId
    const project = useProject.getState().project
    for (const key of Array.from(this.states.keys())) {
      const sec = project?.sections.find((s) => s.id === key)
      if (!sec || this.synced.get(key) !== sec.doc) { this.states.delete(key); this.synced.delete(key) }
    }
    if (id) {
      this.activeId = null
      this.dirty = false
      const still = project?.sections.find((s) => s.id === id)
      this.activate(still ? id : project?.sections.find((s) => s.doc)?.id ?? null)
    }
  }

  reset(): void {
    this.states.clear(); this.synced.clear(); this.versions.clear(); this.histTimes.clear()
    this.activeId = null
    this.dirty = false
    useUI.setState({ activeSectionId: null, livePage: -1 })
  }

  refreshDecorations(): void {
    const view = this.view
    if (view && this.activeId) view.dispatch(view.state.tr.setMeta('gbRefresh', true).setMeta('addToHistory', false))
  }

  focus(): void { this.view?.focus() }

  /** Select a document range in the active section and bring it into view. */
  select(from: number, to = from): void {
    const view = this.view
    if (!view) return
    const size = view.state.doc.content.size
    const sel = TextSelection.create(view.state.doc, Math.min(from, size), Math.min(to, size))
    this.lastInput = 'key'
    view.dispatch(view.state.tr.setSelection(sel))
    this.followCaret(false)
    const page = this.caretPage()
    if (page >= 0) canvasBridge.revealPage(page, undefined)
  }

  selectNodeById(id: string): boolean {
    const view = this.view
    if (!view) return false
    let found = -1
    view.state.doc.descendants((node, pos) => {
      if (found < 0 && (node.type.name === 'figure' || node.type.name === 'footnote') && node.attrs.id === id) found = pos
      return found < 0
    })
    if (found < 0) return false
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, found)))
    return true
  }

  // ---- unified undo: text edits and book-level changes share one timeline
  private lastDocEdit(): number {
    if (!this.activeId || !this.editor || undoDepth(this.editor.state) === 0) return 0
    const t = this.histTimes.get(this.activeId) ?? []
    return t[t.length - 1] ?? 1
  }
  undo(): void {
    const store = useProject.getState()
    const structAt = store.past[store.past.length - 1]?.at ?? 0
    const docAt = this.lastDocEdit()
    if (docAt === 0 && structAt === 0) return
    if (docAt >= structAt && this.view) { this.lastInput = 'key'; undo(this.view.state, this.view.dispatch) }
    else {
      const label = store.undoStructure()
      if (label) useUI.getState().toast(`Undid: ${label}`, 'info', { label: 'Redo', run: () => this.redo() })
    }
  }
  redo(): void {
    const store = useProject.getState()
    if (this.view && redoDepth(this.view.state) > 0) { this.lastInput = 'key'; redo(this.view.state, this.view.dispatch); return }
    const label = store.redoStructure()
    if (label) useUI.getState().toast(`Redid: ${label}`, 'info')
  }
  canUndo(): boolean { return this.lastDocEdit() > 0 || useProject.getState().past.length > 0 }
  canRedo(): boolean { return (!!this.view && !!this.activeId && redoDepth(this.view.state) > 0) || useProject.getState().future.length > 0 }
}

export const controller = new EditorController()
