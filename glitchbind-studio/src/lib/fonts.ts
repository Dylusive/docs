import { FONT_FILES } from './fontFiles.generated'
import type { CustomFont } from '@/types'

export type FontGroup = 'Literary Serif' | 'Sans' | 'Display' | 'Handwritten' | 'Mono / Typewriter' | 'Your Fonts'
export interface FontDef { id: string; family: string; group: FontGroup; fallback: string; weights: number[]; italics: number[]; custom?: boolean }

const def = (id: string, family: string, group: FontGroup, fallback: string): FontDef => ({
  id, family, group, fallback, weights: FONT_FILES[id]?.weights ?? [400], italics: FONT_FILES[id]?.italics ?? [],
})
const SERIF = 'Georgia, "Times New Roman", serif'
const SANS = 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif'
const MONO = 'ui-monospace, "Courier New", monospace'
const CURSIVE = '"Segoe Script", "Brush Script MT", cursive'

/** Every bundled family ships under the SIL Open Font License 1.1 (checked at install by scripts/gen-fonts.mjs). */
export const FONTS: FontDef[] = [
  def('eb-garamond', 'EB Garamond', 'Literary Serif', SERIF),
  def('crimson-pro', 'Crimson Pro', 'Literary Serif', SERIF),
  def('playfair-display', 'Playfair Display', 'Literary Serif', SERIF),
  def('libre-baskerville', 'Libre Baskerville', 'Literary Serif', SERIF),
  def('lora', 'Lora', 'Literary Serif', SERIF),
  def('merriweather', 'Merriweather', 'Literary Serif', SERIF),
  def('cormorant-garamond', 'Cormorant Garamond', 'Literary Serif', SERIF),
  def('spectral', 'Spectral', 'Literary Serif', SERIF),
  def('alegreya', 'Alegreya', 'Literary Serif', SERIF),
  def('source-serif-4', 'Source Serif 4', 'Literary Serif', SERIF),
  def('libre-caslon-text', 'Libre Caslon Text', 'Literary Serif', SERIF),
  def('cardo', 'Cardo', 'Literary Serif', SERIF),
  def('inter', 'Inter', 'Sans', SANS),
  def('source-sans-3', 'Source Sans 3', 'Sans', SANS),
  def('open-sans', 'Open Sans', 'Sans', SANS),
  def('lato', 'Lato', 'Sans', SANS),
  def('montserrat', 'Montserrat', 'Sans', SANS),
  def('work-sans', 'Work Sans', 'Sans', SANS),
  def('cinzel', 'Cinzel', 'Display', SERIF),
  def('cinzel-decorative', 'Cinzel Decorative', 'Display', SERIF),
  def('pirata-one', 'Pirata One', 'Display', SERIF),
  def('unifrakturmaguntia', 'UnifrakturMaguntia', 'Display', SERIF),
  def('orbitron', 'Orbitron', 'Display', SANS),
  def('space-grotesk', 'Space Grotesk', 'Display', SANS),
  def('bebas-neue', 'Bebas Neue', 'Display', SANS),
  def('caveat', 'Caveat', 'Handwritten', CURSIVE),
  def('dancing-script', 'Dancing Script', 'Handwritten', CURSIVE),
  def('jetbrains-mono', 'JetBrains Mono', 'Mono / Typewriter', MONO),
  def('courier-prime', 'Courier Prime', 'Mono / Typewriter', MONO),
  def('cutive-mono', 'Cutive Mono', 'Mono / Typewriter', MONO),
]
export const FONT_GROUPS: FontGroup[] = ['Literary Serif', 'Sans', 'Display', 'Handwritten', 'Mono / Typewriter', 'Your Fonts']

let customDefs: FontDef[] = []
export const allFonts = (): FontDef[] => [...FONTS, ...customDefs]
export const fontByFamily = (family: string): FontDef | undefined => allFonts().find((f) => f.family === family)
export const fontStack = (family: string): string => {
  const f = fontByFamily(family)
  return `"${family}", ${f?.fallback ?? SERIF}`
}

/** Register author-uploaded fonts (kept in IndexedDB with the project). */
export async function registerCustomFonts(fonts: CustomFont[], load: (id: string) => Promise<Blob | undefined>): Promise<void> {
  const defs: FontDef[] = []
  for (const f of fonts) {
    defs.push({ id: f.id, family: f.family, group: 'Your Fonts', fallback: SERIF, weights: [400], italics: [], custom: true })
    const already = Array.from(document.fonts).some((ff) => ff.family.replace(/["']/g, '') === f.family)
    if (already) continue
    const blob = await load(f.id)
    if (!blob) continue
    try {
      const face = new FontFace(f.family, await blob.arrayBuffer())
      await face.load()
      document.fonts.add(face)
    } catch (err) {
      console.warn('Could not load custom font', f.family, err)
    }
  }
  customDefs = defs
}

const loaded = new Set<string>()
/** Make sure the faces a book uses are decoded before we measure text with them. */
export async function ensureFonts(families: string[]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  const jobs: Promise<unknown>[] = []
  for (const family of new Set(families)) {
    if (loaded.has(family)) continue
    const f = fontByFamily(family)
    if (!f) continue
    loaded.add(family)
    const weights = f.weights.includes(700) ? [400, 700] : [f.weights[0] ?? 400]
    for (const w of weights) {
      jobs.push(document.fonts.load(`${w} 16px "${family}"`))
      if (f.italics.includes(w)) jobs.push(document.fonts.load(`italic ${w} 16px "${family}"`))
    }
  }
  if (!jobs.length) return
  await Promise.race([Promise.allSettled(jobs), new Promise((r) => setTimeout(r, 4000))])
}
export const fontLoadKey = (): number => loaded.size
