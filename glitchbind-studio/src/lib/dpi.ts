export type DpiLevel = 'ok' | 'amber' | 'red' | 'vector'
export const DPI_PRINT = 300
export const DPI_MIN = 150

/** Effective DPI of an image once placed: source pixels actually shown ÷ inches they cover. */
export function effectiveDpi(sourcePx: number, cropFraction: number, placedInches: number): number {
  if (placedInches <= 0 || sourcePx <= 0) return 0
  return Math.round((sourcePx * cropFraction) / placedInches)
}

/** DPI for an image that must cover a box (full-bleed pages): the tighter axis decides. */
export function coverDpi(srcW: number, srcH: number, boxWIn: number, boxHIn: number): number {
  if (srcW <= 0 || srcH <= 0 || boxWIn <= 0 || boxHIn <= 0) return 0
  const scale = Math.max(boxWIn / srcW, boxHIn / srcH) // inches per source pixel
  return Math.round(1 / scale)
}

export function dpiLevel(dpi: number, mime: string): DpiLevel {
  if (mime === 'image/svg+xml') return 'vector'
  if (dpi < DPI_MIN) return 'red'
  if (dpi < DPI_PRINT) return 'amber'
  return 'ok'
}
