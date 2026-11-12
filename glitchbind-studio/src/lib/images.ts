/**
 * Image registry. Original files are stored untouched in IndexedDB; the editor only ever
 * references them by id. Object URLs are created once per session for display.
 */
import type { ImageMeta, Project } from '@/types'
import { delBlob, getBlob, putBlob } from './storage'
import { uid } from './units'
import { walkDoc } from './wordcount'

const urls = new Map<string, string>()
const metas = new Map<string, ImageMeta>()
let version = 0
const listeners = new Set<() => void>()
const bump = (): void => { version++; listeners.forEach((l) => l()) }

export const imageUrl = (id: string | null | undefined): string | null => (id ? urls.get(id) ?? null : null)
export const imageMeta = (id: string | null | undefined): ImageMeta | null => (id ? metas.get(id) ?? null : null)
export const imagesVersion = (): number => version
export const onImagesChange = (fn: () => void): (() => void) => { listeners.add(fn); return () => listeners.delete(fn) }

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
export const isImageFile = (f: { type: string; name?: string }): boolean =>
  ACCEPTED_IMAGE_TYPES.includes(f.type) || /\.(jpe?g|png|webp|svg|gif)$/i.test(f.name ?? '')

function sniffType(name: string, type: string): string {
  if (type) return type
  const ext = name.split('.').pop()?.toLowerCase()
  return ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
}

function probe(url: string): Promise<{ width: number; height: number; hasColor?: boolean }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const width = img.naturalWidth || 600
      const height = img.naturalHeight || 400
      let hasColor: boolean | undefined
      try {
        // sample a thumbnail: is any pixel noticeably non-grey? (used for the KDP colour-cost note)
        const c = document.createElement('canvas')
        c.width = 32
        c.height = 32
        const ctx = c.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(img, 0, 0, 32, 32)
          const d = ctx.getImageData(0, 0, 32, 32).data
          hasColor = false
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 16 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 22) { hasColor = true; break }
          }
        }
      } catch { hasColor = undefined }
      resolve({ width, height, hasColor })
    }
    img.onerror = () => resolve({ width: 600, height: 400 })
    img.src = url
  })
}

/** Store a new original and register it. Returns its metadata (add it to project.images). */
export async function importImage(file: Blob, name: string): Promise<ImageMeta> {
  const type = sniffType(name, file.type)
  const blob = file.type === type ? file : new Blob([file], { type })
  const id = uid('img_')
  const url = URL.createObjectURL(blob)
  const { width, height, hasColor } = await probe(url)
  const meta: ImageMeta = { id, name, type, width, height, bytes: blob.size, createdAt: Date.now(), hasColor }
  await putBlob(id, blob)
  urls.set(id, url)
  metas.set(id, meta)
  bump()
  return meta
}

export async function loadProjectImages(project: Project): Promise<void> {
  for (const m of project.images) {
    metas.set(m.id, m)
    if (urls.has(m.id)) continue
    const blob = await getBlob(m.id)
    if (blob) urls.set(m.id, URL.createObjectURL(blob))
  }
  bump()
}

export async function removeImage(id: string): Promise<void> {
  const url = urls.get(id)
  if (url) URL.revokeObjectURL(url)
  urls.delete(id)
  metas.delete(id)
  await delBlob(id)
  bump()
}

/** Ids of every image the book actually uses (pages, title-page logo, cover). */
export function usedImageIds(project: Project): Map<string, number> {
  const used = new Map<string, number>()
  const add = (id: unknown): void => { if (typeof id === 'string' && id) used.set(id, (used.get(id) ?? 0) + 1) }
  for (const s of project.sections) walkDoc(s.doc, (n) => { if (n.type === 'figure') add(n.attrs?.imageId) })
  add(project.meta.logoImageId)
  for (const item of project.cover.items) add(item.imageId)
  return used
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK))
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`
}
export function dataUrlToBlob(dataUrl: string): Blob {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl)
  if (!m) return new Blob([])
  const type = m[1] || 'application/octet-stream'
  if (!m[2]) return new Blob([decodeURIComponent(m[3])], { type })
  const bin = atob(m[3])
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return new Blob([buf], { type })
}
export const formatBytes = (n: number): string => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`)
