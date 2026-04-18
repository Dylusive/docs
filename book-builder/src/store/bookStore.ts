import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Book, Chapter, Concept, ImageFolder, BookImage, AriaMessage, PlacedImage } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const now = () => new Date().toISOString()

const DEFAULT_BOOK: Book = {
  id: uid(),
  title: 'Untitled Book',
  author: 'Anonymous',
  coverColor: '#00e5ff',
  synopsis: '',
  chapters: [],
  concepts: [],
  imageFolders: [{ id: uid(), name: 'General', images: [] }],
  createdAt: now(),
  updatedAt: now(),
}

interface Store {
  book: Book
  ariaMessages: AriaMessage[]
  ariaOpen: boolean
  apiKey: string
  activeChapterId: string | null

  // Book
  updateBook: (fields: Partial<Pick<Book, 'title' | 'author' | 'coverColor' | 'synopsis'>>) => void

  // Chapters
  addChapter: () => string
  updateChapter: (id: string, fields: Partial<Chapter>) => void
  deleteChapter: (id: string) => void
  reorderChapters: (ids: string[]) => void
  setActiveChapter: (id: string | null) => void

  // Concepts
  addConcept: (x: number, y: number) => string
  updateConcept: (id: string, fields: Partial<Concept>) => void
  deleteConcept: (id: string) => void
  linkConcepts: (aId: string, bId: string) => void
  unlinkConcepts: (aId: string, bId: string) => void
  linkConceptToChapter: (conceptId: string, chapterId: string) => void

  // Images
  addFolder: (name: string) => void
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  addImage: (folderId: string, name: string, dataUrl: string) => string
  deleteImage: (folderId: string, imageId: string) => void
  getImage: (imageId: string) => BookImage | undefined

  // Placed images in chapters
  addPlacedImage: (chapterId: string, imageId: string) => void
  updatePlacedImage: (chapterId: string, placedId: string, fields: Partial<PlacedImage>) => void
  removePlacedImage: (chapterId: string, placedId: string) => void

  // Aria
  addAriaMessage: (msg: Omit<AriaMessage, 'id' | 'timestamp'>) => string
  updateAriaMessage: (id: string, content: string, isStreaming?: boolean) => void
  clearAriaMessages: () => void
  toggleAria: () => void
  setAriaOpen: (open: boolean) => void
  setApiKey: (key: string) => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      book: DEFAULT_BOOK,
      ariaMessages: [],
      ariaOpen: true,
      apiKey: '',
      activeChapterId: null,

      updateBook: (fields) =>
        set((s) => ({ book: { ...s.book, ...fields, updatedAt: now() } })),

      addChapter: () => {
        const id = uid()
        const { book } = get()
        const chapter: Chapter = {
          id,
          title: `Chapter ${book.chapters.length + 1}`,
          order: book.chapters.length,
          content: '',
          accentColor: book.coverColor,
          placedImages: [],
          linkedConceptIds: [],
          wordCount: 0,
          createdAt: now(),
          updatedAt: now(),
        }
        set((s) => ({ book: { ...s.book, chapters: [...s.book.chapters, chapter], updatedAt: now() } }))
        return id
      },

      updateChapter: (id, fields) =>
        set((s) => ({
          book: {
            ...s.book,
            chapters: s.book.chapters.map((c) =>
              c.id === id ? { ...c, ...fields, updatedAt: now() } : c
            ),
            updatedAt: now(),
          },
        })),

      deleteChapter: (id) =>
        set((s) => ({
          book: {
            ...s.book,
            chapters: s.book.chapters.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })),
            updatedAt: now(),
          },
          activeChapterId: s.activeChapterId === id ? null : s.activeChapterId,
        })),

      reorderChapters: (ids) =>
        set((s) => {
          const map = Object.fromEntries(s.book.chapters.map((c) => [c.id, c]))
          return {
            book: {
              ...s.book,
              chapters: ids.map((id, i) => ({ ...map[id], order: i })),
              updatedAt: now(),
            },
          }
        }),

      setActiveChapter: (id) => set({ activeChapterId: id }),

      addConcept: (x, y) => {
        const id = uid()
        const concept: Concept = {
          id,
          title: 'New Concept',
          description: '',
          color: '#8b5cf6',
          x,
          y,
          linkedConceptIds: [],
          linkedChapterIds: [],
        }
        set((s) => ({ book: { ...s.book, concepts: [...s.book.concepts, concept], updatedAt: now() } }))
        return id
      },

      updateConcept: (id, fields) =>
        set((s) => ({
          book: {
            ...s.book,
            concepts: s.book.concepts.map((c) => (c.id === id ? { ...c, ...fields } : c)),
            updatedAt: now(),
          },
        })),

      deleteConcept: (id) =>
        set((s) => ({
          book: {
            ...s.book,
            concepts: s.book.concepts
              .filter((c) => c.id !== id)
              .map((c) => ({ ...c, linkedConceptIds: c.linkedConceptIds.filter((l) => l !== id) })),
            chapters: s.book.chapters.map((ch) => ({
              ...ch,
              linkedConceptIds: ch.linkedConceptIds.filter((l) => l !== id),
            })),
            updatedAt: now(),
          },
        })),

      linkConcepts: (aId, bId) =>
        set((s) => ({
          book: {
            ...s.book,
            concepts: s.book.concepts.map((c) => {
              if (c.id === aId && !c.linkedConceptIds.includes(bId))
                return { ...c, linkedConceptIds: [...c.linkedConceptIds, bId] }
              if (c.id === bId && !c.linkedConceptIds.includes(aId))
                return { ...c, linkedConceptIds: [...c.linkedConceptIds, aId] }
              return c
            }),
            updatedAt: now(),
          },
        })),

      unlinkConcepts: (aId, bId) =>
        set((s) => ({
          book: {
            ...s.book,
            concepts: s.book.concepts.map((c) => {
              if (c.id === aId) return { ...c, linkedConceptIds: c.linkedConceptIds.filter((l) => l !== bId) }
              if (c.id === bId) return { ...c, linkedConceptIds: c.linkedConceptIds.filter((l) => l !== aId) }
              return c
            }),
            updatedAt: now(),
          },
        })),

      linkConceptToChapter: (conceptId, chapterId) =>
        set((s) => ({
          book: {
            ...s.book,
            concepts: s.book.concepts.map((c) =>
              c.id === conceptId && !c.linkedChapterIds.includes(chapterId)
                ? { ...c, linkedChapterIds: [...c.linkedChapterIds, chapterId] }
                : c
            ),
            chapters: s.book.chapters.map((ch) =>
              ch.id === chapterId && !ch.linkedConceptIds.includes(conceptId)
                ? { ...ch, linkedConceptIds: [...ch.linkedConceptIds, conceptId] }
                : ch
            ),
            updatedAt: now(),
          },
        })),

      addFolder: (name) => {
        const folder: ImageFolder = { id: uid(), name, images: [] }
        set((s) => ({ book: { ...s.book, imageFolders: [...s.book.imageFolders, folder], updatedAt: now() } }))
      },

      renameFolder: (id, name) =>
        set((s) => ({
          book: {
            ...s.book,
            imageFolders: s.book.imageFolders.map((f) => (f.id === id ? { ...f, name } : f)),
            updatedAt: now(),
          },
        })),

      deleteFolder: (id) =>
        set((s) => ({
          book: {
            ...s.book,
            imageFolders: s.book.imageFolders.filter((f) => f.id !== id),
            updatedAt: now(),
          },
        })),

      addImage: (folderId, name, dataUrl) => {
        const id = uid()
        const image: BookImage = { id, name, dataUrl, folderId, createdAt: now() }
        set((s) => ({
          book: {
            ...s.book,
            imageFolders: s.book.imageFolders.map((f) =>
              f.id === folderId ? { ...f, images: [...f.images, image] } : f
            ),
            updatedAt: now(),
          },
        }))
        return id
      },

      deleteImage: (folderId, imageId) =>
        set((s) => ({
          book: {
            ...s.book,
            imageFolders: s.book.imageFolders.map((f) =>
              f.id === folderId ? { ...f, images: f.images.filter((img) => img.id !== imageId) } : f
            ),
            updatedAt: now(),
          },
        })),

      getImage: (imageId) => {
        const { book } = get()
        for (const folder of book.imageFolders) {
          const img = folder.images.find((i) => i.id === imageId)
          if (img) return img
        }
        return undefined
      },

      addPlacedImage: (chapterId, imageId) => {
        const id = uid()
        const placed: PlacedImage = { id, imageId, alignment: 'center', widthPercent: 80, caption: '' }
        set((s) => ({
          book: {
            ...s.book,
            chapters: s.book.chapters.map((c) =>
              c.id === chapterId ? { ...c, placedImages: [...c.placedImages, placed] } : c
            ),
            updatedAt: now(),
          },
        }))
      },

      updatePlacedImage: (chapterId, placedId, fields) =>
        set((s) => ({
          book: {
            ...s.book,
            chapters: s.book.chapters.map((c) =>
              c.id === chapterId
                ? { ...c, placedImages: c.placedImages.map((p) => (p.id === placedId ? { ...p, ...fields } : p)) }
                : c
            ),
            updatedAt: now(),
          },
        })),

      removePlacedImage: (chapterId, placedId) =>
        set((s) => ({
          book: {
            ...s.book,
            chapters: s.book.chapters.map((c) =>
              c.id === chapterId ? { ...c, placedImages: c.placedImages.filter((p) => p.id !== placedId) } : c
            ),
            updatedAt: now(),
          },
        })),

      addAriaMessage: (msg) => {
        const id = uid()
        set((s) => ({
          ariaMessages: [...s.ariaMessages, { ...msg, id, timestamp: now() }],
        }))
        return id
      },

      updateAriaMessage: (id, content, isStreaming) =>
        set((s) => ({
          ariaMessages: s.ariaMessages.map((m) =>
            m.id === id ? { ...m, content, isStreaming: isStreaming ?? false } : m
          ),
        })),

      clearAriaMessages: () => set({ ariaMessages: [] }),
      toggleAria: () => set((s) => ({ ariaOpen: !s.ariaOpen })),
      setAriaOpen: (open) => set({ ariaOpen: open }),
      setApiKey: (key) => set({ apiKey: key }),
    }),
    {
      name: 'akashic-codex',
      partialize: (s) => ({
        book: s.book,
        ariaMessages: s.ariaMessages,
        ariaOpen: s.ariaOpen,
        apiKey: s.apiKey,
      }),
    }
  )
)
