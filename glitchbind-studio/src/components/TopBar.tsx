import {
  BookOpen, Download, Eye, File as FileIcon, FolderDown, FolderUp, HelpCircle, History, Keyboard, Maximize, Minus, MoreHorizontal, PanelLeft, PanelRight, Plus,
  Rows3, Ruler, ShieldCheck, Zap, ZapOff,
} from 'lucide-react'
import { useUI, toast } from '@/store/ui'
import { useProject } from '@/store/project'
import { useLayout } from '@/store/layout'
import { navigate } from '@/lib/router'
import { PRESETS, TRIM_SIZES } from '@/lib/kdp'
import { applyPreset, setCustomTrim, setTrim } from '@/lib/actions'
import { downloadProjectFile } from '@/lib/export/projectFile'
import { controller } from '@/lib/editor/controller'
import { clamp } from '@/lib/units'
import type { PresetId, ViewMode } from '@/types'
import { IconBtn, Logo, MenuItem, Popover, Seg, Select, Toggle } from './ui'
import { ZOOM_MAX, ZOOM_MIN } from './Canvas'

export async function saveProjectFile(): Promise<void> {
  controller.flush()
  const p = useProject.getState().project
  if (!p) return
  const name = await downloadProjectFile(p)
  toast(`Project file saved as ${name}. Keep it somewhere safe — it is your backup.`, 'ok')
}

function SaveStatus() {
  const state = useProject((s) => s.saveState)
  const at = useProject((s) => s.savedAt)
  const time = at ? new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  const label = state === 'saved' ? `Saved ${time}` : state === 'saving' ? 'Saving…' : state === 'dirty' ? 'Unsaved changes' : 'Save failed — check browser storage'
  const dot = state === 'saved' ? 'bg-ok' : state === 'error' ? 'bg-danger' : 'bg-amber'
  return (
    <button type="button" className="flex items-center gap-2 h-8 px-2 rounded-md text-[11.5px] text-fog-300 hover:bg-ink-600 transition-colors tabular-nums whitespace-nowrap" data-testid="save-status" data-state={state}
      data-tip="Autosaves to this browser every 10 s and when you pause. Click to save now." data-tip-side="left" onClick={() => void useProject.getState().save()}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${state === 'saving' ? 'animate-pulse' : ''}`} />{label}
    </button>
  )
}

export function TopBar({ issueCount }: { issueCount: { errors: number; warnings: number } }) {
  const project = useProject((s) => s.project)
  const ui = useUI()
  const pages = useLayout((s) => s.pages.length)
  if (!project) return null
  const s = project.settings
  const zoomPct = Math.round((ui.fit ? ui.zoom : ui.zoom) * 100)
  const step = (d: number): void => ui.setPref({ zoom: clamp(Math.round((ui.zoom + d) * 20) / 20, ZOOM_MIN, ZOOM_MAX), fit: false })
  const Sep = () => <span className="w-px h-5 bg-ink-600 mx-2 shrink-0" />
  const badge = issueCount.errors || issueCount.warnings
  return (
    <header className="h-12 shrink-0 flex items-center pl-3 pr-2 bg-ink-800 border-b border-ink-600/80 relative z-30" data-testid="top-bar">
      <button type="button" className="flex items-center h-8 px-1.5 rounded-md hover:bg-ink-600 transition-colors" aria-label="Back to your books" data-tip="All books"
        onClick={() => { void useProject.getState().save().then(() => navigate('/')) }}>
        <Logo size={14} />
      </button>
      <Sep />
      <button type="button" className="max-w-[220px] h-8 px-2 rounded-md text-left hover:bg-ink-600 transition-colors gb-glitch-hover" data-tip="Book metadata" data-testid="book-title" onClick={() => ui.set({ dialog: 'metadata' })}>
        <span className="block truncate text-[13px] font-medium text-white">{project.meta.title || 'Untitled Book'}</span>
      </button>
      <span className="ml-2"><Seg value={ui.tab} onChange={(v) => { controller.flush(); ui.set({ tab: v }) }} options={[{ value: 'book', label: 'Interior' }, { value: 'cover', label: 'Cover' }]} /></span>
      <Sep />
      <Select label="Publishing preset" className="w-[178px] shrink-0" value={s.preset} onChange={(v) => { if (v !== 'custom') applyPreset(v as PresetId) }}
        options={[...PRESETS.map((p) => ({ value: p.id as string, label: p.name })), ...(s.preset === 'custom' ? [{ value: 'custom', label: 'Custom' }] : [])]} />
      <Select label="Trim size" className="w-[138px] shrink-0 ml-2" value={s.trimId} onChange={(v) => (v === 'custom' ? (setCustomTrim(s.trim.w, s.trim.h), ui.set({ rightTab: 'layout' }), ui.setPref({ rightOpen: true })) : setTrim(v))}
        options={[...TRIM_SIZES.map((t) => ({ value: t.id, label: t.label })), { value: 'custom', label: 'Custom…' }]} />
      <span className="flex-1 min-w-2" />
      {ui.tab === 'book' && (
        <>
          <Seg<ViewMode> value={ui.view} onChange={(v) => ui.setPref({ view: v })} options={[
            { value: 'single', label: <FileIcon size={14} />, tip: 'Single page' },
            { value: 'spread', label: <BookOpen size={14} />, tip: 'Two-page spread' },
            { value: 'continuous', label: <Rows3 size={14} />, tip: 'Continuous' },
          ]} />
          <span className="flex items-center ml-2">
            <IconBtn icon={Minus} label="Zoom out" onClick={() => step(-0.1)} disabled={!ui.fit && ui.zoom <= ZOOM_MIN} />
            <button type="button" className="w-12 h-8 rounded-md text-[11.5px] tabular-nums text-fog-200 hover:bg-ink-600 transition-colors" data-tip="Reset to 100%" data-testid="zoom-label" onClick={() => ui.setPref({ zoom: 1, fit: false })}>{ui.fit ? 'Fit' : `${zoomPct}%`}</button>
            <IconBtn icon={Plus} label="Zoom in" onClick={() => step(0.1)} disabled={!ui.fit && ui.zoom >= ZOOM_MAX} />
            <IconBtn icon={Maximize} label="Fit to window" active={ui.fit} onClick={() => ui.setPref({ fit: !ui.fit })} />
          </span>
          <Popover align="right" width={248} trigger={(open, toggle) => <IconBtn icon={Ruler} label="Guides" active={open || ui.guides.margins || ui.guides.safe || ui.guides.bleed} onClick={toggle} />}>
            {() => (
              <div className="p-2.5 space-y-3">
                <Toggle label="Margin guides" checked={ui.guides.margins} onChange={(v) => ui.setPref({ guides: { ...ui.guides, margins: v } })} />
                <Toggle label="Safe zone (0.25″)" checked={ui.guides.safe} onChange={(v) => ui.setPref({ guides: { ...ui.guides, safe: v } })} />
                <Toggle label="Bleed line (0.125″, red)" checked={ui.guides.bleed} onChange={(v) => ui.setPref({ guides: { ...ui.guides, bleed: v } })} />
                <p className="text-[11px] text-fog-400 leading-snug">Guides are for your eyes only — they are never part of a PDF or any other export.</p>
              </div>
            )}
          </Popover>
          <Sep />
        </>
      )}
      <button type="button" className="gb-btn-ghost px-2.5 relative" data-testid="preflight-button" data-tip="Preflight check" onClick={() => ui.set({ dialog: 'preflight' })}>
        <ShieldCheck size={15} strokeWidth={1.75} />
        {badge > 0 && <span className={`min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center ${issueCount.errors ? 'bg-danger text-white' : 'bg-amber text-ink-950'}`}>{badge}</span>}
      </button>
      <IconBtn icon={Eye} label="Proof Mode  Ctrl+Shift+P" onClick={() => { controller.flush(); ui.set({ proof: true }) }} />
      <button type="button" className="gb-btn-solid ml-1.5 gb-glitch-hover" data-testid="export-button" onClick={() => ui.set({ dialog: 'export' })}><Download size={14} /> Export</button>
      <Sep />
      <SaveStatus />
      <IconBtn icon={ui.glitch ? Zap : ZapOff} label={ui.glitch ? 'Glitch Mode — switch to Clean Pro' : 'Clean Pro Mode — switch to Glitch'} side="left" active={ui.glitch} onClick={() => ui.setPref({ glitch: !ui.glitch })} />
      <Popover align="right" width={232} trigger={(_o, toggle) => <IconBtn icon={MoreHorizontal} label="More" side="left" onClick={toggle} />}>
        {(close) => (
          <>
            <MenuItem icon={FolderDown} label="Save project file" hint="Ctrl+S" onClick={() => { close(); void saveProjectFile() }} />
            <MenuItem icon={FolderUp} label="Import .txt / .md / .docx" onClick={() => { close(); ui.set({ dialog: 'import' }) }} />
            <MenuItem icon={History} label="Version snapshots" onClick={() => { close(); ui.set({ dialog: 'snapshots' }) }} />
            <div className="h-px bg-ink-600 my-1.5" />
            <MenuItem icon={PanelLeft} label={ui.leftOpen ? 'Hide left sidebar' : 'Show left sidebar'} onClick={() => ui.setPref({ leftOpen: !ui.leftOpen })} />
            <MenuItem icon={PanelRight} label={ui.rightOpen ? 'Hide inspector' : 'Show inspector'} onClick={() => ui.setPref({ rightOpen: !ui.rightOpen })} />
            <div className="h-px bg-ink-600 my-1.5" />
            <MenuItem icon={Keyboard} label="Keyboard shortcuts" hint="Ctrl+/" onClick={() => { close(); ui.set({ dialog: 'shortcuts' }) }} />
            <MenuItem icon={HelpCircle} label="Help & getting started" onClick={() => { close(); ui.set({ dialog: 'help' }) }} />
          </>
        )}
      </Popover>
      <span className="sr-only" data-testid="page-count">{pages}</span>
    </header>
  )
}
