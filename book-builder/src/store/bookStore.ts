import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Book,
  Chapter,
  Concept,
  ImageFolder,
  BookImage,
  AriaMessage,
  PlacedImage,
  Character,
  GeneratedCover,
  StylePreset,
} from '../types'

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const now = () => new Date().toISOString()

function emptyBook(overrides?: Partial<Book>): Book {
  return {
    id: uid(),
    title: 'Untitled Book',
    author: 'Anonymous',
    coverColor: '#00e5ff',
    synopsis: '',
    stylePreset: 'auto',
    dedication: '',
    epigraph: '',
    chapters: [],
    concepts: [],
    characters: [],
    imageFolders: [{ id: uid(), name: 'General', images: [] }],
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  }
}

interface Store {
  books: Book[]
  activeBookId: string | null
  ariaMessages: AriaMessage[]
  ariaOpen: boolean
  apiKey: string
  activeChapterId: string | null

  // Library
  createBook: (seed?: Partial<Book>) => string
  switchBook: (id: string) => void
  deleteBook: (id: string) => void
  duplicateBook: (id: string) => string

  // Book
  updateBook: (fields: Partial<Book>) => void
  setCover: (cover: GeneratedCover | undefined) => void
  setStylePreset: (preset: StylePreset) => void

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

  // Characters
  addCharacter: (seed?: Partial<Character>) => string
  updateCharacter: (id: string, fields: Partial<Character>) => void
  deleteCharacter: (id: string) => void

  // Images
  addFolder: (name: string) => void
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  addImage: (folderId: string, name: string, dataUrl: string) => string
  deleteImage: (folderId: string, imageId: string) => void
  getImage: (imageId: string) => BookImage | undefined

  // Placed images
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

function updateActive(
  state: Pick<Store, 'books' | 'activeBookId'>,
  updater: (b: Book) => Book
): { books: Book[] } {
  const { books, activeBookId } = state
  return {
    books: books.map((b) => (b.id === activeBookId ? { ...updater(b), updatedAt: now() } : b)),
  }
}

function getActive(state: Pick<Store, 'books' | 'activeBookId'>): Book | undefined {
  return state.books.find((b) => b.id === state.activeBookId)
}

const firstBook = emptyBook({ title: 'Untitled Book' })

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      books: [firstBook],
      activeBookId: firstBook.id,
      ariaMessages: [],
      ariaOpen: true,
      apiKey: '',
      activeChapterId: null,

      createBook: (seed) => {
        const book = emptyBook(seed)
        set((s) => ({ books: [...s.books, book], activeBookId: book.id, activeChapterId: null, ariaMessages: [] }))
        return book.id
      },

      switchBook: (id) => {
        if (!get().books.some((b) => b.id === id)) return
        set({ activeBookId: id, activeChapterId: null, ariaMessages: [] })
      },

      deleteBook: (id) =>
        set((s) => {
          const remaining = s.books.filter((b) => b.id !== id)
          const next = remaining.length > 0 ? remaining : [emptyBook()]
          const activeBookId = s.activeBookId === id ? next[0].id : s.activeBookId
          return { books: next, activeBookId, activeChapterId: null }
        }),

      duplicateBook: (id) => {
        const source = get().books.find((b) => b.id === id)
        if (!source) return ''
        const copy: Book = {
          ...source,
          id: uid(),
          title: `${source.title} (copy)`,
          createdAt: now(),
          updatedAt: now(),
        }
        set((s) => ({ books: [...s.books, copy], activeBookId: copy.id }))
        return copy.id
      },

      updateBook: (fields) =>
        set((s) => updateActive(s, (b) => ({ ...b, ...fields }))),

      setCover: (cover) =>
        set((s) => updateActive(s, (b) => ({ ...b, cover }))),

      setStylePreset: (preset) =>
        set((s) => updateActive(s, (b) => ({ ...b, stylePreset: preset }))),

      addChapter: () => {
        const id = uid()
        const active = getActive(get())
        if (!active) return id
        const chapter: Chapter = {
          id,
          title: `Chapter ${active.chapters.length + 1}`,
          order: active.chapters.length,
          content: '',
          accentColor: active.coverColor,
          placedImages: [],
          linkedConceptIds: [],
          wordCount: 0,
          createdAt: now(),
          updatedAt: now(),
        }
        set((s) => updateActive(s, (b) => ({ ...b, chapters: [...b.chapters, chapter] })))
        return id
      },

      updateChapter: (id, fields) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            chapters: b.chapters.map((c) => (c.id === id ? { ...c, ...fields, updatedAt: now() } : c)),
          }))
        ),

      deleteChapter: (id) =>
        set((s) => ({
          ...updateActive(s, (b) => ({
            ...b,
            chapters: b.chapters.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })),
          })),
          activeChapterId: s.activeChapterId === id ? null : s.activeChapterId,
        })),

      reorderChapters: (ids) =>
        set((s) =>
          updateActive(s, (b) => {
            const map = Object.fromEntries(b.chapters.map((c) => [c.id, c]))
            return { ...b, chapters: ids.map((id, i) => ({ ...map[id], order: i })) }
          })
        ),

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
        set((s) => updateActive(s, (b) => ({ ...b, concepts: [...b.concepts, concept] })))
        return id
      },

      updateConcept: (id, fields) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            concepts: b.concepts.map((c) => (c.id === id ? { ...c, ...fields } : c)),
          }))
        ),

      deleteConcept: (id) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            concepts: b.concepts
              .filter((c) => c.id !== id)
              .map((c) => ({ ...c, linkedConceptIds: c.linkedConceptIds.filter((l) => l !== id) })),
            chapters: b.chapters.map((ch) => ({
              ...ch,
              linkedConceptIds: ch.linkedConceptIds.filter((l) => l !== id),
            })),
          }))
        ),

      linkConcepts: (aId, bId) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            concepts: b.concepts.map((c) => {
              if (c.id === aId && !c.linkedConceptIds.includes(bId))
                return { ...c, linkedConceptIds: [...c.linkedConceptIds, bId] }
              if (c.id === bId && !c.linkedConceptIds.includes(aId))
                return { ...c, linkedConceptIds: [...c.linkedConceptIds, aId] }
              return c
            }),
          }))
        ),

      unlinkConcepts: (aId, bId) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            concepts: b.concepts.map((c) => {
              if (c.id === aId) return { ...c, linkedConceptIds: c.linkedConceptIds.filter((l) => l !== bId) }
              if (c.id === bId) return { ...c, linkedConceptIds: c.linkedConceptIds.filter((l) => l !== aId) }
              return c
            }),
          }))
        ),

      linkConceptToChapter: (conceptId, chapterId) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            concepts: b.concepts.map((c) =>
              c.id === conceptId && !c.linkedChapterIds.includes(chapterId)
                ? { ...c, linkedChapterIds: [...c.linkedChapterIds, chapterId] }
                : c
            ),
            chapters: b.chapters.map((ch) =>
              ch.id === chapterId && !ch.linkedConceptIds.includes(conceptId)
                ? { ...ch, linkedConceptIds: [...ch.linkedConceptIds, conceptId] }
                : ch
            ),
          }))
        ),

      addCharacter: (seed) => {
        const id = uid()
        const character: Character = {
          id,
          name: 'New Character',
          role: '',
          description: '',
          traits: [],
          color: '#ffd700',
          notes: '',
          ...seed,
        }
        set((s) => updateActive(s, (b) => ({ ...b, characters: [...b.characters, character] })))
        return id
      },

      updateCharacter: (id, fields) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            characters: b.characters.map((c) => (c.id === id ? { ...c, ...fields } : c)),
          }))
        ),

      deleteCharacter: (id) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            characters: b.characters.filter((c) => c.id !== id),
          }))
        ),

      addFolder: (name) => {
        const folder: ImageFolder = { id: uid(), name, images: [] }
        set((s) => updateActive(s, (b) => ({ ...b, imageFolders: [...b.imageFolders, folder] })))
      },

      renameFolder: (id, name) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            imageFolders: b.imageFolders.map((f) => (f.id === id ? { ...f, name } : f)),
          }))
        ),

      deleteFolder: (id) =>
        set((s) =>
          updateActive(s, (b) => ({ ...b, imageFolders: b.imageFolders.filter((f) => f.id !== id) }))
        ),

      addImage: (folderId, name, dataUrl) => {
        const id = uid()
        const image: BookImage = { id, name, dataUrl, folderId, createdAt: now() }
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            imageFolders: b.imageFolders.map((f) =>
              f.id === folderId ? { ...f, images: [...f.images, image] } : f
            ),
          }))
        )
        return id
      },

      deleteImage: (folderId, imageId) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            imageFolders: b.imageFolders.map((f) =>
              f.id === folderId ? { ...f, images: f.images.filter((img) => img.id !== imageId) } : f
            ),
          }))
        ),

      getImage: (imageId) => {
        const book = getActive(get())
        if (!book) return undefined
        for (const folder of book.imageFolders) {
          const img = folder.images.find((i) => i.id === imageId)
          if (img) return img
        }
        return undefined
      },

      addPlacedImage: (chapterId, imageId) => {
        const id = uid()
        const placed: PlacedImage = { id, imageId, alignment: 'center', widthPercent: 80, caption: '' }
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            chapters: b.chapters.map((c) =>
              c.id === chapterId ? { ...c, placedImages: [...c.placedImages, placed] } : c
            ),
          }))
        )
      },

      updatePlacedImage: (chapterId, placedId, fields) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            chapters: b.chapters.map((c) =>
              c.id === chapterId
                ? { ...c, placedImages: c.placedImages.map((p) => (p.id === placedId ? { ...p, ...fields } : p)) }
                : c
            ),
          }))
        ),

      removePlacedImage: (chapterId, placedId) =>
        set((s) =>
          updateActive(s, (b) => ({
            ...b,
            chapters: b.chapters.map((c) =>
              c.id === chapterId ? { ...c, placedImages: c.placedImages.filter((p) => p.id !== placedId) } : c
            ),
          }))
        ),

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
      version: 2,
      partialize: (s) => ({
        books: s.books,
        activeBookId: s.activeBookId,
        ariaMessages: s.ariaMessages,
        ariaOpen: s.ariaOpen,
        apiKey: s.apiKey,
      }),
      migrate: (persisted: unknown, version): any => {
        const data = persisted as Record<string, unknown> | undefined
        if (!data) return { books: [firstBook], activeBookId: firstBook.id }
        if (version < 2 && 'book' in data && data.book) {
          const legacy = data.book as Book
          const migrated: Book = {
            ...emptyBook(),
            ...legacy,
            stylePreset: legacy.stylePreset ?? 'auto',
            characters: legacy.characters ?? [],
            dedication: legacy.dedication ?? '',
            epigraph: legacy.epigraph ?? '',
          }
          return {
            ...data,
            books: [migrated],
            activeBookId: migrated.id,
            book: undefined,
          }
        }
        return data
      },
    }
  )
)

export function useActiveBook(): Book {
  return useStore((s) => {
    const found = s.books.find((b) => b.id === s.activeBookId)
    return found ?? s.books[0]
  })
}
