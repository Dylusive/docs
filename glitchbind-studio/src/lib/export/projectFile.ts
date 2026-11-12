/** Portable .glitchbind.json project files: the whole book, images and custom fonts included as base64. */
import type { Project } from '@/types'
import { APP_VERSION, FORMAT_VERSION, defaultCover, defaultMeta, defaultSettings } from '@/lib/defaults'
import { blobToDataUrl, dataUrlToBlob } from '@/lib/images'
import { getBlob, getFont, loadProject, putBlob, putFont, saveProject } from '@/lib/storage'
import { uid } from '@/lib/units'

export interface ProjectFile {
  app: 'GlitchBind Studio'
  formatVersion: number
  appVersion: string
  savedAt: string
  project: Project
  images: Record<string, string>
  fonts: Record<string, string>
}

export async function buildProjectFile(project: Project, readImage = getBlob, readFont = getFont): Promise<ProjectFile> {
  const images: Record<string, string> = {}
  for (const m of project.images) {
    const blob = await readImage(m.id)
    if (blob) images[m.id] = await blobToDataUrl(blob.type ? blob : new Blob([blob], { type: m.type }))
  }
  const fonts: Record<string, string> = {}
  for (const f of project.customFonts) {
    const blob = await readFont(f.id)
    if (blob) fonts[f.id] = await blobToDataUrl(blob)
  }
  return { app: 'GlitchBind Studio', formatVersion: FORMAT_VERSION, appVersion: APP_VERSION, savedAt: new Date().toISOString(), project: { ...project, formatVersion: FORMAT_VERSION, appVersion: APP_VERSION }, images, fonts }
}

export interface ParsedProjectFile { file: ProjectFile; warning: string | null }
/** Validate a project file. Newer files open with a warning rather than crashing. */
export function parseProjectFile(text: string): ParsedProjectFile {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error('This is not a GlitchBind project file (it is not valid JSON).') }
  const f = data as Partial<ProjectFile>
  if (!f || typeof f !== 'object' || !f.project || !Array.isArray(f.project.sections)) throw new Error('This file does not contain a GlitchBind book.')
  const version = typeof f.formatVersion === 'number' ? f.formatVersion : 1
  const warning = version > FORMAT_VERSION
    ? `This file was saved by a newer GlitchBind (format ${version}, app ${f.appVersion ?? 'unknown'}). It opened, but some newer features may be missing — keep the original file safe.`
    : null
  const p = f.project
  // fill anything an older or newer file may lack so the app never crashes on load
  const project: Project = {
    ...p,
    formatVersion: FORMAT_VERSION, appVersion: APP_VERSION,
    meta: { ...defaultMeta(), ...p.meta },
    settings: { ...defaultSettings(), ...p.settings, typography: { ...defaultSettings().typography, ...p.settings?.typography }, colors: { ...defaultSettings().colors, ...p.settings?.colors }, headers: { ...defaultSettings().headers, ...p.settings?.headers }, margins: { ...defaultSettings().margins, ...p.settings?.margins } },
    images: p.images ?? [], customFonts: p.customFonts ?? [], customStyles: p.customStyles ?? [], customPalettes: p.customPalettes ?? [],
    cover: { ...defaultCover(), ...p.cover },
  }
  return { file: { app: 'GlitchBind Studio', formatVersion: version, appVersion: f.appVersion ?? 'unknown', savedAt: f.savedAt ?? '', project, images: f.images ?? {}, fonts: f.fonts ?? {} }, warning }
}

/** Give a project (and its image/font ids) a fresh identity so copies never share storage. */
export function reidentify(file: ProjectFile): ProjectFile {
  const map = new Map<string, string>()
  for (const m of file.project.images) map.set(m.id, uid('img_'))
  for (const f of file.project.customFonts) map.set(f.id, uid('font_'))
  let json = JSON.stringify(file.project)
  for (const [from, to] of map) json = json.split(`"${from}"`).join(`"${to}"`)
  const project = JSON.parse(json) as Project
  project.id = uid('b_')
  const remap = (rec: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(rec).map(([k, v]) => [map.get(k) ?? k, v]))
  return { ...file, project, images: remap(file.images), fonts: remap(file.fonts) }
}

export async function storeProjectFile(file: ProjectFile): Promise<Project> {
  for (const [id, dataUrl] of Object.entries(file.images)) await putBlob(id, dataUrlToBlob(dataUrl))
  for (const [id, dataUrl] of Object.entries(file.fonts)) await putFont(id, dataUrlToBlob(dataUrl))
  const project = { ...file.project, updatedAt: Date.now() }
  await saveProject(project)
  return project
}

export async function importProjectFile(file: File): Promise<{ project: Project; warning: string | null }> {
  const parsed = parseProjectFile(await file.text())
  const project = await storeProjectFile(reidentify(parsed.file))
  return { project, warning: parsed.warning }
}

export async function duplicateProjectDeep(id: string): Promise<Project | null> {
  const p = await loadProject(id)
  if (!p) return null
  const file = reidentify(await buildProjectFile(p))
  file.project.meta = { ...file.project.meta, title: `${p.meta.title} (copy)` }
  file.project.createdAt = Date.now()
  return storeProjectFile(file)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
export const safeFileName = (title: string): string => (title.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'book').slice(0, 80)

export async function downloadProjectFile(project: Project): Promise<string> {
  const file = await buildProjectFile(project)
  const name = `${safeFileName(project.meta.title)}.glitchbind.json`
  downloadBlob(new Blob([JSON.stringify(file)], { type: 'application/json' }), name)
  return name
}
