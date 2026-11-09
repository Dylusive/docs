import type { BookSettings, PresetId } from '@/types'
import { round } from './units'

export interface TrimSize { id: string; label: string; w: number; h: number }
/** All sizes in inches. A5 / A4 are converted from millimetres. */
export const TRIM_SIZES: TrimSize[] = [
  { id: '5x8', label: '5 × 8 in', w: 5, h: 8 },
  { id: '5.25x8', label: '5.25 × 8 in', w: 5.25, h: 8 },
  { id: '5.5x8.5', label: '5.5 × 8.5 in', w: 5.5, h: 8.5 },
  { id: '6x9', label: '6 × 9 in', w: 6, h: 9 },
  { id: '6.14x9.21', label: '6.14 × 9.21 in', w: 6.14, h: 9.21 },
  { id: '7x10', label: '7 × 10 in', w: 7, h: 10 },
  { id: '8x10', label: '8 × 10 in', w: 8, h: 10 },
  { id: '8.5x11', label: '8.5 × 11 in', w: 8.5, h: 11 },
  { id: 'a5', label: 'A5 (148 × 210 mm)', w: round(148 / 25.4, 4), h: round(210 / 25.4, 4) },
  { id: 'a4', label: 'A4 (210 × 297 mm)', w: round(210 / 25.4, 4), h: round(297 / 25.4, 4) },
]
export const trimById = (id: string): TrimSize | undefined => TRIM_SIZES.find((t) => t.id === id)

export const BLEED_IN = 0.125
export const KDP_MIN_OUTER = 0.25
export const KDP_RECOMMENDED_OUTER = 0.375
export const KDP_MIN_PAGES = 24
export const KDP_MAX_PAGES = 828

export interface GutterBand { min: number; max: number; inside: number }
/** Amazon KDP minimum inside (gutter) margin by page count. */
export const KDP_GUTTER_TABLE: GutterBand[] = [
  { min: 24, max: 150, inside: 0.375 },
  { min: 151, max: 300, inside: 0.5 },
  { min: 301, max: 500, inside: 0.625 },
  { min: 501, max: 700, inside: 0.75 },
  { min: 701, max: 828, inside: 0.875 },
]
/** Books under 24 pages use the first band; books over 828 pages use the last (and fail preflight). */
export function gutterBand(pageCount: number): GutterBand {
  for (const band of KDP_GUTTER_TABLE) if (pageCount <= band.max) return band
  return KDP_GUTTER_TABLE[KDP_GUTTER_TABLE.length - 1]
}
export const kdpGutter = (pageCount: number): number => gutterBand(pageCount).inside

/** The inside margin the book should currently use. */
export function resolveInsideMargin(s: Pick<BookSettings, 'autoGutter' | 'gutterComfort' | 'margins'>, pageCount: number): number {
  return s.autoGutter ? round(kdpGutter(pageCount) + s.gutterComfort, 4) : s.margins.inside
}

export type PaperType = 'white' | 'cream'
/** KDP paperback spine thickness per page, in inches (black ink). */
export const SPINE_PER_PAGE: Record<PaperType, number> = { white: 0.002252, cream: 0.0025 }
export const spineWidth = (pageCount: number, paper: PaperType): number => round(pageCount * SPINE_PER_PAGE[paper], 4)
/** KDP only prints spine text at 79+ pages. */
export const SPINE_TEXT_MIN_PAGES = 79

export interface CoverGeometry { width: number; height: number; spine: number; bleed: number; trimW: number; trimH: number; frontX: number; spineX: number; backX: number }
/** Full-wrap paperback cover: bleed + back + spine + front + bleed, by trim height + 2 × bleed. */
export function coverGeometry(trimW: number, trimH: number, pageCount: number, paper: PaperType): CoverGeometry {
  const spine = spineWidth(pageCount, paper)
  const bleed = BLEED_IN
  return {
    width: round(bleed + trimW + spine + trimW + bleed, 4),
    height: round(trimH + bleed * 2, 4),
    spine, bleed, trimW, trimH,
    backX: bleed,
    spineX: round(bleed + trimW, 4),
    frontX: round(bleed + trimW + spine, 4),
  }
}

export interface PublishingPreset {
  id: PresetId
  name: string
  blurb: string
  apply: (s: BookSettings) => BookSettings
}
const withTrim = (s: BookSettings, id: string): BookSettings => {
  const t = trimById(id)
  return t ? { ...s, trimId: id, trim: { w: t.w, h: t.h } } : s
}
export const PRESETS: PublishingPreset[] = [
  {
    id: 'kdp-paperback', name: 'Amazon KDP Paperback',
    blurb: 'Gutter follows the KDP page-count table automatically. Outside 0.5″, top and bottom 0.75″.',
    apply: (s) => ({ ...(s.trimId === 'custom' ? withTrim(s, '6x9') : s), preset: 'kdp-paperback', autoGutter: true, gutterComfort: 0.25, bleed: false, margins: { top: 0.75, bottom: 0.75, outside: 0.5, inside: 0.625 } }),
  },
  {
    id: 'kdp-hardcover', name: 'Amazon KDP Hardcover',
    blurb: 'Case-laminate hardcover. Same gutter table as paperback; slightly more generous outer margins.',
    apply: (s) => ({ ...withTrim(s, ['5.5x8.5', '6x9', '6.14x9.21', '7x10'].includes(s.trimId) ? s.trimId : '6x9'), preset: 'kdp-hardcover', autoGutter: true, gutterComfort: 0.25, bleed: false, margins: { top: 0.8, bottom: 0.8, outside: 0.625, inside: 0.625 } }),
  },
  {
    id: 'ingram', name: 'IngramSpark',
    blurb: 'Ingram asks for 0.5″ minimum on every side and 0.125″ bleed on trim edges when images bleed.',
    apply: (s) => ({ ...s, preset: 'ingram', autoGutter: false, bleed: true, margins: { top: 0.75, bottom: 0.75, outside: 0.625, inside: 0.875 } }),
  },
  {
    id: 'screen', name: 'Screen / eBook Only',
    blurb: 'No bleed, even margins, no mirrored gutter. For PDFs read on screens and EPUB export.',
    apply: (s) => ({ ...s, preset: 'screen', autoGutter: false, bleed: false, margins: { top: 0.7, bottom: 0.7, outside: 0.6, inside: 0.6 } }),
  },
]
export const presetById = (id: PresetId): PublishingPreset | undefined => PRESETS.find((p) => p.id === id)
