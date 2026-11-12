import { Extension, Node, mergeAttributes, type Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'
import { FIGURE_DEFAULTS, figureSpec, type FigureAttrs } from './figure'
import { uid } from '@/lib/units'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    gb: {
      insertFigure: (attrs: Partial<FigureAttrs>, pos?: number) => ReturnType
      updateFigure: (attrs: Partial<FigureAttrs>) => ReturnType
      insertFootnote: () => ReturnType
      insertSceneBreak: () => ReturnType
      insertPageBreak: () => ReturnType
      togglePullQuote: () => ReturnType
      toggleTextBox: () => ReturnType
      setBlockAttr: (name: string, value: unknown) => ReturnType
      setInlineStyle: (name: string, value: unknown) => ReturnType
    }
  }
}

/** Mutable context read by plugins: lets React drive decorations without rebuilding the editor. */
export interface FindMatch { from: number; to: number }
export const editorCtx = {
  dropCap: false,
  focusMode: false,
  find: { query: '', caseSensitive: false, wholeWord: false, current: -1 },
  onFiles: null as null | ((files: File[], pos: number | null) => void),
  onLibraryImage: null as null | ((imageId: string, pos: number | null) => void),
}

export function findInDoc(doc: PMNode, query: string, caseSensitive: boolean, wholeWord = false): FindMatch[] {
  const out: FindMatch[] = []
  if (!query) return out
  const q = caseSensitive ? query : query.toLowerCase()
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    const raw = node.textBetween(0, node.content.size, undefined, '￼')
    const text = caseSensitive ? raw : raw.toLowerCase()
    for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, i + Math.max(1, q.length))) {
      if (wholeWord) {
        const before = raw[i - 1] ?? ' '
        const after = raw[i + q.length] ?? ' '
        if (/[\p{L}\p{N}]/u.test(before) || /[\p{L}\p{N}]/u.test(after)) continue
      }
      out.push({ from: pos + 1 + i, to: pos + 1 + i + q.length })
    }
    return false
  })
  return out
}

const decoKey = new PluginKey('gbDecor')
const Decor = Extension.create({
  name: 'gbDecor',
  addProseMirrorPlugins() {
    let cache: { doc: PMNode; key: string; matches: FindMatch[] } | null = null
    return [
      new Plugin({
        key: decoKey,
        props: {
          decorations: (state) => {
            const decos: Decoration[] = []
            const first = state.doc.firstChild
            if (editorCtx.dropCap && first && first.type.name === 'paragraph' && !first.attrs.variant && first.textContent.trim().length > 1 && !first.attrs.textAlign && first.attrs.lineHeight == null && first.attrs.spaceBefore == null && first.attrs.spaceAfter == null && first.attrs.indent == null) {
              decos.push(Decoration.node(0, first.nodeSize, { class: 'gb-dropcap' }))
            }
            if (editorCtx.focusMode) {
              const $from = state.selection.$from
              if ($from.depth >= 1) decos.push(Decoration.node($from.before(1), $from.after(1), { class: 'gb-focus-current' }))
            }
            const f = editorCtx.find
            if (f.query) {
              const key = `${f.query}|${f.caseSensitive}|${f.wholeWord}`
              if (!cache || cache.doc !== state.doc || cache.key !== key) cache = { doc: state.doc, key, matches: findInDoc(state.doc, f.query, f.caseSensitive, f.wholeWord) }
              cache.matches.forEach((m, i) => decos.push(Decoration.inline(m.from, m.to, { class: i === f.current ? 'gb-find gb-find-current' : 'gb-find' })))
            }
            return DecorationSet.create(state.doc, decos)
          },
          handleScrollToSelection: () => true,
          handlePaste: (view, event) => {
            const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
            if (!files.length || !editorCtx.onFiles) return false
            event.preventDefault()
            editorCtx.onFiles(files, view.state.selection.from)
            return true
          },
          handleDrop: (view, event) => {
            const dt = event.dataTransfer
            if (!dt) return false
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null
            const lib = dt.getData('application/x-glitchbind-image')
            if (lib && editorCtx.onLibraryImage) { event.preventDefault(); editorCtx.onLibraryImage(lib, at); return true }
            const files = Array.from(dt.files ?? []).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|svg|gif)$/i.test(f.name))
            if (files.length && editorCtx.onFiles) { event.preventDefault(); editorCtx.onFiles(files, at); return true }
            return false
          },
        },
        // every figure and footnote needs a unique id (copy/paste would otherwise duplicate them)
        appendTransaction: (trs, _old, state) => {
          if (!trs.some((t) => t.docChanged)) return null
          const seen = new Set<string>()
          let tr = state.tr
          state.doc.descendants((node, pos) => {
            if (node.type.name !== 'figure' && node.type.name !== 'footnote') return true
            const id = node.attrs.id as string
            if (!id || seen.has(id)) {
              const fresh = uid(node.type.name === 'figure' ? 'f_' : 'n_')
              tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: fresh })
              seen.add(fresh)
            } else seen.add(id)
            return true
          })
          return tr.docChanged ? tr.setMeta('addToHistory', false) : null
        },
      }),
    ]
  },
})

const styleAttr = (name: string, css: string, unit = '') => ({
  default: null,
  parseHTML: (el: HTMLElement) => {
    const v = el.style.getPropertyValue(css)
    if (!v) return null
    const n = parseFloat(v)
    return Number.isNaN(n) ? v : n
  },
  renderHTML: (attrs: Record<string, unknown>) => (attrs[name] === null || attrs[name] === undefined ? {} : { style: `${css}:${attrs[name]}${unit}` }),
})

const BlockStyle = Extension.create({
  name: 'gbBlockStyle',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          variant: {
            default: null,
            parseHTML: (el: HTMLElement) => /gb-v-([\w-]+)/.exec(el.className)?.[1] ?? null,
            renderHTML: (attrs: Record<string, unknown>) => (attrs.variant ? { class: `gb-v-${attrs.variant}` } : {}),
          },
        },
      },
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: styleAttr('lineHeight', 'line-height'),
          spaceBefore: styleAttr('spaceBefore', 'margin-top', 'em'),
          spaceAfter: styleAttr('spaceAfter', 'margin-bottom', 'em'),
          indent: styleAttr('indent', 'text-indent', 'em'),
        },
      },
      {
        types: ['textStyle'],
        attributes: {
          fontSize: styleAttr('fontSize', 'font-size', 'pt'),
          fontFamily: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.fontFamily?.replace(/["']/g, '').split(',')[0] || null,
            renderHTML: (attrs: Record<string, unknown>) => (attrs.fontFamily ? { style: `font-family:"${attrs.fontFamily}"` } : {}),
          },
          letterSpacing: styleAttr('letterSpacing', 'letter-spacing', 'em'),
          fontWeight: styleAttr('fontWeight', 'font-weight'),
        },
      },
    ]
  },
  addCommands() {
    return {
      setBlockAttr: (name, value) => ({ tr, state, dispatch }) => {
        const { from, to } = state.selection
        let changed = false
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return true
          if (name === 'variant' && node.type.name !== 'paragraph') return true
          if (node.attrs[name] !== value) { tr.setNodeMarkup(pos, undefined, { ...node.attrs, [name]: value }); changed = true }
          return false
        })
        if (changed && dispatch) dispatch(tr)
        return true
      },
      setInlineStyle: (name, value) => ({ chain }) =>
        chain().setMark('textStyle', { [name]: value }).removeEmptyTextStyle().run(),
    }
  },
})

const Figure = Node.create({
  name: 'figure', group: 'block', atom: true, draggable: true, selectable: true,
  addAttributes() {
    return Object.fromEntries(Object.entries(FIGURE_DEFAULTS).map(([k, v]) => [k, { default: v, rendered: false }]))
  },
  parseHTML() {
    return [{
      tag: 'figure[data-fig]',
      getAttrs: (el) => {
        try { return { ...FIGURE_DEFAULTS, ...(JSON.parse((el as HTMLElement).getAttribute('data-fig') ?? '{}') as Partial<FigureAttrs>) } } catch { return false }
      },
    }]
  },
  renderHTML({ node }) { return figureSpec(node.attrs as FigureAttrs) },
  addCommands() {
    return {
      insertFigure: (attrs, pos) => ({ tr, state, dispatch }) => {
        const node = state.schema.nodes.figure.create({ ...FIGURE_DEFAULTS, ...attrs, id: attrs.id || uid('f_') })
        let at: number
        if (pos === undefined || pos === null) {
          const $from = state.selection.$from
          at = state.selection instanceof NodeSelection ? state.selection.to : $from.depth >= 1 ? ($from.parentOffset === 0 && $from.depth === 1 ? $from.before(1) : $from.after(1)) : state.doc.content.size
        } else {
          const $pos = state.doc.resolve(Math.min(pos, state.doc.content.size))
          at = $pos.depth >= 1 ? ($pos.parentOffset <= $pos.parent.content.size / 2 ? $pos.before(1) : $pos.after(1)) : $pos.pos
        }
        if (dispatch) {
          tr.insert(at, node)
          tr.setSelection(NodeSelection.create(tr.doc, at))
          dispatch(tr)
        }
        return true
      },
      updateFigure: (attrs) => ({ tr, state, dispatch }) => {
        const sel = state.selection
        if (!(sel instanceof NodeSelection) || sel.node.type.name !== 'figure') return false
        if (dispatch) {
          tr.setNodeMarkup(sel.from, undefined, { ...sel.node.attrs, ...attrs })
          tr.setSelection(NodeSelection.create(tr.doc, sel.from))
          dispatch(tr)
        }
        return true
      },
    }
  },
})

const Footnote = Node.create({
  name: 'footnote', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes() {
    return { id: { default: '', rendered: false }, text: { default: '', rendered: false } }
  },
  parseHTML() {
    return [{ tag: 'sup[data-fn-id]', getAttrs: (el) => ({ id: (el as HTMLElement).getAttribute('data-fn-id') ?? '', text: (el as HTMLElement).getAttribute('data-fn-text') ?? '' }) }]
  },
  renderHTML({ node }) {
    return ['sup', { class: 'gb-fn', 'data-fn-id': node.attrs.id as string, 'data-fn-text': node.attrs.text as string }]
  },
  addCommands() {
    return {
      insertFootnote: () => ({ tr, state, dispatch }) => {
        if (!state.selection.$to.parent.isTextblock) return false
        const node = state.schema.nodes.footnote.create({ id: uid('n_'), text: '' })
        const at = state.selection.to
        if (dispatch) {
          tr.insert(at, node)
          tr.setSelection(NodeSelection.create(tr.doc, at))
          dispatch(tr)
        }
        return true
      },
    }
  },
  addKeyboardShortcuts() { return { 'Mod-Alt-f': () => this.editor.commands.insertFootnote() } },
})

const SceneBreak = Node.create({
  name: 'sceneBreak', group: 'block', atom: true, selectable: true,
  parseHTML() { return [{ tag: 'div[data-scene]' }, { tag: 'hr' }] },
  renderHTML() { return ['div', { class: 'gb-scene', 'data-scene': '', 'data-mono': '' }] },
  addCommands() {
    return { insertSceneBreak: () => ({ commands }) => commands.insertContent([{ type: 'sceneBreak' }, { type: 'paragraph' }]) }
  },
})

const PageBreak = Node.create({
  name: 'pageBreak', group: 'block', atom: true, selectable: true,
  parseHTML() { return [{ tag: 'div[data-anchor="break"]' }] },
  renderHTML() { return ['div', { class: 'gb-pagebreak', 'data-anchor': 'break' }] },
  addCommands() {
    return { insertPageBreak: () => ({ commands }) => commands.insertContent([{ type: 'pageBreak' }, { type: 'paragraph' }]) }
  },
  addKeyboardShortcuts() { return { 'Mod-Enter': () => this.editor.commands.insertPageBreak() } },
})

const PullQuote = Node.create({
  name: 'pullQuote', group: 'block', content: 'inline*', defining: true, draggable: true,
  parseHTML() { return [{ tag: 'blockquote.gb-pullquote', priority: 70 }] },
  renderHTML({ HTMLAttributes }) { return ['blockquote', mergeAttributes(HTMLAttributes, { class: 'gb-pullquote', 'data-mono': '' }), 0] },
  addCommands() { return { togglePullQuote: () => ({ commands }) => commands.toggleNode('pullQuote', 'paragraph') } },
})

const TextBox = Node.create({
  name: 'textBox', group: 'block', content: '(paragraph | bulletList | orderedList)+', defining: true, draggable: true,
  parseHTML() { return [{ tag: 'aside.gb-textbox' }] },
  renderHTML({ HTMLAttributes }) { return ['aside', mergeAttributes(HTMLAttributes, { class: 'gb-textbox', 'data-mono': '' }), 0] },
  addCommands() { return { toggleTextBox: () => ({ commands }) => commands.toggleWrap('textBox') } },
})

export function buildExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false, codeBlock: false, horizontalRule: false,
      history: { depth: 300, newGroupDelay: 400 },
      dropcursor: { color: '#00E5FF', width: 2 },
    }),
    Underline, Subscript, Superscript,
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    TextStyle, Color, Highlight.configure({ multicolor: true }),
    Table.configure({ resizable: false }), TableRow, TableHeader, TableCell,
    BlockStyle, Figure, Footnote, SceneBreak, PageBreak, PullQuote, TextBox, Decor,
  ]
}

let shared: Extensions | null = null
/** One extension set for the editor and for static HTML generation, so both render identically. */
export const extensions = (): Extensions => (shared ??= buildExtensions())
