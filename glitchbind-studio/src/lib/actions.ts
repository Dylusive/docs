/** High-level author actions. Components call these; they keep store, editor and layout in step. */
import type { PresetId, Section, SectionKind } from '@/types'
import { useProject, mutateSettings } from '@/store/project'
import { useUI, toast } from '@/store/ui'
import { useLayout } from '@/store/layout'
import { controller, canvasBridge } from './editor/controller'
import { editorCtx } from './editor/extensions'
import { figureContext } from './editor/figure'
import { importImage, isImageFile, removeImage, usedImageIds } from './images'
import { makeSection, SECTION_LABELS } from './defaults'
import { PRESETS, trimById } from './kdp'
import { applyTheme, luminance, paletteById, themeById } from './themes'
import { uid, round } from './units'

const store = () => useProject.getState()

// ---------------------------------------------------------------- images
export async function addImagesToLibrary(files: (File | Blob)[], names?: string[]): Promise<string[]> {
  const ids: string[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const name = names?.[i] ?? (f instanceof File ? f.name : `pasted-image-${Date.now()}.png`)
    if (!isImageFile({ type: f.type, name })) { toast(`${name} is not a supported image (JPG, PNG, WebP, SVG or GIF).`, 'warn'); continue }
    const meta = await importImage(f, name)
    store().mutate((p) => ({ ...p, images: [...p.images, meta] }), { undoable: false })
    ids.push(meta.id)
  }
  return ids
}

/** A sensible first size: 300 DPI if the image allows it, never wider than the text block. */
export function defaultWidthIn(imageId: string): number {
  const meta = store().project?.images.find((m) => m.id === imageId)
  const max = figureContext.contentWidthIn
  if (!meta) return Math.min(3, max)
  if (meta.type === 'image/svg+xml') return round(Math.min(max, 3.5), 2)
  return round(Math.max(1.25, Math.min(max, meta.width / 300)), 2)
}

export function insertFigure(imageId: string, pos: number | null, extra: Record<string, unknown> = {}): void {
  const ed = controller.editor
  if (!ed || !controller.activeId) { toast('Click into a chapter first, then insert the image.', 'warn'); return }
  ed.chain().insertFigure({ imageId, widthIn: defaultWidthIn(imageId), ...extra }, pos ?? undefined).run()
  controller.lastInput = 'key'
  controller.focus()
}

export async function insertImageFiles(files: File[], pos: number | null, extra: Record<string, unknown> = {}): Promise<void> {
  const ids = await addImagesToLibrary(files)
  ids.forEach((id) => insertFigure(id, pos, extra))
}

/** Fill the selected empty slot / replace the selected figure's image. */
export async function replaceSelectedImage(file: File): Promise<void> {
  const [id] = await addImagesToLibrary([file])
  if (id) controller.editor?.commands.updateFigure({ imageId: id, cx: 0, cy: 0, cw: 1, ch: 1 })
}

export async function deleteUnusedImages(): Promise<number> {
  controller.flush()
  const p = store().project
  if (!p) return 0
  const used = usedImageIds(p)
  const unused = p.images.filter((m) => !used.has(m.id))
  for (const m of unused) await removeImage(m.id)
  store().mutate((proj) => ({ ...proj, images: proj.images.filter((m) => used.has(m.id)) }), { undoable: false })
  return unused.length
}
export async function deleteImage(id: string): Promise<void> {
  await removeImage(id)
  store().mutate((proj) => ({ ...proj, images: proj.images.filter((m) => m.id !== id) }), { undoable: false })
}

editorCtx.onFiles = (files, pos) => { void insertImageFiles(files, pos) }
editorCtx.onLibraryImage = (imageId, pos) => insertFigure(imageId, pos)

// ---------------------------------------------------------------- sections
const MATTER_ORDER = { front: 0, body: 1, back: 2 } as const

export function addSection(kind: SectionKind, afterId?: string | null): string {
  const sec = makeSection(kind)
  store().mutate((p) => {
    const list = [...p.sections]
    let at = afterId ? list.findIndex((s) => s.id === afterId) + 1 : -1
    if (at <= 0 || MATTER_ORDER[list[at - 1].matter] > MATTER_ORDER[sec.matter] || (list[at] && MATTER_ORDER[list[at].matter] < MATTER_ORDER[sec.matter])) {
      // place it at the end of its own matter group
      at = list.length
      for (let i = 0; i < list.length; i++) if (MATTER_ORDER[list[i].matter] > MATTER_ORDER[sec.matter]) { at = i; break }
    }
    if (kind === 'chapter') sec.title = `Chapter ${p.sections.filter((s) => s.kind === 'chapter').length + 1}`
    list.splice(at, 0, sec)
    return { ...p, sections: list }
  }, { label: `add ${SECTION_LABELS[kind].toLowerCase()}` })
  requestAnimationFrame(() => jumpToSection(sec.id))
  return sec.id
}

export function removeSection(id: string): void {
  const p = store().project
  if (!p) return
  if (p.sections.length <= 1) { toast('A book needs at least one section.', 'warn'); return }
  controller.flush()
  const idx = p.sections.findIndex((s) => s.id === id)
  const title = p.sections[idx]?.title
  if (controller.activeId === id || useUI.getState().activeSectionId === id) controller.activate(null)
  store().mutate((proj) => ({ ...proj, sections: proj.sections.filter((s) => s.id !== id) }), { label: `delete “${title}”` })
  toast(`Deleted “${title}”.`, 'info', { label: 'Undo', run: () => { store().undoStructure() } })
}

export function duplicateSection(id: string): void {
  controller.flush()
  store().mutate((p) => {
    const i = p.sections.findIndex((s) => s.id === id)
    if (i < 0) return p
    const src = p.sections[i]
    const copy: Section = { ...src, id: uid('s_'), title: `${src.title} (copy)`, doc: src.doc ? (JSON.parse(JSON.stringify(src.doc)) as Section['doc']) : null }
    const list = [...p.sections]
    list.splice(i + 1, 0, copy)
    return { ...p, sections: list }
  }, { label: 'duplicate section' })
}

export function moveSection(id: string, toIndex: number): void {
  store().mutate((p) => {
    const from = p.sections.findIndex((s) => s.id === id)
    if (from < 0 || from === toIndex) return p
    const list = [...p.sections]
    const [item] = list.splice(from, 1)
    list.splice(from < toIndex ? toIndex - 1 : toIndex, 0, item)
    return list.every((s, i) => s === p.sections[i]) ? p : { ...p, sections: list }
  }, { label: 'reorder sections' })
}

export function jumpToSection(id: string, focus = true): void {
  const p = store().project
  const sec = p?.sections.find((s) => s.id === id)
  if (!sec) return
  useUI.setState({ tab: 'book' })
  controller.activate(id)
  const reveal = (): void => {
    const first = useLayout.getState().firstPage[id]
    if (first !== undefined) canvasBridge.revealPage(first)
    if (sec.doc && focus) { controller.select(1); controller.focus() }
  }
  reveal()
  requestAnimationFrame(() => requestAnimationFrame(reveal))
}

export function jumpToPage(index: number): void {
  useUI.setState({ tab: 'book' })
  requestAnimationFrame(() => canvasBridge.revealPage(index))
}

// ---------------------------------------------------------------- page setup + look
export function applyPreset(id: PresetId): void {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) return
  mutateSettings((s) => preset.apply(s), `preset: ${preset.name}`)
  toast(`${preset.name} preset applied — trim, margins, bleed and gutter are set.`, 'ok')
}
export function setTrim(id: string): void {
  const t = trimById(id)
  if (!t) return
  mutateSettings((s) => ({ ...s, trimId: id, trim: { w: t.w, h: t.h } }), `trim ${t.label}`)
}
export function setCustomTrim(w: number, h: number): void {
  mutateSettings((s) => ({ ...s, trimId: 'custom', trim: { w: round(w, 4), h: round(h, 4) } }), 'custom trim')
}
export function applyThemeById(id: string): void {
  const theme = themeById(id)
  if (!theme) return
  mutateSettings((s) => applyTheme(s, theme), `theme: ${theme.name}`)
  const dark = luminance(paletteById(theme.paletteId)?.page ?? '#fff') < 0.4
  toast(`${theme.name} applied. Your words and images are untouched.${dark ? ' Dark page colour is preview-only until you enable “Print page colour” in Layout.' : ''}`, 'ok', { label: 'Undo', run: () => controller.undo() })
}
export function applyPaletteById(id: string): void {
  const p = store().project
  const pal = paletteById(id, p?.customPalettes)
  if (!pal) return
  mutateSettings((s) => ({ ...s, paletteId: pal.id, colors: { text: pal.text, accent: pal.accent, highlight: pal.highlight, page: pal.page } }), `palette: ${pal.name}`)
}
