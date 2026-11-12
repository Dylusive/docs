import { useEffect, useRef, useState } from 'react'
import { BookOpen, Copy, FilePlus2, FolderOpen, MoreHorizontal, Pencil, Sparkles, Trash2, Upload } from 'lucide-react'
import type { ProjectSummary } from '@/types'
import { deleteProject, getPref, listProjects, loadProject, saveProject, setPref, requestPersistence } from '@/lib/storage'
import { blankProject } from '@/lib/defaults'
import { createDemoProject } from '@/lib/demo'
import { navigate } from '@/lib/router'
import { imageUrl, loadProjectImages } from '@/lib/images'
import { fontStack } from '@/lib/fonts'
import { duplicateProjectDeep, importProjectFile } from '@/lib/export/projectFile'
import { toast, useUI } from '@/store/ui'
import { Dialog, Logo, MenuItem, Popover, Toasts } from './ui'
import { formatReadingTime } from '@/lib/wordcount'

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** First launch preloads the demo book — exactly once, even if the screen mounts twice. */
let seeding: Promise<void> | null = null
function seedDemoOnce(): Promise<void> {
  seeding ??= (async () => {
    if (await getPref<boolean>('demo-seeded')) return
    await setPref('demo-seeded', true)
    await document.fonts.ready
    await createDemoProject()
    void requestPersistence()
  })()
  return seeding
}

function CoverThumb({ p }: { p: ProjectSummary }) {
  const img = imageUrl(p.coverImageId)
  return (
    <div className="relative w-full aspect-[2/3] rounded-[3px] overflow-hidden shadow-page transition-transform duration-200 ease-out group-hover:-translate-y-1" style={{ background: p.coverBg }}>
      {img && <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(105deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,0) 38%)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.09)' }} />
      <div className="absolute inset-y-0 left-0 w-[6px] pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.45), rgba(0,0,0,0))', borderRight: '1px solid rgba(255,255,255,.05)' }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
        <div className="w-6 h-px mb-4" style={{ background: p.coverAccent }} />
        <div className="leading-[1.15] text-[17px]" style={{ color: p.coverText, fontFamily: fontStack(p.coverFont) }}>{p.title}</div>
        {p.author && <div className="mt-3 text-[9.5px] uppercase tracking-[0.22em] opacity-75" style={{ color: p.coverText }}>{p.author}</div>}
      </div>
    </div>
  )
}

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [renaming, setRenaming] = useState<ProjectSummary | null>(null)
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null)
  const [name, setName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const glitch = useUI((s) => s.glitch)

  const refresh = async (): Promise<void> => {
    const list = await listProjects()
    for (const s of list) if (s.coverImageId && !imageUrl(s.coverImageId)) { const p = await loadProject(s.id); if (p) await loadProjectImages(p) }
    setProjects(list)
  }
  useEffect(() => {
    void (async () => {
      await seedDemoOnce()
      await refresh()
    })()
  }, [])

  const createBlank = async (): Promise<void> => {
    const p = blankProject()
    await saveProject(p)
    navigate(`/book/${p.id}`)
  }
  const openDemo = async (): Promise<void> => {
    const p = await createDemoProject()
    navigate(`/book/${p.id}`)
  }
  const onImport = async (file: File | undefined): Promise<void> => {
    if (!file) return
    try {
      const { project, warning } = await importProjectFile(file)
      if (warning) toast(warning, 'warn')
      navigate(`/book/${project.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'That file could not be opened.', 'error')
    }
  }

  return (
    <div className={`h-full overflow-auto bg-ink-900 ${glitch ? 'glitch' : 'clean'}`} data-testid="projects-screen">
      <div className="h-[2px] gb-accent-line" />
      <div className="max-w-[1120px] mx-auto px-10 pt-14 pb-24">
        <header className="flex items-end justify-between">
          <div>
            <Logo size={22} />
            <div className="gb-label mt-2">Studio · your books</div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".json,.glitchbind,application/json" className="hidden" onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = '' }} />
            <button type="button" className="gb-btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={14} /> Open project file</button>
            <button type="button" className="gb-btn-outline" onClick={() => void openDemo()}><Sparkles size={14} /> New demo book</button>
            <button type="button" className="gb-btn-solid gb-glitch-hover" data-testid="start-blank" onClick={() => void createBlank()}><FilePlus2 size={14} /> Start Blank Book</button>
          </div>
        </header>

        {!projects && <div className="mt-32 flex flex-col items-center gap-4"><div className="gb-loader" /><div className="gb-label">Opening your shelf</div></div>}

        {projects && projects.length === 0 && (
          <div className="mt-24 flex flex-col items-center text-center gb-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-ink-800 border border-ink-600 flex items-center justify-center text-cyan"><BookOpen size={26} strokeWidth={1.4} /></div>
            <h2 className="font-display text-xl text-white mt-6">Your shelf is empty</h2>
            <p className="text-fog-300 mt-2 max-w-sm leading-relaxed">Start a blank book, or open the demo to see drop caps, footnotes, pull quotes and a full-page illustration already set on real pages.</p>
            <div className="flex gap-2 mt-6">
              <button type="button" className="gb-btn-outline" onClick={() => void openDemo()}><Sparkles size={14} /> Open the demo book</button>
              <button type="button" className="gb-btn-solid" onClick={() => void createBlank()}><FilePlus2 size={14} /> Start Blank Book</button>
            </div>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="mt-14 grid gap-x-10 gap-y-14" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(184px, 1fr))' }}>
            {projects.map((p) => (
              <div key={p.id} className="group relative gb-fade-in" data-testid="project-card">
                <button type="button" className="block w-full text-left" onClick={() => navigate(`/book/${p.id}`)} aria-label={`Open ${p.title}`}>
                  <CoverThumb p={p} />
                  <div className="mt-4 text-[13.5px] font-medium text-fog-100 truncate group-hover:text-white transition-colors">{p.title}</div>
                  <div className="mt-1 text-[11.5px] text-fog-400 truncate">{p.words.toLocaleString()} words · {formatReadingTime(p.words)} read</div>
                  <div className="mt-0.5 text-[11.5px] text-fog-400">Edited {timeAgo(p.updatedAt)}</div>
                </button>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                  <Popover align="right" width={190} trigger={(_o, toggle) => (
                    <button type="button" className="gb-icon-btn bg-ink-900/85 backdrop-blur" aria-label={`Actions for ${p.title}`} onClick={toggle}><MoreHorizontal size={15} /></button>
                  )}>
                    {(close) => (
                      <>
                        <MenuItem icon={FolderOpen} label="Open" onClick={() => navigate(`/book/${p.id}`)} />
                        <MenuItem icon={Pencil} label="Rename" onClick={() => { setName(p.title); setRenaming(p); close() }} />
                        <MenuItem icon={Copy} label="Duplicate" onClick={() => { close(); void duplicateProjectDeep(p.id).then(refresh).then(() => toast(`Duplicated “${p.title}”.`, 'ok')) }} />
                        <MenuItem icon={Trash2} label="Delete" danger onClick={() => { setDeleting(p); close() }} />
                      </>
                    )}
                  </Popover>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <footer className="fixed bottom-0 inset-x-0 h-8 flex items-center justify-center text-[11px] text-fog-400 bg-ink-900/90 backdrop-blur border-t border-ink-700">
        All data stays on this device — no account, no server, no tracking. Works offline after first load.
        <a href="/pagination-test" onClick={(e) => { e.preventDefault(); navigate('/pagination-test') }} className="ml-4 text-fog-400 hover:text-cyan transition-colors underline-offset-2 hover:underline">Pagination proof</a>
      </footer>

      {renaming && (
        <Dialog title="Rename book" width={420} onClose={() => setRenaming(null)}
          footer={<><button type="button" className="gb-btn-ghost" onClick={() => setRenaming(null)}>Cancel</button>
            <button type="button" className="gb-btn-solid" onClick={async () => {
              const proj = await loadProject(renaming.id)
              if (proj && name.trim()) { await saveProject({ ...proj, meta: { ...proj.meta, title: name.trim() }, updatedAt: Date.now() }); await refresh() }
              setRenaming(null)
            }}>Rename</button></>}>
          <input autoFocus className="gb-input" aria-label="Book title" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget.closest('[role=dialog]')?.querySelector('.gb-btn-solid') as HTMLButtonElement | null)?.click() }} />
        </Dialog>
      )}
      {deleting && (
        <Dialog title={`Delete “${deleting.title}”?`} width={440} onClose={() => setDeleting(null)}
          footer={<><button type="button" className="gb-btn-ghost" onClick={() => setDeleting(null)}>Keep it</button>
            <button type="button" className="gb-btn-danger" onClick={async () => { await deleteProject(deleting.id); setDeleting(null); await refresh(); toast('Book deleted.', 'info') }}>Delete forever</button></>}>
          <p className="text-fog-300 leading-relaxed">This removes the book, its images and its version snapshots from this browser. It cannot be undone. If you might want it later, open it and save a project file first.</p>
        </Dialog>
      )}
      <Toasts />
    </div>
  )
}
