import type { BookMeta, CoverDesign, CoverItem, Project } from '@/types'
import { SPINE_TEXT_MIN_PAGES, coverGeometry, type CoverGeometry } from './kdp'
import { round, uid } from './units'

export const BARCODE_W = 2
export const BARCODE_H = 1.2
export const SAFE = 0.125

export const coverGeo = (p: Project, pageCount: number): CoverGeometry => coverGeometry(p.settings.trim.w, p.settings.trim.h, pageCount, p.settings.paper)

export function boundText(item: CoverItem, meta: BookMeta): string {
  switch (item.bind) {
    case 'title': return meta.title
    case 'subtitle': return meta.subtitle
    case 'author': return meta.author
    case 'publisher': return meta.publisher
    case 'description': return meta.description
    default: return item.text ?? ''
  }
}

/** A sensible starting cover: title, subtitle and author on the front, spine text, blurb and barcode box on the back. */
export function defaultCoverItems(p: Project, g: CoverGeometry, pageCount: number): CoverItem[] {
  const font = p.settings.typography.chapterFont
  const heading = p.settings.typography.headingFont
  const body = p.settings.typography.bodyFont
  const light = '#F2F2F7'
  const items: CoverItem[] = []
  const fx = g.frontX
  const pad = 0.5
  const w = g.trimW - pad * 2
  const top = g.bleed
  items.push({ id: uid('c_'), type: 'text', panel: 'front', bind: 'title', x: fx + pad, y: top + g.trimH * 0.2, w, h: g.trimH * 0.28, rotation: 0, font, size: g.trimW >= 6 ? 34 : 28, weight: 400, color: light, align: 'center', lineHeight: 1.1 })
  items.push({ id: uid('c_'), type: 'text', panel: 'front', bind: 'subtitle', x: fx + pad, y: top + g.trimH * 0.5, w, h: 0.6, rotation: 0, font: heading, size: 13, italic: true, color: '#A9A9BD', align: 'center', lineHeight: 1.3 })
  items.push({ id: uid('c_'), type: 'text', panel: 'front', bind: 'author', x: fx + pad, y: top + g.trimH * 0.84, w, h: 0.5, rotation: 0, font: heading, size: 14, color: light, align: 'center', letterSpacing: 0.2, uppercase: true })
  if (pageCount >= SPINE_TEXT_MIN_PAGES) {
    items.push({ id: uid('c_'), type: 'text', panel: 'spine', bind: 'title', x: g.spineX, y: top + 0.5, w: g.spine, h: g.trimH * 0.55, rotation: 0, font, size: Math.max(7, Math.min(13, g.spine * 72 * 0.5)), color: light, align: 'left', vertical: true })
    items.push({ id: uid('c_'), type: 'text', panel: 'spine', bind: 'author', x: g.spineX, y: top + g.trimH * 0.68, w: g.spine, h: g.trimH * 0.26, rotation: 0, font: heading, size: Math.max(6, Math.min(10, g.spine * 72 * 0.4)), color: '#A9A9BD', align: 'right', vertical: true, uppercase: true, letterSpacing: 0.1 })
  }
  items.push({ id: uid('c_'), type: 'text', panel: 'back', bind: 'description', x: g.backX + 0.6, y: top + 0.9, w: g.trimW - 1.2, h: g.trimH * 0.5, rotation: 0, font: body, size: 11, color: '#D8D8E4', align: 'left', lineHeight: 1.45 })
  items.push({ id: uid('c_'), type: 'barcode', panel: 'back', x: round(g.spineX - 0.25 - BARCODE_W, 4), y: round(top + g.trimH - 0.25 - BARCODE_H, 4), w: BARCODE_W, h: BARCODE_H, rotation: 0 })
  return items
}

/** Keep every item attached to its panel when the spine width or trim size changes. */
export function reflowCover(cover: CoverDesign, g: CoverGeometry): CoverDesign {
  const old = cover.laidOutFor
  const stamp = { trimW: g.trimW, trimH: g.trimH, spine: g.spine }
  if (!old) return { ...cover, laidOutFor: stamp }
  if (old.trimW === g.trimW && old.trimH === g.trimH && old.spine === g.spine) return cover
  const b = g.bleed
  const oldOrigin = { back: b, spine: b + old.trimW, front: b + old.trimW + old.spine }
  const origin = { back: g.backX, spine: g.spineX, front: g.frontX }
  const kx = g.trimW / old.trimW
  const ky = g.trimH / old.trimH
  const items = cover.items.map((it) => {
    const y = round(b + (it.y - b) * ky, 4)
    if (it.panel === 'spine') return { ...it, x: g.spineX, w: g.spine, y, h: round(it.h * ky, 4) }
    if (it.type === 'barcode') return { ...it, x: round(g.spineX - (oldOrigin.spine - it.x), 4), y: round(b + g.trimH - (b + old.trimH - it.y), 4) }
    return { ...it, x: round(origin[it.panel] + (it.x - oldOrigin[it.panel]) * kx, 4), y, w: round(it.w * kx, 4), h: round(it.h * ky, 4) }
  })
  return { ...cover, items, laidOutFor: stamp }
}

export const panelAt = (x: number, g: CoverGeometry): CoverItem['panel'] => (x < g.spineX ? 'back' : x < g.frontX ? 'spine' : 'front')
