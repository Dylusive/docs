/** Everything GlitchBind stores lives in this browser's IndexedDB. Nothing is sent anywhere. */
import { createStore, del, get, keys, set } from 'idb-keyval'
import type { Project, ProjectSummary, Snapshot } from '@/types'
import { countDocWords } from './wordcount'

const db = createStore('glitchbind', 'kv')
const K = {
  index: 'index',
  project: (id: string) => `project:${id}`,
  blob: (id: string) => `blob:${id}`,
  font: (id: string) => `font:${id}`,
  snaps: (id: string) => `snaps:${id}`,
  pref: (k: string) => `pref:${k}`,
}

export const projectWords = (p: Project): number => p.sections.reduce((n, s) => n + countDocWords(s.doc), 0)

export function summarize(p: Project): ProjectSummary {
  const front = p.cover.items.find((i) => i.type === 'image' && i.panel === 'front')
  return {
    id: p.id, title: p.meta.title || 'Untitled Book', author: p.meta.author, words: projectWords(p), updatedAt: p.updatedAt,
    coverBg: p.cover.background, coverAccent: p.settings.colors.accent === '#000000' ? '#00E5FF' : p.settings.colors.accent,
    coverText: p.cover.items.find((i) => i.bind === 'title')?.color ?? '#F2F2F7',
    coverFont: p.cover.items.find((i) => i.bind === 'title')?.font ?? p.settings.typography.chapterFont,
    coverImageId: front?.imageId ?? null,
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const list = (await get<ProjectSummary[]>(K.index, db)) ?? []
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt)
}
export const loadProject = (id: string): Promise<Project | undefined> => get<Project>(K.project(id), db)

export async function saveProject(p: Project): Promise<void> {
  await set(K.project(p.id), p, db)
  const list = (await get<ProjectSummary[]>(K.index, db)) ?? []
  const s = summarize(p)
  const i = list.findIndex((x) => x.id === p.id)
  if (i >= 0) list[i] = s
  else list.push(s)
  await set(K.index, list, db)
}

export async function deleteProject(id: string): Promise<void> {
  const p = await loadProject(id)
  const snaps = await listSnapshots(id)
  const list = ((await get<ProjectSummary[]>(K.index, db)) ?? []).filter((x) => x.id !== id)
  await set(K.index, list, db)
  await del(K.project(id), db)
  await del(K.snaps(id), db)
  // image and font ids are unique per project copy, so they can go with it
  const ids = new Set<string>()
  for (const proj of [p, ...snaps.map((s) => s.project)]) if (proj) for (const im of proj.images) ids.add(im.id)
  for (const im of ids) await del(K.blob(im), db)
  if (p) for (const f of p.customFonts) await del(K.font(f.id), db)
}

export const putBlob = (id: string, blob: Blob): Promise<void> => set(K.blob(id), blob, db)
export const getBlob = (id: string): Promise<Blob | undefined> => get<Blob>(K.blob(id), db)
export const delBlob = (id: string): Promise<void> => del(K.blob(id), db)
export const putFont = (id: string, blob: Blob): Promise<void> => set(K.font(id), blob, db)
export const getFont = (id: string): Promise<Blob | undefined> => get<Blob>(K.font(id), db)
export const delFont = (id: string): Promise<void> => del(K.font(id), db)

export const listSnapshots = async (projectId: string): Promise<Snapshot[]> => (await get<Snapshot[]>(K.snaps(projectId), db)) ?? []
export const saveSnapshots = (projectId: string, snaps: Snapshot[]): Promise<void> => set(K.snaps(projectId), snaps, db)

export const getPref = <T,>(key: string): Promise<T | undefined> => get<T>(K.pref(key), db)
export const setPref = <T,>(key: string, value: T): Promise<void> => set(K.pref(key), value, db)
export const hasAnyData = async (): Promise<boolean> => (await keys(db)).length > 0

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false } catch { return false }
}
