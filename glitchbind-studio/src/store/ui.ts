import { create } from 'zustand'
import type { ViewMode } from '@/types'
import { getPref, setPref } from '@/lib/storage'
import { uid } from '@/lib/units'

export type DialogId = null | 'export' | 'preflight' | 'metadata' | 'help' | 'shortcuts' | 'snapshots' | 'import' | 'fonts'
export type Context = 'text' | 'image' | 'page' | 'footnote'
export interface Toast { id: string; text: string; tone: 'info' | 'ok' | 'warn' | 'error'; action?: { label: string; run: () => void } }

interface Prefs {
  view: ViewMode; zoom: number; fit: boolean
  guides: { margins: boolean; safe: boolean; bleed: boolean }
  leftOpen: boolean; rightOpen: boolean; glitch: boolean
}
export interface UIState extends Prefs {
  leftTab: 'structure' | 'images' | 'find'
  rightTab: 'context' | 'design' | 'layout'
  tab: 'book' | 'cover'
  focusMode: boolean
  proof: boolean
  dialog: DialogId
  activeSectionId: string | null
  /** book page index currently showing the live editor window, -1 when none */
  livePage: number
  /** page the viewport is centred on */
  currentPage: number
  context: Context
  /** bumps on every editor transaction so toolbars re-read formatting state */
  tick: number
  toasts: Toast[]
  set: (patch: Partial<UIState>) => void
  setPref: (patch: Partial<Prefs>) => void
  toast: (text: string, tone?: Toast['tone'], action?: Toast['action']) => void
  dismiss: (id: string) => void
}

const PREF_KEYS: (keyof Prefs)[] = ['view', 'zoom', 'fit', 'guides', 'leftOpen', 'rightOpen', 'glitch']

export const useUI = create<UIState>((set, get) => ({
  view: 'continuous', zoom: 1, fit: true,
  guides: { margins: false, safe: false, bleed: false },
  leftOpen: true, rightOpen: true, glitch: true,
  leftTab: 'structure', rightTab: 'context', tab: 'book',
  focusMode: false, proof: false, dialog: null,
  activeSectionId: null, livePage: -1, currentPage: 0, context: 'page', tick: 0, toasts: [],
  set: (patch) => set(patch),
  setPref: (patch) => {
    set(patch)
    const s = get()
    const prefs = Object.fromEntries(PREF_KEYS.map((k) => [k, s[k]])) as unknown as Prefs
    void setPref('ui', prefs)
  },
  toast: (text, tone = 'info', action) => {
    const id = uid('t_')
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone, action }] }))
    setTimeout(() => get().dismiss(id), action ? 9000 : 4500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export async function loadPrefs(): Promise<void> {
  const p = await getPref<Partial<Prefs>>('ui')
  if (p) useUI.setState(p)
}
export const toast = (text: string, tone?: Toast['tone'], action?: Toast['action']): void => useUI.getState().toast(text, tone, action)
