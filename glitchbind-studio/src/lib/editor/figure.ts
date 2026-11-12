import type { DOMOutputSpec } from '@tiptap/pm/model'
import { imageMeta, imageUrl } from '@/lib/images'
import { dpiLevel, effectiveDpi } from '@/lib/dpi'

export type WrapMode = 'inline' | 'left' | 'right' | 'full' | 'break' | 'behind' | 'page'
export const WRAP_LABELS: Record<WrapMode, string> = {
  inline: 'Inline', left: 'Wrap left', right: 'Wrap right', full: 'Full width', break: 'Break text', behind: 'Behind text', page: 'Full-bleed page',
}
export interface FigureAttrs {
  id: string
  imageId: string | null
  wrap: WrapMode
  align: 'left' | 'center' | 'right'
  widthIn: number
  /** crop rectangle as fractions of the original image */
  cx: number; cy: number; cw: number; ch: number
  rotation: number
  opacity: number
  borderW: number // pt
  borderColor: string
  radius: number // pt
  shadow: number // 0-3
  caption: string
  numbered: boolean
  alt: string
  brightness: number; contrast: number; saturate: number; grayscale: number; sepia: number
  /** position for behind-text images, inches from the text block's top-left */
  x: number; y: number
  /** full-bleed page options */
  spread: boolean
  fit: 'cover' | 'contain'
  focusX: number; focusY: number
  gutterComp: number
  /** label for an empty image slot (author photo, publisher logo…) */
  slot: string | null
}
export const FIGURE_DEFAULTS: FigureAttrs = {
  id: '', imageId: null, wrap: 'inline', align: 'center', widthIn: 3, cx: 0, cy: 0, cw: 1, ch: 1, rotation: 0, opacity: 1,
  borderW: 0, borderColor: '#000000', radius: 0, shadow: 0, caption: '', numbered: false, alt: '',
  brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, x: 0.5, y: 0.5,
  spread: false, fit: 'cover', focusX: 0.5, focusY: 0.5, gutterComp: 0.125, slot: null,
}
const SHADOWS = ['', '0 1px 3px rgba(0,0,0,.28)', '0 3px 10px rgba(0,0,0,.32)', '0 8px 24px rgba(0,0,0,.38)']

export function filterCss(a: FigureAttrs): string {
  const f: string[] = []
  if (a.brightness !== 100) f.push(`brightness(${a.brightness}%)`)
  if (a.contrast !== 100) f.push(`contrast(${a.contrast}%)`)
  if (a.saturate !== 100) f.push(`saturate(${a.saturate}%)`)
  if (a.grayscale) f.push(`grayscale(${a.grayscale}%)`)
  if (a.sepia) f.push(`sepia(${a.sepia}%)`)
  return f.join(' ')
}
/** width ÷ height of the visible (cropped) image */
export function figureAspect(a: FigureAttrs): number {
  const m = imageMeta(a.imageId)
  if (!m) return a.slot ? 0.8 : 1.5
  return (m.width * a.cw) / (m.height * a.ch)
}
/** Effective DPI of an in-flow figure at its placed width. */
export function figureDpi(a: FigureAttrs, placedWidthIn: number): { dpi: number; level: ReturnType<typeof dpiLevel> } | null {
  const m = imageMeta(a.imageId)
  if (!m) return null
  const dpi = effectiveDpi(m.width, a.cw, placedWidthIn)
  return { dpi, level: dpiLevel(dpi, m.type) }
}

/** max text-block width in inches, set by the layout engine so badges reflect the clamped size */
export const figureContext = { contentWidthIn: 4.875, trimWIn: 6, trimHIn: 9, bleedIn: 0, figureNumbers: false }

export function figureSpec(a: FigureAttrs): DOMOutputSpec {
  const url = imageUrl(a.imageId)
  const aspect = figureAspect(a)
  const anchored = a.wrap === 'page' || a.wrap === 'behind'
  const placed = a.wrap === 'full' ? figureContext.contentWidthIn : Math.min(a.widthIn, a.wrap === 'behind' ? 99 : figureContext.contentWidthIn)
  let dpi = figureDpi(a, placed)
  if (dpi && a.wrap === 'page') {
    const m = imageMeta(a.imageId)!
    const boxW = (a.spread ? 2 : 1) * (figureContext.trimWIn + figureContext.bleedIn)
    const boxH = figureContext.trimHIn + figureContext.bleedIn * 2
    const scale = a.fit === 'cover' ? Math.max(boxW / m.width, boxH / m.height) : Math.min(boxW / m.width, boxH / m.height)
    const d = Math.round(1 / scale)
    dpi = { dpi: d, level: dpiLevel(d, m.type) }
  }
  const fig: Record<string, string> = {
    class: 'gb-fig', 'data-fig-id': a.id, 'data-wrap': a.wrap, 'data-align': a.align, 'data-fig': JSON.stringify(a),
    style: `width:${a.widthIn}in` + (a.wrap === 'behind' ? `;--fx:${a.x}in;--fy:${a.y}in` : ''),
  }
  if (anchored) fig['data-anchor'] = a.wrap
  else fig['data-mono'] = ''
  if (a.wrap === 'page') { fig['data-spread'] = String(a.spread); fig['data-fit'] = a.fit; fig['data-gutter'] = String(a.gutterComp) }
  const numbered = !!a.caption && (a.numbered || figureContext.figureNumbers) && !anchored
  if (numbered) fig['data-numbered'] = ''
  if (dpi && (dpi.level === 'amber' || dpi.level === 'red')) { fig['data-dpi-level'] = dpi.level; fig['data-dpi'] = `${dpi.dpi} DPI` }
  if (!url) fig['data-empty'] = ''

  const frameStyle = [
    `aspect-ratio:${aspect.toFixed(5)}`,
    a.borderW ? `border:${a.borderW}pt solid ${a.borderColor}` : '',
    a.radius ? `border-radius:${a.radius}pt` : '',
    a.shadow ? `box-shadow:${SHADOWS[a.shadow] ?? ''}` : '',
    a.opacity !== 1 ? `opacity:${a.opacity}` : '',
    a.rotation ? `transform:rotate(${a.rotation}deg)` : '',
  ].filter(Boolean).join(';')
  const filter = filterCss(a)
  const imgStyle = a.wrap === 'page'
    ? `object-fit:${a.fit};object-position:${a.focusX * 100}% ${a.focusY * 100}%` + (filter ? `;filter:${filter}` : '')
    : `width:${(100 / a.cw).toFixed(4)}%;height:${(100 / a.ch).toFixed(4)}%;left:${((-a.cx / a.cw) * 100).toFixed(4)}%;top:${((-a.cy / a.ch) * 100).toFixed(4)}%` + (filter ? `;filter:${filter}` : '')
  const inner: DOMOutputSpec = url
    ? ['img', { src: url, alt: a.alt, style: imgStyle, draggable: 'false' }]
    : ['span', { class: 'gb-fig-empty' }, a.slot ? `${a.slot} — drop an image here` : 'Missing image']
  const children: DOMOutputSpec[] = [['span', { class: 'gb-fig-frame', style: frameStyle }, inner]]
  if (a.caption && !anchored) children.push(['figcaption', {}, a.caption])
  return ['figure', fig, ...children] as unknown as DOMOutputSpec
}
