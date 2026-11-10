import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen, ChevronDown, ChevronUp, Copy, FileText, GripVertical, Image as ImageIcon, ImagePlus, ListTree, MoreHorizontal, Pencil, Plus, Replace,
  ReplaceAll, Search, Trash2,
} from 'lucide-react'
import type { Matter, Section, SectionKind } from '@/types'
import { useProject, mutateSection } from '@/store/project'
import { useUI, toast } from '@/store/ui'
import { useLayout } from '@/store/layout'
import { addSection, addImagesToLibrary, deleteImage, deleteUnusedImages, duplicateSection, insertFigure, jumpToSection, moveSection, removeSection } from '@/lib/actions'
import { SECTION_LABELS, isGenerated } from '@/lib/defaults'
import { countDocWords, formatReadingTime } from '@/lib/wordcount'
import { formatBytes, imageUrl, usedImageIds } from '@/lib/images'
import { goToMatch, replaceAll, replaceMatch, searchBook, setFindHighlight, type BookMatch } from '@/lib/findReplace'
import { controller } from '@/lib/editor/controller'
import { EmptyState, IconBtn, MenuItem, Popover, Toggle } from './ui'

const MATTER_LABEL: Record<Matter, string> = { front: 'Front matter', body: 'Chapters', back: 'Back matter' }
const TEMPLATES: { group: string; kinds: SectionKind[] }[] = [
  { group: 'Front matter', kinds: ['title', 'copyright', 'dedication', 'epigraph', 'toc', 'preface'] },
  { group: 'Body', kinds: ['chapter'] },
  { group: 'Back matter', kinds: ['about', 'alsoby', 'acknowledgements', 'glossary'] },
]

function StructureTab() {
  const sections = useProject((s) => s.project?.sections) ?? []
  const active = useUI((s) => s.activeSectionId)
  const sectionPages = useLayout((s) => s.sectionPages)
  const chapterNumbers = useLayout((s) => s.chapterNumbers)
  const total = useLayout((s) => s.pages.length)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const words = useMemo(() => sections.reduce((n, s) => n + countDocWords(s.doc), 0), [sections])
  const existing = new Set(sections.map((s) => s.kind))

  const row = (s: Section, i: number) => {
    const isActive = s.id === active
    const label = chapterNumbers[s.id] ? String(chapterNumbers[s.id]) : ''
    return (
      <div key={s.id} data-testid="section-row" data-section-kind={s.kind}
        draggable={renaming !== s.id}
        onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-gb-section', s.id) }}
        onDragEnd={() => { setDragId(null); setDropAt(null) }}
        onDragOver={(e) => {
          if (!dragId) return
          e.preventDefault()
          const r = e.currentTarget.getBoundingClientRect()
          setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1)
        }}
        onDrop={(e) => { e.preventDefault(); if (dragId && dropAt !== null) moveSection(dragId, dropAt); setDragId(null); setDropAt(null) }}
        className={`group relative flex items-center h-9 pl-1 pr-1.5 mx-2 rounded-md cursor-pointer transition-colors duration-150 ${isActive ? 'bg-ink-600/80 text-white' : 'text-fog-200 hover:bg-ink-700'} ${dragId === s.id ? 'opacity-40' : ''}`}
        onClick={() => jumpToSection(s.id)}>
        {dropAt === i && dragId && <span className="absolute -top-px left-2 right-2 h-0.5 bg-cyan rounded" />}
        {dropAt === i + 1 && dragId && i === sections.length - 1 && <span className="absolute -bottom-px left-2 right-2 h-0.5 bg-cyan rounded" />}
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded bg-cyan" />}
        <GripVertical size={12} className="text-fog-400 opacity-0 group-hover:opacity-70 shrink-0 cursor-grab" />
        <span className="w-5 text-center text-[11px] tabular-nums text-fog-400 shrink-0">{label}</span>
        {renaming === s.id ? (
          <input autoFocus className="gb-input h-7 flex-1 min-w-0" aria-label="Section title" defaultValue={s.title}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.title) mutateSection(s.id, { title: v }, 'rename section'); setRenaming(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null) }} />
        ) : (
          <span className={`flex-1 min-w-0 truncate text-[12.5px] ${isActive ? 'gb-chapter-enter' : ''}`} key={isActive ? 'on' : 'off'} onDoubleClick={(e) => { e.stopPropagation(); setRenaming(s.id) }}>
            {s.title}
          </span>
        )}
        <span className="text-[10.5px] tabular-nums text-fog-400 ml-2 group-hover:hidden" title="Pages">{sectionPages[s.id] ?? '–'}</span>
        <span className="hidden group-hover:flex focus-within:flex" onClick={(e) => e.stopPropagation()}>
          <Popover align="right" width={180} trigger={(_o, toggle) => (
            <button type="button" className="gb-icon-btn h-6 w-6" aria-label={`Actions for ${s.title}`} onClick={toggle}><MoreHorizontal size={13} /></button>
          )}>
            {(close) => (
              <>
                <MenuItem icon={Pencil} label="Rename" onClick={() => { close(); setRenaming(s.id) }} />
                <MenuItem icon={Copy} label="Duplicate" disabled={isGenerated(s.kind)} onClick={() => { close(); duplicateSection(s.id) }} />
                <MenuItem icon={Trash2} label="Delete" danger onClick={() => { close(); removeSection(s.id) }} />
              </>
            )}
          </Popover>
        </span>
      </div>
    )
  }

  let lastMatter: Matter | null = null
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-11 px-4 shrink-0">
        <span className="gb-label">Book structure</span>
        <Popover align="right" width={220} trigger={(_o, toggle) => (
          <button type="button" className="gb-icon-btn h-7 w-7" data-tip="Add a section" data-tip-side="left" aria-label="Add a section" data-testid="add-section" onClick={toggle}><Plus size={15} /></button>
        )}>
          {(close) => (
            <div className="max-h-[420px] overflow-y-auto">
              {TEMPLATES.map((g) => (
                <div key={g.group}>
                  <div className="gb-label px-2.5 pt-2.5 pb-1.5">{g.group}</div>
                  {g.kinds.map((k) => {
                    const single = isGenerated(k) && existing.has(k)
                    return <MenuItem key={k} icon={k === 'chapter' ? BookOpen : FileText} label={k === 'chapter' ? 'New chapter' : SECTION_LABELS[k]} hint={single ? 'added' : undefined} disabled={single} onClick={() => { close(); addSection(k, active) }} />
                  })}
                </div>
              ))}
              <div className="h-px bg-ink-600 my-1.5" />
              <MenuItem icon={FileText} label="Blank page" onClick={() => { close(); addSection('custom', active) }} />
            </div>
          )}
        </Popover>
      </div>
      <div className="flex-1 overflow-y-auto pb-4" data-testid="structure-tree">
        {sections.map((s, i) => {
          const head = s.matter !== lastMatter
          lastMatter = s.matter
          return (
            <div key={s.id}>
              {head && <div className="gb-label px-4 pt-4 pb-2 text-[9.5px]">{MATTER_LABEL[s.matter]}</div>}
              {row(s, i)}
            </div>
          )
        })}
      </div>
      <div className="shrink-0 border-t border-ink-600/70 px-4 py-3 grid grid-cols-3 gap-2" data-testid="book-stats">
        {[['Words', words.toLocaleString()], ['Pages', String(total)], ['Reading', formatReadingTime(words)]].map(([k, v]) => (
          <div key={k}>
            <div className="text-[13px] font-medium text-fog-100 tabular-nums">{v}</div>
            <div className="text-[10px] uppercase tracking-wider text-fog-400 mt-0.5">{k}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ImagesTab() {
  const project = useProject((s) => s.project)
  const images = project?.images ?? []
  const fileRef = useRef<HTMLInputElement>(null)
  const used = useMemo(() => (project ? usedImageIds(project) : new Map<string, number>()), [project])
  const unused = images.filter((m) => !used.has(m.id)).length
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-11 px-4 shrink-0">
        <span className="gb-label">Image library</span>
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif" className="hidden" data-testid="library-file-input"
          onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) void addImagesToLibrary(f).then((ids) => toast(`${ids.length} image${ids.length === 1 ? '' : 's'} added to the library.`, 'ok')); e.target.value = '' }} />
        <IconBtn icon={ImagePlus} label="Add images" side="left" className="h-7 w-7" onClick={() => fileRef.current?.click()} />
      </div>
      {images.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No images yet">Drop a JPG, PNG, WebP, SVG or GIF onto any page, paste one with Ctrl+V, or add files here to reuse them across the book.</EmptyState>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-4 grid grid-cols-2 gap-3 content-start">
          {images.map((m) => {
            const n = used.get(m.id) ?? 0
            const vector = m.type === 'image/svg+xml'
            return (
              <div key={m.id} className="group relative" data-testid="library-item">
                <button type="button" draggable className="block w-full aspect-square rounded-md bg-ink-900 border border-ink-600 overflow-hidden hover:border-cyan transition-colors duration-150 cursor-grab"
                  title={`${m.name} — click to insert at the cursor, or drag onto a page`}
                  onDragStart={(e) => { e.dataTransfer.setData('application/x-glitchbind-image', m.id); e.dataTransfer.effectAllowed = 'copy' }}
                  onClick={() => insertFigure(m.id, null)}>
                  <img src={imageUrl(m.id) ?? undefined} alt={m.name} loading="lazy" decoding="async" className="w-full h-full object-contain" draggable={false} />
                </button>
                <div className="mt-1.5 text-[11px] text-fog-200 truncate">{m.name}</div>
                <div className="text-[10px] text-fog-400 leading-snug">
                  {m.width} × {m.height}px · {formatBytes(m.bytes)}<br />
                  {vector ? 'Vector — any size' : `${(m.width / 300).toFixed(1)}″ wide at 300 DPI`}{n ? ` · used ${n}×` : ' · unused'}
                </div>
                <button type="button" aria-label={`Delete ${m.name}`} className="absolute top-1.5 right-1.5 gb-icon-btn h-6 w-6 bg-ink-900/90 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  onClick={() => { if (n) toast(`“${m.name}” is used ${n}× in the book. Remove it from the pages first.`, 'warn'); else void deleteImage(m.id) }}><Trash2 size={12} /></button>
              </div>
            )
          })}
        </div>
      )}
      {unused > 0 && (
        <div className="shrink-0 border-t border-ink-600/70 p-3">
          <button type="button" className="gb-btn-ghost w-full" onClick={() => void deleteUnusedImages().then((k) => toast(`Removed ${k} unused image${k === 1 ? '' : 's'}.`, 'ok'))}><Trash2 size={13} /> Delete {unused} unused</button>
        </div>
      )}
    </div>
  )
}

function FindTab() {
  const project = useProject((s) => s.project)
  const tick = useUI((s) => s.tick)
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [opts, setOpts] = useState({ caseSensitive: false, wholeWord: false })
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo<BookMatch[]>(() => (project ? searchBook(project, query, opts) : []), [project, query, opts, tick])
  useEffect(() => { setFindHighlight(query, opts); return () => setFindHighlight('', opts) }, [query, opts])
  useEffect(() => { input.current?.focus(); input.current?.select() }, [])
  const go = (i: number): void => {
    if (!matches.length) return
    const n = (i + matches.length) % matches.length
    setCursor(n)
    goToMatch(matches[n], query, opts)
  }
  const cur = matches[Math.min(cursor, matches.length - 1)]
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-4 flex items-center shrink-0"><span className="gb-label">Find & replace</span></div>
      <div className="px-4 space-y-2.5 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fog-400" />
          <input ref={input} className="gb-input pl-8" placeholder="Find in whole book" aria-label="Find" data-testid="find-input" value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }} onKeyDown={(e) => { if (e.key === 'Enter') go(e.shiftKey ? cursor - 1 : cursor + (cur && controller.activeId === cur.sectionId ? 1 : 0)) }} />
        </div>
        <div className="relative">
          <Replace size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fog-400" />
          <input className="gb-input pl-8" placeholder="Replace with" aria-label="Replace with" data-testid="replace-input" value={replacement} onChange={(e) => setReplacement(e.target.value)} />
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11.5px] text-fog-300 tabular-nums" data-testid="find-count">{query ? (matches.length ? `${Math.min(cursor + 1, matches.length)} of ${matches.length}` : 'No matches') : 'Type to search'}</span>
          <span className="flex">
            <IconBtn icon={ChevronUp} label="Previous" side="left" className="h-7 w-7" disabled={!matches.length} onClick={() => go(cursor - 1)} />
            <IconBtn icon={ChevronDown} label="Next" side="left" className="h-7 w-7" disabled={!matches.length} onClick={() => go(cursor + 1)} />
          </span>
        </div>
        <div className="flex gap-2">
          <button type="button" className="gb-btn-outline flex-1" disabled={!cur} onClick={() => {
            if (!cur) return
            if (controller.activeId !== cur.sectionId) { goToMatch(cur, query, opts); return }
            replaceMatch(cur, replacement)
          }}><Replace size={13} /> Replace</button>
          <button type="button" className="gb-btn-outline flex-1" disabled={!matches.length} data-testid="replace-all" onClick={() => {
            const n = replaceAll(query, replacement, opts)
            toast(`Replaced ${n} occurrence${n === 1 ? '' : 's'} across the book.`, 'ok', { label: 'Undo', run: () => { useProject.getState().undoStructure() } })
          }}><ReplaceAll size={13} /> All</button>
        </div>
        <div className="space-y-2.5 pt-2">
          <Toggle label="Match case" checked={opts.caseSensitive} onChange={(v) => setOpts({ ...opts, caseSensitive: v })} />
          <Toggle label="Whole words only" checked={opts.wholeWord} onChange={(v) => setOpts({ ...opts, wholeWord: v })} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto mt-4 border-t border-ink-600/70">
        {!query && <EmptyState icon={Search} title="Search every chapter at once">Results are grouped by section. Click one to jump straight to the page.</EmptyState>}
        {matches.slice(0, 200).map((m, i) => (
          <button key={`${m.sectionId}:${m.from}`} type="button" onClick={() => go(i)}
            className={`w-full text-left px-4 py-2.5 border-b border-ink-700 transition-colors duration-150 ${i === cursor ? 'bg-ink-600/70' : 'hover:bg-ink-700'}`}>
            <div className="text-[10px] uppercase tracking-wider text-fog-400 truncate">{m.sectionTitle}</div>
            <div className="text-[12px] text-fog-200 mt-1 leading-snug line-clamp-2">
              {m.snippet.slice(0, m.snippetAt)}<mark className="bg-amber/30 text-white rounded-sm px-0.5">{m.snippet.slice(m.snippetAt, m.snippetAt + (m.to - m.from))}</mark>{m.snippet.slice(m.snippetAt + (m.to - m.from))}
            </div>
          </button>
        ))}
        {matches.length > 200 && <div className="px-4 py-3 text-[11px] text-fog-400">Showing the first 200 of {matches.length} matches.</div>}
      </div>
    </div>
  )
}

export function Sidebar() {
  const tab = useUI((s) => s.leftTab)
  const tabs = [
    { id: 'structure' as const, icon: ListTree, label: 'Structure' },
    { id: 'images' as const, icon: ImageIcon, label: 'Image library' },
    { id: 'find' as const, icon: Search, label: 'Find & replace' },
  ]
  return (
    <aside className="w-[264px] shrink-0 flex bg-ink-800 border-r border-ink-600/80 gb-fade-in" aria-label="Book sidebar">
      <nav className="w-11 shrink-0 flex flex-col items-center pt-2 gap-1 border-r border-ink-600/60">
        {tabs.map((t) => <IconBtn key={t.id} icon={t.icon} label={t.label} side="right" active={tab === t.id} onClick={() => useUI.setState({ leftTab: t.id })} />)}
      </nav>
      <div className="flex-1 min-w-0">
        {tab === 'structure' && <StructureTab />}
        {tab === 'images' && <ImagesTab />}
        {tab === 'find' && <FindTab />}
      </div>
    </aside>
  )
}
