import type { JSONContent } from '@tiptap/core'

export type PMDoc = JSONContent
export type SectionKind =
  | 'title' | 'copyright' | 'dedication' | 'epigraph' | 'toc' | 'preface' | 'chapter'
  | 'about' | 'alsoby' | 'acknowledgements' | 'glossary' | 'custom'
export type Matter = 'front' | 'body' | 'back'

export interface Section {
  id: string
  kind: SectionKind
  matter: Matter
  title: string
  /** Editable content. `null` for generated sections (title page, copyright, contents). */
  doc: PMDoc | null
  numbered: boolean
  showTitle: boolean
  includeInToc: boolean
  /** null = follow the book-wide "chapters start on right" setting */
  startOnRight: boolean | null
  vAlign: 'top' | 'third'
}

export interface BookMeta {
  title: string
  subtitle: string
  author: string
  publisher: string
  isbn13: string
  isbn10: string
  copyrightYear: string
  copyrightHolder: string
  edition: string
  language: string
  description: string
  rights: string
  logoImageId: string | null
}

export type PresetId = 'kdp-paperback' | 'kdp-hardcover' | 'ingram' | 'screen' | 'custom'
export type FolioPosition = 'bottom-center' | 'bottom-outer' | 'top-outer' | 'none'
export type RunningHead = 'author' | 'title' | 'chapter' | 'none'
export type ChapterNumberStyle = 'word' | 'numeral' | 'roman' | 'none'

export interface Typography {
  bodyFont: string
  headingFont: string
  chapterFont: string
  captionFont: string
  bodySize: number // pt
  bodyWeight: number
  lineHeight: number
  paraSpacing: number // em
  indent: number // em
  letterSpacing: number // em
  align: 'justify' | 'left'
  hyphenate: boolean
  dropCap: boolean
  dropCapLines: number
  ornament: string
  sceneBreak: string
  chapterAlign: 'center' | 'left'
  chapterNumber: ChapterNumberStyle
  chapterUppercase: boolean
  chapterSize: number // pt
  chapterSink: number // fraction of content height
}

export interface BookColors { text: string; accent: string; highlight: string; page: string }
export interface Palette extends BookColors { id: string; name: string }

export interface BookSettings {
  preset: PresetId
  trimId: string
  trim: { w: number; h: number } // inches
  margins: { top: number; bottom: number; inside: number; outside: number } // inches
  autoGutter: boolean
  gutterComfort: number // inches added on top of the KDP minimum
  bleed: boolean
  paper: 'white' | 'cream'
  chaptersStartRight: boolean
  typography: Typography
  colors: BookColors
  paletteId: string
  themeId: string | null
  printPageColor: boolean
  headers: { enabled: boolean; left: RunningHead; right: RunningHead; folio: FolioPosition }
  footnotes: 'page' | 'chapter'
  figureNumbers: boolean
  widows: number
  orphans: number
}

export interface ImageMeta {
  id: string
  name: string
  type: string
  width: number
  height: number
  bytes: number
  createdAt: number
}

export interface CustomFont { id: string; family: string; fileName: string; format: string; licenceConfirmed: boolean }

export interface CustomStyle {
  id: string
  name: string
  fontFamily?: string
  fontSize?: number // em relative to body
  fontWeight?: number
  italic?: boolean
  align?: 'left' | 'center' | 'right' | 'justify'
  color?: string
  letterSpacing?: number
  lineHeight?: number
  indent?: boolean
  spaceBefore?: number
  spaceAfter?: number
  uppercase?: boolean
}

export type CoverPanel = 'front' | 'spine' | 'back'
export interface CoverItem {
  id: string
  type: 'text' | 'image' | 'barcode'
  /** inches, relative to the full-wrap canvas top-left (including bleed) */
  x: number; y: number; w: number; h: number
  rotation: number
  text?: string
  /** 'title' | 'subtitle' | 'author' | 'publisher' | 'description' binds the text to metadata */
  bind?: 'title' | 'subtitle' | 'author' | 'publisher' | 'description' | null
  font?: string
  size?: number // pt
  weight?: number
  italic?: boolean
  color?: string
  align?: 'left' | 'center' | 'right'
  letterSpacing?: number
  lineHeight?: number
  uppercase?: boolean
  vertical?: boolean
  imageId?: string
  fit?: 'cover' | 'contain'
  opacity?: number
  /** which panel the item is anchored to — re-flows when the spine width changes */
  panel: CoverPanel
}
export interface CoverDesign {
  background: string
  spineColor: string | null
  backColor: string | null
  items: CoverItem[]
  /** the builder was laid out for this geometry; items re-anchor when it changes */
  laidOutFor: { trimW: number; trimH: number; spine: number } | null
}

export interface Project {
  formatVersion: 1
  appVersion: string
  id: string
  createdAt: number
  updatedAt: number
  meta: BookMeta
  settings: BookSettings
  sections: Section[]
  images: ImageMeta[]
  customFonts: CustomFont[]
  customStyles: CustomStyle[]
  customPalettes: Palette[]
  cover: CoverDesign
}

export interface ProjectSummary {
  id: string
  title: string
  author: string
  words: number
  updatedAt: number
  coverBg: string
  coverAccent: string
  coverText: string
  coverFont: string
  coverImageId: string | null
}

export interface Snapshot { id: string; name: string; createdAt: number; words: number; project: Project }

export type ViewMode = 'single' | 'spread' | 'continuous'
