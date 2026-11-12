export const PX_PER_IN = 96
export const PT_PER_IN = 72
export const MM_PER_IN = 25.4
export const inToPx = (inches: number): number => inches * PX_PER_IN
export const pxToIn = (px: number): number => px / PX_PER_IN
export const ptToPx = (pt: number): number => (pt * PX_PER_IN) / PT_PER_IN
export const mmToIn = (mm: number): number => mm / MM_PER_IN
export const inToMm = (inches: number): number => inches * MM_PER_IN
export const round = (n: number, places = 3): number => {
  const f = 10 ** places
  return Math.round(n * f) / f
}
export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))
export const fmtIn = (inches: number, places = 3): string => `${round(inches, places)}″`
export const uid = (prefix = ''): string =>
  prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
