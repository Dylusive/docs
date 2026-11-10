import { create } from 'zustand'
import type { PMDoc, Project } from '@/types'
import { loadProject, saveProject } from '@/lib/storage'
import { loadProjectImages } from '@/lib/images'
import { registerCustomFonts } from '@/lib/fonts'
import { getFont } from '@/lib/storage'
import { APP_VERSION } from '@/lib/defaults'

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error'
interface UndoEntry { project: Project; at: number; label: string; docs: boolean }
export interface MutateOptions { label?: string; undoable?: boolean; /** the change rewrites section text (restore it on undo) */ docs?: boolean }

interface ProjectState {
  project: Project | null
  saveState: SaveState
  savedAt: number | null
  past: UndoEntry[]
  future: UndoEntry[]
  open: (id: string) => Promise<boolean>
  adopt: (p: Project) => void
  close: () => Promise<void>
  mutate: (fn: (p: Project) => Project, opts?: MutateOptions) => void
  setSectionDoc: (id: string, doc: PMDoc) => void
  undoStructure: () => string | null
  redoStructure: () => string | null
  save: () => Promise<void>
}

/** Hooks other modules register so the store never has to import them (avoids cycles). */
export const projectHooks = { beforeSave: (): void => {}, afterRestore: (): void => {} }

let saveTimer: ReturnType<typeof setTimeout> | null = null
const scheduleSave = (): void => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void useProject.getState().save(), 1500)
}

const restore = (target: Project, current: Project, withDocs: boolean): Project => {
  if (withDocs) return { ...target, images: current.images, updatedAt: Date.now() }
  const live = new Map(current.sections.map((s) => [s.id, s.doc]))
  return {
    ...target, images: current.images, updatedAt: Date.now(),
    sections: target.sections.map((s) => (live.has(s.id) ? { ...s, doc: live.get(s.id) ?? s.doc } : s)),
  }
}

export const useProject = create<ProjectState>((set, get) => ({
  project: null, saveState: 'saved', savedAt: null, past: [], future: [],
  open: async (id) => {
    const p = await loadProject(id)
    if (!p) return false
    await loadProjectImages(p)
    await registerCustomFonts(p.customFonts, getFont)
    set({ project: p, saveState: 'saved', savedAt: p.updatedAt, past: [], future: [] })
    return true
  },
  adopt: (p) => set({ project: p, saveState: 'dirty', past: [], future: [] }),
  close: async () => {
    await get().save()
    set({ project: null, past: [], future: [] })
  },
  mutate: (fn, opts) => {
    const cur = get().project
    if (!cur) return
    const next = fn(cur)
    if (next === cur) return
    const undoable = opts?.undoable ?? true
    set((s) => ({
      project: { ...next, updatedAt: Date.now() }, saveState: 'dirty',
      past: undoable ? [...s.past.slice(-99), { project: cur, at: Date.now(), label: opts?.label ?? 'change', docs: opts?.docs ?? false }] : s.past,
      future: undoable ? [] : s.future,
    }))
    scheduleSave()
  },
  setSectionDoc: (id, doc) => {
    const cur = get().project
    if (!cur) return
    set({ project: { ...cur, updatedAt: Date.now(), sections: cur.sections.map((s) => (s.id === id ? { ...s, doc } : s)) }, saveState: 'dirty' })
    scheduleSave()
  },
  undoStructure: () => {
    const { past, project } = get()
    const entry = past[past.length - 1]
    if (!entry || !project) return null
    projectHooks.beforeSave()
    const cur = get().project!
    set((s) => ({
      project: restore(entry.project, cur, entry.docs), saveState: 'dirty', past: s.past.slice(0, -1),
      future: [...s.future, { project: cur, at: Date.now(), label: entry.label, docs: entry.docs }],
    }))
    projectHooks.afterRestore()
    scheduleSave()
    return entry.label
  },
  redoStructure: () => {
    const { future, project } = get()
    const entry = future[future.length - 1]
    if (!entry || !project) return null
    projectHooks.beforeSave()
    const cur = get().project!
    set((s) => ({
      project: restore(entry.project, cur, entry.docs), saveState: 'dirty', future: s.future.slice(0, -1),
      past: [...s.past, { project: cur, at: Date.now(), label: entry.label, docs: entry.docs }],
    }))
    projectHooks.afterRestore()
    scheduleSave()
    return entry.label
  },
  save: async () => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    projectHooks.beforeSave()
    const p = get().project
    if (!p || get().saveState === 'saved') return
    set({ saveState: 'saving' })
    try {
      const stamped = { ...p, appVersion: APP_VERSION }
      await saveProject(stamped)
      // only claim "saved" if nothing changed while we were writing
      if (get().project === p) set({ saveState: 'saved', savedAt: Date.now() })
      else { set({ saveState: 'dirty', savedAt: Date.now() }); scheduleSave() }
    } catch (err) {
      console.error('Autosave failed', err)
      set({ saveState: 'error' })
    }
  },
}))

// Autosave heartbeat: every 10 seconds if anything is unsaved, and when the tab is hidden or closed.
if (typeof window !== 'undefined') {
  setInterval(() => { if (useProject.getState().saveState === 'dirty') void useProject.getState().save() }, 10_000)
  document.addEventListener('visibilitychange', () => { if (document.hidden) void useProject.getState().save() })
  window.addEventListener('pagehide', () => void useProject.getState().save())
}

/** Convenience helpers for common immutable updates. */
export const mutateSettings = (fn: (s: Project['settings']) => Project['settings'], label: string): void =>
  useProject.getState().mutate((p) => ({ ...p, settings: fn(p.settings) }), { label })
export const mutateTypography = (patch: Partial<Project['settings']['typography']>, label = 'typography'): void =>
  mutateSettings((s) => ({ ...s, typography: { ...s.typography, ...patch }, themeId: s.themeId }), label)
export const mutateSection = (id: string, patch: Partial<Project['sections'][number]>, label = 'section'): void =>
  useProject.getState().mutate((p) => ({ ...p, sections: p.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }), { label })
