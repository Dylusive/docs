import type { BookSettings, Palette, Typography } from '@/types'

/** Six built-in book palettes. Page colour is preview-only unless the author enables it for print. */
export const PALETTES: Palette[] = [
  { id: 'clean-white', name: 'Clean White', text: '#000000', accent: '#000000', highlight: '#FFF1A8', page: '#FFFFFF' },
  { id: 'parchment', name: 'Parchment', text: '#2B2118', accent: '#8A4B2A', highlight: '#F1D9A0', page: '#F4ECD8' },
  { id: 'midnight-glitch', name: 'Midnight Glitch', text: '#ECECF4', accent: '#00E5FF', highlight: '#4B2FA8', page: '#12121A' },
  { id: 'rose', name: 'Rose', text: '#2A1A1F', accent: '#B8325A', highlight: '#FFD6E0', page: '#FFF7F8' },
  { id: 'forest', name: 'Forest', text: '#1B2A20', accent: '#2F6B45', highlight: '#D8EBC8', page: '#F6F8F3' },
  { id: 'ocean', name: 'Ocean', text: '#10202E', accent: '#1F6F9F', highlight: '#CFE8F7', page: '#F3F8FB' },
]

export interface BookTheme { id: string; name: string; blurb: string; paletteId: string; typography: Partial<Typography> }
/** One click applies the whole look. Themes never touch the author's words or images. */
export const THEMES: BookTheme[] = [
  {
    id: 'classic-literary', name: 'Classic Literary', blurb: 'Garamond, drop caps, a fleuron under each chapter title.', paletteId: 'clean-white',
    typography: { bodyFont: 'EB Garamond', headingFont: 'EB Garamond', chapterFont: 'Cormorant Garamond', captionFont: 'EB Garamond', bodySize: 11.5, bodyWeight: 400, lineHeight: 1.38, paraSpacing: 0, indent: 1.4, letterSpacing: 0, align: 'justify', hyphenate: true, dropCap: true, dropCapLines: 3, ornament: '❧', sceneBreak: '* * *', chapterAlign: 'center', chapterNumber: 'word', chapterUppercase: false, chapterSize: 26, chapterSink: 0.16 },
  },
  {
    id: 'modern-clean', name: 'Modern Clean', blurb: 'Source Serif text with quiet Inter headings. No ornament.', paletteId: 'clean-white',
    typography: { bodyFont: 'Source Serif 4', headingFont: 'Inter', chapterFont: 'Inter', captionFont: 'Inter', bodySize: 10.5, bodyWeight: 400, lineHeight: 1.46, paraSpacing: 0, indent: 1.3, letterSpacing: 0, align: 'justify', hyphenate: true, dropCap: false, dropCapLines: 2, ornament: '', sceneBreak: '•  •  •', chapterAlign: 'left', chapterNumber: 'numeral', chapterUppercase: false, chapterSize: 22, chapterSink: 0.12 },
  },
  {
    id: 'dark-fantasy-glitch', name: 'Dark Fantasy Glitch', blurb: 'Cinzel capitals, star ornaments, the Midnight Glitch palette.', paletteId: 'midnight-glitch',
    typography: { bodyFont: 'Crimson Pro', headingFont: 'Cinzel', chapterFont: 'Cinzel Decorative', captionFont: 'Crimson Pro', bodySize: 11.5, bodyWeight: 400, lineHeight: 1.4, paraSpacing: 0, indent: 1.4, letterSpacing: 0, align: 'justify', hyphenate: true, dropCap: true, dropCapLines: 3, ornament: '✦', sceneBreak: '✦ ✦ ✦', chapterAlign: 'center', chapterNumber: 'roman', chapterUppercase: false, chapterSize: 23, chapterSink: 0.18 },
  },
  {
    id: 'romance-elegant', name: 'Romance Elegant', blurb: 'Cormorant text, script chapter titles, rose accents.', paletteId: 'rose',
    typography: { bodyFont: 'Cormorant Garamond', headingFont: 'Playfair Display', chapterFont: 'Dancing Script', captionFont: 'Cormorant Garamond', bodySize: 12.5, bodyWeight: 500, lineHeight: 1.34, paraSpacing: 0, indent: 1.5, letterSpacing: 0, align: 'justify', hyphenate: true, dropCap: true, dropCapLines: 3, ornament: '❦', sceneBreak: '❦', chapterAlign: 'center', chapterNumber: 'word', chapterUppercase: false, chapterSize: 34, chapterSink: 0.17 },
  },
  {
    id: 'nonfiction-bold', name: 'Nonfiction Bold', blurb: 'Big condensed chapter titles, spaced paragraphs, no indents.', paletteId: 'ocean',
    typography: { bodyFont: 'Source Serif 4', headingFont: 'Montserrat', chapterFont: 'Bebas Neue', captionFont: 'Montserrat', bodySize: 10.5, bodyWeight: 400, lineHeight: 1.46, paraSpacing: 0.6, indent: 0, letterSpacing: 0, align: 'left', hyphenate: false, dropCap: false, dropCapLines: 2, ornament: '', sceneBreak: '———', chapterAlign: 'left', chapterNumber: 'numeral', chapterUppercase: true, chapterSize: 42, chapterSink: 0.08 },
  },
  {
    id: 'poetry-minimal', name: 'Poetry Minimal', blurb: 'Spectral, ragged right, generous leading and white space.', paletteId: 'clean-white',
    typography: { bodyFont: 'Spectral', headingFont: 'Spectral', chapterFont: 'Spectral', captionFont: 'Spectral', bodySize: 11, bodyWeight: 400, lineHeight: 1.62, paraSpacing: 0.7, indent: 0, letterSpacing: 0, align: 'left', hyphenate: false, dropCap: false, dropCapLines: 2, ornament: '', sceneBreak: '·', chapterAlign: 'center', chapterNumber: 'none', chapterUppercase: false, chapterSize: 18, chapterSink: 0.24 },
  },
]

export const paletteById = (id: string, custom: Palette[] = []): Palette | undefined => [...PALETTES, ...custom].find((p) => p.id === id)
export const themeById = (id: string | null): BookTheme | undefined => THEMES.find((t) => t.id === id)

export function applyTheme(s: BookSettings, theme: BookTheme): BookSettings {
  const pal = paletteById(theme.paletteId) ?? PALETTES[0]
  return { ...s, themeId: theme.id, paletteId: pal.id, typography: { ...s.typography, ...theme.typography }, colors: { text: pal.text, accent: pal.accent, highlight: pal.highlight, page: pal.page } }
}

/** Relative luminance (0 = black, 1 = white) — used to warn about light text on unprinted page colour. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return 0
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
