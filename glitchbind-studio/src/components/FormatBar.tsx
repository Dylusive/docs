import { useRef } from 'react'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, BookImage, Columns2, Focus, Image as ImageIcon, Italic, List, ListOrdered,
  MessageSquareQuote, Minus, PanelTop, Plus, Quote, Redo2, Search, SeparatorHorizontal, Strikethrough, Subscript, Superscript, Table as TableIcon,
  TextQuote, Underline, Undo2, Footprints,
} from 'lucide-react'
import { useUI } from '@/store/ui'
import { useProject } from '@/store/project'
import { controller } from '@/lib/editor/controller'
import { insertImageFiles } from '@/lib/actions'
import { IconBtn, MenuItem, Popover, Select } from './ui'

export const BASE_STYLES: { value: string; label: string }[] = [
  { value: 'normal', label: 'Normal' }, { value: 'title', label: 'Title' }, { value: 'subtitle', label: 'Subtitle' },
  { value: 'h1', label: 'Heading 1' }, { value: 'h2', label: 'Heading 2' }, { value: 'h3', label: 'Heading 3' },
  { value: 'caption', label: 'Caption' }, { value: 'epigraph', label: 'Epigraph' },
  { value: 'pullquote', label: 'Pull Quote' }, { value: 'textbox', label: 'Sidebar / Text Box' },
]

export function currentStyle(): string {
  const ed = controller.editor
  if (!ed || !controller.activeId) return 'normal'
  const $from = ed.state.selection.$from
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === 'textBox') return 'textbox'
  const node = $from.parent
  if (node.type.name === 'heading') return `h${node.attrs.level as number}`
  if (node.type.name === 'pullQuote') return 'pullquote'
  if (node.type.name === 'paragraph' && node.attrs.variant) return String(node.attrs.variant)
  return 'normal'
}

export function applyStyle(v: string): void {
  const ed = controller.editor
  if (!ed) return
  const inBox = ed.isActive('textBox')
  let chain = ed.chain().focus()
  if (inBox && v !== 'textbox') chain = chain.lift('textBox')
  if (v === 'textbox') { if (!inBox) chain.toggleTextBox().run(); return }
  if (v === 'pullquote') { chain.setNode('pullQuote').run(); return }
  if (/^h[1-3]$/.test(v)) { chain.setNode('heading', { level: parseInt(v[1], 10) }).run(); return }
  chain.setNode('paragraph').setBlockAttr('variant', v === 'normal' ? null : v).run()
}

export function FormatBar() {
  useUI((s) => s.tick)
  const focusMode = useUI((s) => s.focusMode)
  const customStyles = useProject((s) => s.project?.customStyles) ?? []
  const fileRef = useRef<HTMLInputElement>(null)
  const pending = useRef<Record<string, unknown>>({})
  const ed = controller.editor
  const on = !!ed && !!controller.activeId
  const is = (name: string | Record<string, unknown>, attrs?: Record<string, unknown>): boolean => (on && ed ? (typeof name === 'string' ? ed.isActive(name, attrs) : ed.isActive(name)) : false)
  const run = (fn: (c: ReturnType<NonNullable<typeof ed>['chain']>) => { run: () => boolean }): void => { if (ed && on) fn(ed.chain().focus()).run() }
  const pick = (extra: Record<string, unknown>): void => { pending.current = extra; fileRef.current?.click() }
  const Sep = () => <span className="w-px h-5 bg-ink-600 mx-1.5 shrink-0" />
  const styles = [...BASE_STYLES, ...customStyles.map((c) => ({ value: c.id, label: c.name, group: 'My styles' }))]

  return (
    <div className="h-11 shrink-0 flex items-center px-3 gap-0.5 bg-ink-800 border-b border-ink-600/80 overflow-x-auto" role="toolbar" aria-label="Formatting" data-testid="format-bar">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif" multiple className="hidden" data-testid="image-file-input"
        onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) void insertImageFiles(files, null, pending.current); e.target.value = '' }} />
      <IconBtn icon={Undo2} label="Undo  Ctrl+Z" onClick={() => controller.undo()} disabled={!controller.canUndo()} />
      <IconBtn icon={Redo2} label="Redo  Ctrl+Shift+Z" onClick={() => controller.redo()} disabled={!controller.canRedo()} />
      <Sep />
      <Select label="Paragraph style" className="w-[148px] shrink-0" value={currentStyle()} onChange={applyStyle} options={styles} />
      <Sep />
      <IconBtn icon={Bold} label="Bold  Ctrl+B" active={is('bold')} disabled={!on} onClick={() => run((c) => c.toggleBold())} />
      <IconBtn icon={Italic} label="Italic  Ctrl+I" active={is('italic')} disabled={!on} onClick={() => run((c) => c.toggleItalic())} />
      <IconBtn icon={Underline} label="Underline  Ctrl+U" active={is('underline')} disabled={!on} onClick={() => run((c) => c.toggleUnderline())} />
      <IconBtn icon={Strikethrough} label="Strikethrough" active={is('strike')} disabled={!on} onClick={() => run((c) => c.toggleStrike())} />
      <IconBtn icon={Superscript} label="Superscript" active={is('superscript')} disabled={!on} onClick={() => run((c) => c.unsetSubscript().toggleSuperscript())} />
      <IconBtn icon={Subscript} label="Subscript" active={is('subscript')} disabled={!on} onClick={() => run((c) => c.unsetSuperscript().toggleSubscript())} />
      <Sep />
      <IconBtn icon={AlignLeft} label="Align left" active={is({ textAlign: 'left' })} disabled={!on} onClick={() => run((c) => c.setTextAlign('left'))} />
      <IconBtn icon={AlignCenter} label="Centre" active={is({ textAlign: 'center' })} disabled={!on} onClick={() => run((c) => c.setTextAlign('center'))} />
      <IconBtn icon={AlignRight} label="Align right" active={is({ textAlign: 'right' })} disabled={!on} onClick={() => run((c) => c.setTextAlign('right'))} />
      <IconBtn icon={AlignJustify} label="Justify" active={is({ textAlign: 'justify' })} disabled={!on} onClick={() => run((c) => c.setTextAlign('justify'))} />
      <Sep />
      <IconBtn icon={List} label="Bulleted list" active={is('bulletList')} disabled={!on} onClick={() => run((c) => c.toggleBulletList())} />
      <IconBtn icon={ListOrdered} label="Numbered list" active={is('orderedList')} disabled={!on} onClick={() => run((c) => c.toggleOrderedList())} />
      <IconBtn icon={Quote} label="Block quote" active={is('blockquote')} disabled={!on} onClick={() => run((c) => c.toggleBlockquote())} />
      <Sep />
      <Popover width={236} trigger={(open, toggle) => (
        <button type="button" className="gb-btn-ghost px-2.5 shrink-0" data-active={open} data-testid="insert-menu" disabled={!on} onMouseDown={(e) => e.preventDefault()} onClick={toggle}><Plus size={14} /> Insert</button>
      )}>
        {(close) => (
          <>
            <MenuItem icon={ImageIcon} label="Image…" onClick={() => { close(); pick({}) }} />
            <MenuItem icon={BookImage} label="Illustrated page (full bleed)…" onClick={() => { close(); pick({ wrap: 'page' }) }} />
            <MenuItem icon={Columns2} label="Two-page spread image…" onClick={() => { close(); pick({ wrap: 'page', spread: true }) }} />
            <div className="h-px bg-ink-600 my-1.5" />
            <MenuItem icon={Footprints} label="Footnote" hint="Ctrl+Alt+F" onClick={() => { close(); run((c) => c.insertFootnote()) }} />
            <MenuItem icon={MessageSquareQuote} label="Pull quote" onClick={() => { close(); run((c) => c.insertContent({ type: 'pullQuote', content: [{ type: 'text', text: 'A line worth repeating.' }] })) }} />
            <MenuItem icon={PanelTop} label="Sidebar / text box" onClick={() => { close(); run((c) => c.insertContent({ type: 'textBox', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sidebar text.' }] }] })) }} />
            <MenuItem icon={TableIcon} label="Table (3 × 3)" onClick={() => { close(); run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })) }} />
            <div className="h-px bg-ink-600 my-1.5" />
            <MenuItem icon={Minus} label="Scene break" onClick={() => { close(); run((c) => c.insertSceneBreak()) }} />
            <MenuItem icon={SeparatorHorizontal} label="Page break" hint="Ctrl+Enter" onClick={() => { close(); run((c) => c.insertPageBreak()) }} />
            <MenuItem icon={TextQuote} label="Epigraph line" onClick={() => { close(); run((c) => c.insertContent({ type: 'paragraph', attrs: { variant: 'epigraph' }, content: [{ type: 'text', text: '— Attribution' }] })) }} />
          </>
        )}
      </Popover>
      <span className="flex-1" />
      <IconBtn icon={Search} label="Find & replace  Ctrl+F" side="left" onClick={() => { useUI.getState().setPref({ leftOpen: true }); useUI.setState({ leftTab: 'find' }) }} />
      <IconBtn icon={Focus} label="Focus Mode  Ctrl+Shift+F" side="left" active={focusMode} onClick={() => useUI.setState({ focusMode: !focusMode })} />
    </div>
  )
}
