export interface BookImage {
  id: string
  name: string
  dataUrl: string
  folderId: string
  createdAt: string
}

export interface ImageFolder {
  id: string
  name: string
  images: BookImage[]
}

export type ImageAlignment = 'left' | 'center' | 'right' | 'float-left' | 'float-right'

export interface PlacedImage {
  id: string
  imageId: string
  alignment: ImageAlignment
  widthPercent: number
  caption: string
}

export interface GeneratedLayoutRef {
  layout: unknown
  generatedAt: string
}

export interface Chapter {
  id: string
  title: string
  order: number
  content: string
  accentColor: string
  placedImages: PlacedImage[]
  linkedConceptIds: string[]
  wordCount: number
  createdAt: string
  updatedAt: string
  cachedLayout?: GeneratedLayoutRef
  stylePreset?: string
}

export interface Concept {
  id: string
  title: string
  description: string
  color: string
  x: number
  y: number
  linkedConceptIds: string[]
  linkedChapterIds: string[]
}

export interface Character {
  id: string
  name: string
  role: string
  description: string
  traits: string[]
  color: string
  imageId?: string
  notes: string
}

export interface GeneratedCover {
  svg: string
  paletteNotes: string
  generatedAt: string
}

export type StylePreset =
  | 'auto'
  | 'bloom-hour'
  | 'cinematic-noir'
  | 'editorial-literary'
  | 'mystical-oracle'
  | 'minimalist'
  | 'vintage-grimoire'
  | 'terminal-arcane'

export interface Book {
  id: string
  title: string
  author: string
  coverColor: string
  synopsis: string
  stylePreset?: StylePreset
  dedication?: string
  epigraph?: string
  chapters: Chapter[]
  concepts: Concept[]
  characters: Character[]
  imageFolders: ImageFolder[]
  cover?: GeneratedCover
  createdAt: string
  updatedAt: string
}

export interface AriaMessage {
  id: string
  role: 'user' | 'aria'
  content: string
  timestamp: string
  isStreaming?: boolean
}

export interface AppState {
  books: Book[]
  activeBookId: string | null
  ariaMessages: AriaMessage[]
  ariaOpen: boolean
  apiKey: string
  activeChapterId: string | null
}
