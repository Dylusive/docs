import { create } from 'zustand'
import type { AsmPage, AsmTocEntry } from '@/lib/pagination/book'
import type { SectionPage } from '@/lib/pagination/section'
import type { PageGeometry } from '@/lib/bookCss'
import { pageGeometry } from '@/lib/bookCss'
import { defaultSettings } from '@/lib/defaults'

export interface BookPageData extends AsmPage {
  page: SectionPage | null
  header: string
  editable: boolean
}
export interface LayoutState {
  pages: BookPageData[]
  geo: PageGeometry
  toc: AsmTocEntry[]
  chapterNumbers: Record<string, number>
  firstPage: Record<string, number>
  sectionPages: Record<string, number>
  frontPages: number
  ready: boolean
  /** increments whenever pages change */
  gen: number
  lastMs: number
}
export const useLayout = create<LayoutState>(() => ({
  pages: [], geo: pageGeometry(defaultSettings(), 0), toc: [], chapterNumbers: {}, firstPage: {}, sectionPages: {}, frontPages: 0, ready: false, gen: 0, lastMs: 0,
}))
