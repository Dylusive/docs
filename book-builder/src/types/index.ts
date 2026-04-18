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

export interface Book {
  id: string
  title: string
  author: string
  coverColor: string
  synopsis: string
  chapters: Chapter[]
  concepts: Concept[]
  imageFolders: ImageFolder[]
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
  book: Book
  ariaMessages: AriaMessage[]
  ariaOpen: boolean
  apiKey: string
  activeChapterId: string | null
}
