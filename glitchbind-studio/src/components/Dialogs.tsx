import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, BookImage, BookText, CheckCircle2, CircleAlert, FileCode2, FileDown, FileText, FileType2, FolderDown, History, Info, MonitorSmartphone, RotateCcw, Trash2, Upload } from 'lucide-react'
import type { BookMeta, Snapshot } from '@/types'
import type { Issue } from '@/lib/preflight'
import { useUI, toast } from '@/store/ui'
import { useProject } from '@/store/project'
import { useLayout } from '@/store/layout'
import { controller } from '@/lib/editor/controller'
import { coverGeo } from '@/lib/cover'
import { spineWidth } from '@/lib/kdp'
import { printBook, printSize } from '@/lib/export/print'
import { buildEpub, buildHtml } from '@/lib/export/epub'
import { buildDocx } from '@/lib/export/docx'
import { buildText } from '@/lib/export/text'
import { downloadBlob, safeFileName } from '@/lib/export/projectFile'
import { importManuscript } from '@/lib/importers'
import { htmlToDoc } from '@/lib/editor/html'
import { addImagesToLibrary, jumpToPage, jumpToSection } from '@/lib/actions'
import { importImage, imageUrl } from '@/lib/images'
import { listSnapshots, saveSnapshots, projectWords } from '@/lib/storage'
import { HELP, SHORTCUTS } from '@/lib/helpContent'
import { uid } from '@/lib/units'
import { Dialog, EmptyState, Field } from './ui'
import { saveProjectFile } from './TopBar'

const close = (): void => useUI.setState({ dialog: null })

// ------------------------------------------------------------------ preflight
const LEVEL = {
  error: { icon: CircleAlert, cls: 'text-danger', label: 'Must fix' },
  warn: { icon: AlertTriangle, cls: 'text-amber', label: 'Should fix' },
  info: { icon: Info, cls: 'text-fog-300', label: 'Good to know' },
} as const

function IssueList({ issues }: { issues: Issue[] }) {
  const go = (i: Issue): void => {
    close()
    if (i.open === 'metadata') { useUI.setState({ dialog: 'metadata' }); return }
    if (i.open) { useUI.getState().setPref({ rightOpen: true }); useUI.setState({ rightTab: i.open, tab: 'book' }); return }
    if (i.page !== undefined) jumpToPage(i.page)
    else if (i.sectionId) jumpToSection(i.sectionId)
  }
  if (!issues.length) return <EmptyState icon={CheckCircle2} title="Nothing to fix">Preflight found no problems. This book is ready to export.</EmptyState>
  return (
    <div className="space-y-1.5" data-testid="preflight-list">
      {issues.map((i) => {
        const L = LEVEL[i.level]
        const clickable = i.page !== undefined || !!i.sectionId || !!i.open
        return (
          <button key={i.id} type="button" disabled={!clickable} onClick={() => go(i)} data-level={i.level}
            className="w-full text-left flex gap-3 p-3 rounded-lg border border-ink-600 bg-ink-900/60 hover:border-ink-400 disabled:hover:border-ink-600 transition-colors duration-150">
            <L.icon size={16} className={`${L.cls} shrink-0 mt-0.5`} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-fog-100 font-medium">{i.title}</span>
              <span className="block text-[12px] text-fog-400 mt-1 leading-snug">{i.detail}</span>
            </span>
            {clickable && <span className="text-[11px] text-cyan shrink-0 self-center">{i.page !== undefined ? `Go to p. ${i.page + 1}` : 'Open'}</span>}
          </button>
        )
      })}
    </div>
  )
}

function PreflightDialog({ issues }: { issues: Issue[] }) {
  const e = issues.filter((i) => i.level === 'error').length
  const w = issues.filter((i) => i.level === 'warn').length
  return (
    <Dialog title="Preflight" subtitle={issues.length ? `${e} to fix · ${w} to review · ${issues.length - e - w} notes — click any item to jump to it` : 'Checked against print rules just now'} width={640} onClose={close}
      footer={<><button type="button" className="gb-btn-ghost" onClick={close}>Close</button><button type="button" className="gb-btn-solid" onClick={() => useUI.setState({ dialog: 'export' })}>Continue to export</button></>}>
      <IssueList issues={issues} />
    </Dialog>
  )
}

// ------------------------------------------------------------------ export
function ExportDialog({ issues }: { issues: Issue[] }) {
  const project = useProject((s) => s.project)
  const pages = useLayout((s) => s.pages.length)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<string[]>([])
  if (!project) return null
  const s = project.settings
  const g = coverGeo(project, pages)
  const interior = printSize('interior')
  const errors = issues.filter((i) => i.level === 'error').length
  const warns = issues.filter((i) => i.level === 'warn').length
  const base = safeFileName(project.meta.title)
  const run = async (id: string, fn: () => Promise<void>): Promise<void> => {
    controller.flush()
    setBusy(id)
    try { await fn() } catch (err) { console.error(err); toast(`Export failed: ${err instanceof Error ? err.message : 'unknown error'}`, 'error') }
    setBusy(null)
  }
  const fresh = (): NonNullable<typeof project> => useProject.getState().project ?? project
  const items = [
    { id: 'interior', icon: BookText, name: 'Interior Print PDF', tag: 'KDP-Ready Print PDF (RGB)', desc: `${pages} pages at ${interior.widthIn} × ${interior.heightIn} in${s.bleed ? ' (trim + bleed)' : ''}. Exact margins and page numbers, no guides.`, go: () => { close(); return printBook('interior') } },
    { id: 'cover', icon: BookImage, name: 'Cover Print PDF', tag: 'Separate file', desc: `One page, full wrap ${g.width.toFixed(3)} × ${g.height.toFixed(3)} in, from the Cover Builder.`, go: () => { close(); return printBook('cover') } },
    { id: 'screen', icon: MonitorSmartphone, name: 'Screen PDF', tag: 'For reading on screens', desc: `${s.trim.w} × ${s.trim.h} in pages, no bleed, page colour included.`, go: () => { close(); return printBook('screen') } },
    { id: 'epub', icon: FileType2, name: 'EPUB 3', tag: 'Reflowable e-book', desc: 'Metadata, contents and images included. For Kindle (via KDP), Apple Books, Kobo.', go: async () => { const r = await buildEpub(fresh()); downloadBlob(r.blob, `${base}.epub`); setNotes(r.warnings); toast('EPUB downloaded.', 'ok') } },
    { id: 'docx', icon: FileText, name: 'Word document', tag: '.docx', desc: 'Headings, footnotes, tables and images for editors and agents.', go: async () => { downloadBlob(await buildDocx(fresh()), `${base}.docx`); toast('Word document downloaded.', 'ok') } },
    { id: 'html', icon: FileCode2, name: 'HTML', tag: 'Single file', desc: 'One self-contained web page with images embedded.', go: async () => { downloadBlob(await buildHtml(fresh()), `${base}.html`); toast('HTML downloaded.', 'ok') } },
    { id: 'txt', icon: FileDown, name: 'Plain text', tag: '.txt', desc: 'Just the words, chapter by chapter.', go: async () => { downloadBlob(new Blob([buildText(fresh())], { type: 'text/plain;charset=utf-8' }), `${base}.txt`); toast('Text file downloaded.', 'ok') } },
  ]
  return (
    <Dialog title="Export" subtitle="Interior and cover are separate files — KDP and IngramSpark ask for them separately." width={760} onClose={close}>
      <div className="grid grid-cols-4 gap-px bg-ink-600 rounded-lg overflow-hidden border border-ink-600" data-testid="export-summary">
        {[['Trim size', `${s.trim.w} × ${s.trim.h} in`], ['Pages', String(pages)], ['Spine', `${spineWidth(pages, 'white').toFixed(3)} in white · ${spineWidth(pages, 'cream').toFixed(3)} in cream`], ['Full cover', `${g.width.toFixed(3)} × ${g.height.toFixed(3)} in`]].map(([k, v]) => (
          <div key={k} className="bg-ink-900 px-4 py-3">
            <div className="gb-label">{k}</div>
            <div className="text-[13px] text-fog-100 mt-1.5 tabular-nums leading-snug">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-stretch gap-3">
        <button type="button" className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors duration-150 ${errors ? 'border-danger/50 hover:bg-danger/5' : warns ? 'border-amber/40 hover:bg-amber/5' : 'border-ok/40 hover:bg-ok/5'}`} onClick={() => useUI.setState({ dialog: 'preflight' })} data-testid="export-preflight">
          {errors ? <CircleAlert size={18} className="text-danger shrink-0" /> : warns ? <AlertTriangle size={18} className="text-amber shrink-0" /> : <CheckCircle2 size={18} className="text-ok shrink-0" />}
          <span>
            <span className="block text-[13px] text-fog-100 font-medium">{errors ? `Preflight: ${errors} problem${errors === 1 ? '' : 's'} to fix first` : warns ? `Preflight: ${warns} thing${warns === 1 ? '' : 's'} to review` : 'Preflight passed'}</span>
            <span className="block text-[11.5px] text-fog-400 mt-0.5">Checked automatically just now. Click to see the list.</span>
          </span>
        </button>
        <button type="button" className="flex items-center gap-3 px-4 py-3 rounded-lg border border-ink-500 hover:border-cyan text-left transition-colors duration-150" onClick={() => void saveProjectFile()} data-testid="export-backup">
          <FolderDown size={18} className="text-cyan shrink-0" />
          <span>
            <span className="block text-[13px] text-fog-100 font-medium">Save a project backup</span>
            <span className="block text-[11.5px] text-fog-400 mt-0.5">Do this before you publish.</span>
          </span>
        </button>
      </div>

      <div className="mt-5 space-y-2" data-testid="export-list">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-ink-900/60 border border-ink-600">
            <it.icon size={18} strokeWidth={1.5} className="text-fog-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5"><span className="text-[13.5px] text-white font-medium">{it.name}</span><span className="gb-chip bg-ink-600 text-fog-300">{it.tag}</span></div>
              <div className="text-[12px] text-fog-400 mt-1 leading-snug">{it.desc}</div>
            </div>
            <button type="button" className={it.id === 'interior' ? 'gb-btn-solid' : 'gb-btn-outline'} disabled={busy !== null} data-testid={`export-${it.id}`} onClick={() => void run(it.id, async () => { await it.go() })}>
              {busy === it.id ? 'Working…' : it.id === 'interior' || it.id === 'cover' || it.id === 'screen' ? 'Open print view' : 'Download'}
            </button>
          </div>
        ))}
      </div>
      {notes.length > 0 && <div className="mt-3 rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-[12px] text-fog-200 leading-snug space-y-1">{notes.map((n) => <p key={n}>{n}</p>)}</div>}

      <div className="mt-5 rounded-lg border border-ink-600 px-4 py-3.5 text-[12px] text-fog-300 leading-relaxed" data-testid="pdf-honesty">
        <p><span className="text-fog-100 font-medium">About these PDFs, plainly.</span> They are made by your browser's print engine, so they are RGB PDFs with real, selectable text and embedded fonts. A browser cannot produce PDF/X-1a or CMYK files, and this app does not pretend to. KDP and IngramSpark both accept RGB PDFs and convert the colour themselves, so expect small colour shifts on paper.</p>
        <p className="mt-2"><span className="text-fog-100 font-medium">In the print window:</span> Destination “Save as PDF” · Margins “None” · untick “Headers and footers” · tick “Background graphics”. The page size is set for you.</p>
      </div>
    </Dialog>
  )
}

// ------------------------------------------------------------------ metadata
function MetadataDialog() {
  const project = useProject((s) => s.project)
  const fileRef = useRef<HTMLInputElement>(null)
  if (!project) return null
  const m = project.meta
  const set = (patch: Partial<BookMeta>): void => useProject.getState().mutate((p) => ({ ...p, meta: { ...p.meta, ...patch } }), { label: 'book metadata' })
  const text = (key: keyof BookMeta, label: string, opts: { placeholder?: string; wide?: boolean; testid?: string } = {}) => (
    <div className={opts.wide ? 'col-span-2' : ''}>
      <Field label={label}><input className="gb-input" aria-label={label} data-testid={opts.testid} placeholder={opts.placeholder} value={(m[key] as string) ?? ''} onChange={(e) => set({ [key]: e.target.value } as Partial<BookMeta>)} /></Field>
    </div>
  )
  const logo = imageUrl(m.logoImageId)
  return (
    <Dialog title="Book metadata" subtitle="Typed once, used everywhere: title page, copyright page, running heads, cover, barcode box and EPUB." width={680} onClose={close}
      footer={<button type="button" className="gb-btn-solid" onClick={close}>Done</button>}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
        {text('title', 'Title', { wide: true, testid: 'meta-title' })}
        {text('subtitle', 'Subtitle', { wide: true })}
        {text('author', 'Author', { testid: 'meta-author' })}
        {text('publisher', 'Publisher / imprint')}
        {text('isbn13', 'ISBN-13', { placeholder: '978-…', testid: 'meta-isbn13' })}
        {text('isbn10', 'ISBN-10')}
        {text('copyrightYear', 'Copyright year')}
        {text('copyrightHolder', 'Copyright holder', { placeholder: m.author || 'Usually the author' })}
        {text('edition', 'Edition')}
        {text('language', 'Language code', { placeholder: 'en' })}
        <div className="col-span-2">
          <Field label="Description (back-cover blurb, EPUB description)"><textarea className="gb-input h-24 py-2 leading-snug resize-none" aria-label="Description" value={m.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        </div>
        <div className="col-span-2">
          <Field label="Rights statement (copyright page)"><textarea className="gb-input h-20 py-2 leading-snug resize-none" aria-label="Rights statement" value={m.rights} onChange={(e) => set({ rights: e.target.value })} /></Field>
        </div>
        <div className="col-span-2 flex items-center gap-4">
          <div className="w-20 h-14 rounded-md border border-ink-600 bg-white flex items-center justify-center overflow-hidden shrink-0">
            {logo ? <img src={logo} alt="Publisher logo" className="max-w-full max-h-full object-contain" /> : <span className="text-[10px] text-fog-400">No logo</span>}
          </div>
          <div className="flex-1">
            <div className="text-[12.5px] text-fog-200">Publisher logo</div>
            <div className="text-[11px] text-fog-400 mt-0.5">Appears at the foot of the title page.</div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) { const meta = await importImage(f, f.name); useProject.getState().mutate((p) => ({ ...p, images: [...p.images, meta], meta: { ...p.meta, logoImageId: meta.id } }), { label: 'publisher logo' }) }
            e.target.value = ''
          }} />
          <button type="button" className="gb-btn-outline" onClick={() => fileRef.current?.click()}><Upload size={13} /> {logo ? 'Replace' : 'Choose'}</button>
          {logo && <button type="button" className="gb-btn-ghost" onClick={() => set({ logoImageId: null })}>Remove</button>}
        </div>
      </div>
    </Dialog>
  )
}

// ------------------------------------------------------------------ help + shortcuts
function HelpDialog() {
  return (
    <Dialog title="Help & getting started" subtitle="The same guide is in START-HERE.md in the project folder." width={680} onClose={close}>
      <div className="space-y-6" data-testid="help-content">
        {HELP.map((h) => (
          <section key={h.title}>
            <h3 className="text-[13.5px] font-semibold text-white">{h.title}</h3>
            {h.body.map((b) => <p key={b} className="text-[12.5px] text-fog-300 mt-2 leading-relaxed">{b}</p>)}
            {h.steps && <ol className="mt-2.5 space-y-1.5">{h.steps.map((s, i) => <li key={s} className="flex gap-3 text-[12.5px] text-fog-200 leading-relaxed"><span className="text-cyan font-mono text-[11px] mt-0.5 shrink-0">{i + 1}</span><span>{s}</span></li>)}</ol>}
          </section>
        ))}
        <p className="text-[11.5px] text-fog-400 pt-2 border-t border-ink-600">GlitchBind Studio works offline after its first load. No account, no server, no analytics, no tracking — all data stays on this device.</p>
      </div>
    </Dialog>
  )
}

function ShortcutsDialog() {
  const mac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
  const fmt = (k: string): string => (mac ? k.replace(/Ctrl/g, '⌘').replace(/Alt/g, '⌥') : k)
  return (
    <Dialog title="Keyboard shortcuts" width={640} onClose={close}>
      <div className="grid grid-cols-2 gap-x-10 gap-y-6" data-testid="shortcuts">
        {SHORTCUTS.map((g) => (
          <section key={g.group}>
            <div className="gb-label mb-2.5">{g.group}</div>
            {g.items.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-1.5 border-b border-ink-700">
                <span className="text-[12px] text-fog-300 leading-snug">{v}</span>
                <kbd className="font-mono text-[10.5px] text-fog-100 bg-ink-900 border border-ink-600 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0">{fmt(k)}</kbd>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Dialog>
  )
}

// ------------------------------------------------------------------ snapshots
function SnapshotsDialog() {
  const project = useProject((s) => s.project)
  const [snaps, setSnaps] = useState<Snapshot[] | null>(null)
  const [name, setName] = useState('')
  const [confirm, setConfirm] = useState<Snapshot | null>(null)
  const id = project?.id
  useEffect(() => { if (id) void listSnapshots(id).then(setSnaps) }, [id])
  if (!project) return null
  const create = async (label?: string): Promise<Snapshot[]> => {
    controller.flush()
    const p = useProject.getState().project ?? project
    const snap: Snapshot = { id: uid('snap_'), name: (label ?? name).trim() || `Snapshot ${new Date().toLocaleString()}`, createdAt: Date.now(), words: projectWords(p), project: p }
    const next = [snap, ...(await listSnapshots(p.id))]
    await saveSnapshots(p.id, next)
    setSnaps(next)
    setName('')
    return next
  }
  const restore = async (snap: Snapshot, keepCurrent: boolean): Promise<void> => {
    if (keepCurrent) await create(`Before restoring “${snap.name}”`)
    useProject.getState().mutate((p) => {
      const have = new Set(snap.project.images.map((i) => i.id))
      return { ...snap.project, id: p.id, images: [...snap.project.images, ...p.images.filter((i) => !have.has(i.id))] }
    }, { label: `restore “${snap.name}”`, docs: true })
    setConfirm(null)
    close()
    toast(`Restored “${snap.name}”.`, 'ok', { label: 'Undo', run: () => { useProject.getState().undoStructure() } })
  }
  return (
    <Dialog title="Version snapshots" subtitle="A named copy of the whole book at a moment in time, kept in this browser." width={600} onClose={close}>
      <div className="flex gap-2">
        <input className="gb-input" placeholder="Name this version, e.g. “Before the big rewrite”" aria-label="Snapshot name" data-testid="snapshot-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void create().then(() => toast('Snapshot saved.', 'ok')) }} />
        <button type="button" className="gb-btn-solid shrink-0" data-testid="snapshot-create" onClick={() => void create().then(() => toast('Snapshot saved.', 'ok'))}><History size={14} /> Take snapshot</button>
      </div>
      <div className="mt-4 space-y-1.5" data-testid="snapshot-list">
        {snaps && snaps.length === 0 && <EmptyState icon={History} title="No snapshots yet">Take one before a risky edit. Restoring always asks first, and can keep a copy of where you are now.</EmptyState>}
        {snaps?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-ink-600 bg-ink-900/60">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-fog-100 truncate">{s.name}</div>
              <div className="text-[11px] text-fog-400 mt-0.5">{new Date(s.createdAt).toLocaleString()} · {s.words.toLocaleString()} words · {s.project.sections.length} sections</div>
            </div>
            <button type="button" className="gb-btn-outline" data-testid="snapshot-restore" onClick={() => setConfirm(s)}><RotateCcw size={13} /> Restore</button>
            <button type="button" className="gb-icon-btn" aria-label={`Delete snapshot ${s.name}`} onClick={async () => { const next = (snaps ?? []).filter((x) => x.id !== s.id); await saveSnapshots(project.id, next); setSnaps(next) }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      {confirm && (
        <Dialog title={`Restore “${confirm.name}”?`} width={460} onClose={() => setConfirm(null)}
          footer={<><button type="button" className="gb-btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
            <button type="button" className="gb-btn-outline" onClick={() => void restore(confirm, false)}>Restore without keeping</button>
            <button type="button" className="gb-btn-solid" data-testid="snapshot-confirm" onClick={() => void restore(confirm, true)}>Keep current, then restore</button></>}>
          <p className="text-[12.5px] text-fog-300 leading-relaxed">This replaces the book as it is now with the version from {new Date(confirm.createdAt).toLocaleString()}. “Keep current” saves where you are now as a new snapshot first, so nothing is lost.</p>
        </Dialog>
      )}
    </Dialog>
  )
}

// ------------------------------------------------------------------ import
function ImportDialog() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [busy, setBusy] = useState(false)
  const run = async (file: File | undefined): Promise<void> => {
    if (!file) return
    setBusy(true)
    try {
      controller.flush()
      const result = await importManuscript(file, async (blob, name) => (await addImagesToLibrary([blob], [name]))[0] ?? '', htmlToDoc)
      useProject.getState().mutate((p) => {
        const kept = mode === 'replace' ? p.sections.filter((s) => s.kind !== 'chapter') : p.sections
        const at = kept.reduce((last, s, i) => (s.matter !== 'back' ? i + 1 : last), 0)
        const next = [...kept]
        next.splice(at, 0, ...result.sections)
        return { ...p, sections: next }
      }, { label: `import ${file.name}` })
      close()
      toast(`Imported ${result.note} from ${file.name}.`, 'ok', { label: 'Undo', run: () => { useProject.getState().undoStructure() } })
      requestAnimationFrame(() => jumpToSection(result.sections[0].id))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'That file could not be imported.', 'error')
    }
    setBusy(false)
  }
  return (
    <Dialog title="Import a manuscript" subtitle="Plain text, Markdown or Word. Chapters are split automatically." width={540} onClose={close}>
      <div className="space-y-2">
        {([['append', 'Add as new chapters', 'Imported chapters go after your existing ones.'], ['replace', 'Replace all chapters', 'Front and back matter stay; current chapters are removed (undoable).']] as const).map(([v, t, d]) => (
          <label key={v} className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors duration-150 ${mode === v ? 'border-cyan bg-cyan/5' : 'border-ink-600 hover:border-ink-400'}`}>
            <input type="radio" name="import-mode" className="accent-cyan mt-0.5" checked={mode === v} onChange={() => setMode(v)} />
            <span><span className="block text-[13px] text-fog-100">{t}</span><span className="block text-[11.5px] text-fog-400 mt-0.5">{d}</span></span>
          </label>
        ))}
      </div>
      <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" data-testid="import-file-input" onChange={(e) => { void run(e.target.files?.[0]); e.target.value = '' }} />
      <button type="button" className="gb-btn-solid w-full mt-4 h-10" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={14} /> {busy ? 'Importing…' : 'Choose a .txt, .md or .docx file'}</button>
      <p className="text-[11.5px] text-fog-400 mt-3 leading-relaxed">A new chapter starts at every line like “Chapter 4”, “CHAPTER FOUR: The Storm”, “Prologue” — or at every Heading 1 (Word) / <code># Heading</code> (Markdown). Bold, italics, lists, block quotes and pictures in .docx files are kept.</p>
    </Dialog>
  )
}

export function Dialogs({ issues }: { issues: Issue[] }) {
  const dialog = useUI((s) => s.dialog)
  if (dialog === 'export') return <ExportDialog issues={issues} />
  if (dialog === 'preflight') return <PreflightDialog issues={issues} />
  if (dialog === 'metadata') return <MetadataDialog />
  if (dialog === 'help') return <HelpDialog />
  if (dialog === 'shortcuts') return <ShortcutsDialog />
  if (dialog === 'snapshots') return <SnapshotsDialog />
  if (dialog === 'import') return <ImportDialog />
  return null
}
