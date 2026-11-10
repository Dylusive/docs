import { useEffect, useMemo, useState } from 'react'
import { PanelLeftOpen, PanelRightOpen, X } from 'lucide-react'
import { useProject } from '@/store/project'
import { useUI, loadPrefs } from '@/store/ui'
import { useLayout } from '@/store/layout'
import { navigate } from '@/lib/router'
import { controller, canvasBridge } from '@/lib/editor/controller'
import { editorCtx } from '@/lib/editor/extensions'
import { invalidateLayout, scheduleLayout } from '@/lib/layoutManager'
import { clamp } from '@/lib/units'
import { countDocWords } from '@/lib/wordcount'
import { getPref, setPref } from '@/lib/storage'
import '@/lib/actions'
import { TopBar, saveProjectFile } from './TopBar'
import { FormatBar } from './FormatBar'
import { Sidebar } from './Sidebar'
import { Inspector } from './Inspector'
import { Canvas, ZOOM_MAX, ZOOM_MIN } from './Canvas'
import { IconBtn, Toasts } from './ui'
import { Dialogs } from './Dialogs'
import { runPreflight } from '@/lib/preflight'
import { printBook } from '@/lib/export/print'
import { ProofMode } from './ProofMode'
import { CoverBuilder } from './CoverBuilder'

declare global { interface Window { __gb?: { layout: typeof useLayout; project: typeof useProject; ui: typeof useUI; controller: typeof controller; reveal: (page: number) => void } } }
// a small handle for the automated tests and for curious authors in DevTools; it exposes nothing outside this tab
if (typeof window !== 'undefined') window.__gb = { layout: useLayout, project: useProject, ui: useUI, controller, reveal: (page) => canvasBridge.revealPage(page) }

export default function Studio({ id }: { id: string }) {
  const project = useProject((s) => s.project)
  const ui = useUI()
  const pages = useLayout((s) => s.pages)
  const gen = useLayout((s) => s.gen)
  const [missing, setMissing] = useState(false)

  // open the project
  useEffect(() => {
    let live = true
    void (async () => {
      await loadPrefs()
      controller.ensure()
      controller.reset()
      useLayout.setState({ ready: false, pages: [] })
      const ok = await useProject.getState().open(id)
      if (!live) return
      if (!ok) { setMissing(true); return }
      const p = useProject.getState().project
      invalidateLayout()
      // reopen where the author left off; a book opened for the first time starts at its first page
      const last = await getPref<{ sectionId: string; page: number }>(`last:${id}`)
      const start = p?.sections.find((s) => s.id === last?.sectionId) ?? p?.sections[0]
      useUI.setState({ tab: 'book', proof: false, dialog: null, focusMode: false, livePage: -1, currentPage: 0, rightTab: 'context' })
      controller.activate(start?.id ?? null)
      if (last && start?.id === last.sectionId) {
        const stop = useLayout.subscribe((l) => { if (l.ready) { stop(); requestAnimationFrame(() => canvasBridge.revealPage(Math.min(last.page, l.pages.length - 1))) } })
      }
    })()
    return () => { live = false; void useProject.getState().close(); controller.reset() }
  }, [id])

  // remember the reading position for next time
  useEffect(() => {
    if (!project || !ui.activeSectionId) return
    const t = setTimeout(() => void setPref(`last:${id}`, { sectionId: ui.activeSectionId, page: ui.currentPage }), 600)
    return () => clearTimeout(t)
  }, [id, project?.id, ui.activeSectionId, ui.currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // re-run pagination when anything about the book changes
  useEffect(() => { if (project) scheduleLayout() }, [project])
  useEffect(() => { editorCtx.focusMode = ui.focusMode; controller.refreshDecorations() }, [ui.focusMode])
  useEffect(() => { document.title = project ? `${project.meta.title} — GlitchBind Studio` : 'GlitchBind Studio' }, [project?.meta.title, project])

  // global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = (e.ctrlKey || e.metaKey) && !e.altKey
      const k = e.key.toLowerCase()
      const s = useUI.getState()
      const inField = (e.target as HTMLElement | null)?.closest?.('input, textarea, select') !== null
      if (mod && k === 's') { e.preventDefault(); void useProject.getState().save(); void saveProjectFile(); return }
      if (mod && k === 'p' && !e.shiftKey) { e.preventDefault(); void printBook('interior'); return }
      if (mod && e.shiftKey && k === 'p') { e.preventDefault(); controller.flush(); useUI.setState({ proof: !s.proof }); return }
      if (mod && k === '/') { e.preventDefault(); useUI.setState({ dialog: s.dialog === 'shortcuts' ? null : 'shortcuts' }); return }
      if (mod && k === 'f' && !e.shiftKey) { e.preventDefault(); s.setPref({ leftOpen: true }); useUI.setState({ leftTab: 'find', focusMode: false }); return }
      if (mod && e.shiftKey && k === 'f') { e.preventDefault(); useUI.setState({ focusMode: !s.focusMode }); return }
      if (mod && k === 'z' && !inField) { e.preventDefault(); e.stopPropagation(); if (e.shiftKey) controller.redo(); else controller.undo(); return }
      if (mod && k === 'y' && !inField) { e.preventDefault(); e.stopPropagation(); controller.redo(); return }
      if (mod && (k === '=' || k === '+')) { e.preventDefault(); s.setPref({ zoom: clamp(Math.round((s.zoom + 0.1) * 10) / 10, ZOOM_MIN, ZOOM_MAX), fit: false }); return }
      if (mod && k === '-') { e.preventDefault(); s.setPref({ zoom: clamp(Math.round((s.zoom - 0.1) * 10) / 10, ZOOM_MIN, ZOOM_MAX), fit: false }); return }
      if (mod && k === '0') { e.preventDefault(); s.setPref({ fit: true }); return }
      if (e.key === 'Escape' && s.focusMode && !s.dialog) { useUI.setState({ focusMode: false }) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const issues = useMemo(() => (project ? runPreflight(project, pages, useLayout.getState().geo) : []), [project, gen])
  const issueCount = { errors: issues.filter((i) => i.level === 'error').length, warnings: issues.filter((i) => i.level === 'warn').length }

  if (missing) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <h1 className="font-display text-xl text-white">This book is not in this browser</h1>
        <p className="text-fog-300 mt-3 max-w-md leading-relaxed">Books are stored in the browser you created them in. If its site data was cleared, load your <code className="text-cyan">.glitchbind.json</code> backup from the Projects screen.</p>
        <button type="button" className="gb-btn-solid mt-6" onClick={() => navigate('/')}>Back to your books</button>
      </div>
    )
  }
  if (!project) return <div className="h-full flex flex-col items-center justify-center gap-4"><div className="gb-loader" /><div className="gb-label">Opening book</div></div>

  const focus = ui.focusMode && ui.tab === 'book'
  const words = project.sections.reduce((n, s) => n + countDocWords(s.doc), 0)
  const cur = pages[ui.currentPage]
  return (
    <div className={`h-full flex flex-col ${ui.glitch ? 'glitch' : 'clean'}`} data-testid="studio" data-mode={ui.glitch ? 'glitch' : 'clean'}>
      {!focus && <TopBar issueCount={issueCount} />}
      {!focus && ui.tab === 'book' && <FormatBar />}
      <div className="flex-1 min-h-0 flex">
        {!focus && ui.tab === 'book' && ui.leftOpen && <Sidebar />}
        <main className="flex-1 min-w-0 relative">
          <div className="absolute inset-0" style={{ visibility: ui.tab === 'book' ? 'visible' : 'hidden' }}><Canvas /></div>
          {ui.tab === 'cover' && <CoverBuilder />}
          {!focus && ui.tab === 'book' && !ui.leftOpen && <span className="absolute left-2 top-2 z-10"><IconBtn icon={PanelLeftOpen} label="Show sidebar" side="right" className="bg-ink-800/90 border border-ink-600" onClick={() => ui.setPref({ leftOpen: true })} /></span>}
          {!focus && ui.tab === 'book' && !ui.rightOpen && <span className="absolute right-2 top-2 z-10"><IconBtn icon={PanelRightOpen} label="Show inspector" side="left" className="bg-ink-800/90 border border-ink-600" onClick={() => ui.setPref({ rightOpen: true })} /></span>}
          {focus && (
            <button type="button" className="absolute right-4 top-4 z-10 gb-btn-ghost bg-ink-800/80 border border-ink-600 gb-fade-in" data-testid="exit-focus" onClick={() => ui.set({ focusMode: false })}><X size={13} /> Exit Focus Mode <span className="text-fog-400 font-mono text-[10.5px] ml-1">Esc</span></button>
          )}
        </main>
        {!focus && ui.tab === 'book' && ui.rightOpen && <Inspector />}
      </div>
      {!focus && (
        <footer className="h-7 shrink-0 flex items-center justify-between px-3 bg-ink-800 border-t border-ink-600/80 text-[11px] text-fog-400" data-testid="status-bar">
          <span>All data stays on this device — no account, no server, no tracking.</span>
          <span className="flex items-center gap-4 tabular-nums">
            {ui.tab === 'book' && cur && <span data-testid="page-indicator">Page {cur.index + 1} of {pages.length}{cur.folio && cur.showFolio ? ` · folio ${cur.folio}` : ''} · {cur.side === 'left' ? 'left' : 'right'}</span>}
            <span>{words.toLocaleString()} words</span>
            <span>{project.settings.trim.w} × {project.settings.trim.h} in</span>
          </span>
        </footer>
      )}
      {ui.proof && <ProofMode />}
      <Dialogs issues={issues} />
      <Toasts />
    </div>
  )
}
