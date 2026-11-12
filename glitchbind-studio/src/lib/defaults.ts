import type { BookMeta, BookSettings, CoverDesign, Project, Section, SectionKind, Typography } from '@/types'
import { uid } from './units'

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.0.0'
export const FORMAT_VERSION = 1 as const

export const defaultTypography = (): Typography => ({
  bodyFont: 'EB Garamond', headingFont: 'EB Garamond', chapterFont: 'Cormorant Garamond', captionFont: 'EB Garamond',
  bodySize: 11.5, bodyWeight: 400, lineHeight: 1.38, paraSpacing: 0, indent: 1.4, letterSpacing: 0,
  align: 'justify', hyphenate: true, dropCap: true, dropCapLines: 3, ornament: '❧', sceneBreak: '* * *',
  chapterAlign: 'center', chapterNumber: 'word', chapterUppercase: false, chapterSize: 26, chapterSink: 0.16,
})

export const defaultSettings = (): BookSettings => ({
  preset: 'kdp-paperback', trimId: '6x9', trim: { w: 6, h: 9 },
  margins: { top: 0.75, bottom: 0.75, inside: 0.625, outside: 0.5 },
  autoGutter: true, gutterComfort: 0.25, bleed: false, paper: 'cream', chaptersStartRight: false,
  typography: defaultTypography(),
  colors: { text: '#000000', accent: '#000000', highlight: '#FFF1A8', page: '#FFFFFF' },
  paletteId: 'clean-white', themeId: 'classic-literary', printPageColor: false,
  headers: { enabled: true, left: 'author', right: 'title', folio: 'bottom-center' },
  footnotes: 'page', figureNumbers: false, widows: 2, orphans: 2,
})

export const defaultMeta = (): BookMeta => ({
  title: 'Untitled Book', subtitle: '', author: '', publisher: '', isbn13: '', isbn10: '',
  copyrightYear: String(new Date().getFullYear()), copyrightHolder: '', edition: 'First edition', language: 'en', description: '',
  rights: 'All rights reserved. No part of this publication may be reproduced, stored or transmitted in any form without the prior written permission of the copyright holder, except for brief quotations in reviews.',
  logoImageId: null,
})

export const defaultCover = (): CoverDesign => ({ background: '#12121A', spineColor: null, backColor: null, items: [], laidOutFor: null })

export const SECTION_LABELS: Record<SectionKind, string> = {
  title: 'Title Page', copyright: 'Copyright', dedication: 'Dedication', epigraph: 'Epigraph', toc: 'Contents', preface: 'Preface',
  chapter: 'Chapter', about: 'About the Author', alsoby: 'Also By', acknowledgements: 'Acknowledgements', glossary: 'Glossary', custom: 'Page',
}
export const GENERATED_KINDS: SectionKind[] = ['title', 'copyright', 'toc']
export const isGenerated = (kind: SectionKind): boolean => GENERATED_KINDS.includes(kind)
/** front-matter pages that carry no running head and no folio */
export const BARE_KINDS: SectionKind[] = ['title', 'copyright', 'dedication', 'epigraph']

const P = (text: string, attrs?: Record<string, unknown>): Record<string, unknown> =>
  text ? { type: 'paragraph', ...(attrs ? { attrs } : {}), content: [{ type: 'text', text }] } : { type: 'paragraph', ...(attrs ? { attrs } : {}) }
const doc = (...content: Record<string, unknown>[]): Section['doc'] => ({ type: 'doc', content })

export function makeSection(kind: SectionKind, title?: string): Section {
  const base: Section = {
    id: uid('s_'), kind, matter: 'body', title: title ?? SECTION_LABELS[kind], doc: null,
    numbered: false, showTitle: true, includeInToc: true, startOnRight: null, vAlign: 'top',
  }
  switch (kind) {
    case 'title': return { ...base, matter: 'front', showTitle: false, includeInToc: false, startOnRight: true }
    case 'copyright': return { ...base, matter: 'front', showTitle: false, includeInToc: false }
    case 'toc': return { ...base, matter: 'front', showTitle: false, includeInToc: false, startOnRight: true }
    case 'dedication': return { ...base, matter: 'front', showTitle: false, includeInToc: false, vAlign: 'third', startOnRight: true, doc: doc(P('For everyone who read the first draft and stayed anyway.')) }
    case 'epigraph': return { ...base, matter: 'front', showTitle: false, includeInToc: false, vAlign: 'third', doc: doc(P('Write the quotation that sets the tone for your book here.'), P('— Its Author', { variant: 'epigraph' })) }
    case 'preface': return { ...base, matter: 'front', doc: doc(P('Use the preface to tell readers why this book exists, how it came to be written, and what they should know before chapter one.')) }
    case 'chapter': return { ...base, numbered: true, title: title ?? 'New Chapter', doc: doc(P('')) }
    case 'about': return { ...base, matter: 'back', doc: doc({ type: 'figure', attrs: { id: uid('f_'), imageId: null, wrap: 'left', widthIn: 1.5, slot: 'Author photo' } }, P('Write a short biography in the third person: where you live, what you write, and where readers can find you.')) }
    case 'alsoby': return { ...base, matter: 'back', doc: doc(P('List your other titles here, one per line.')) }
    case 'acknowledgements': return { ...base, matter: 'back', doc: doc(P('Thank the people who helped this book into the world.')) }
    case 'glossary': return { ...base, matter: 'back', doc: doc({ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Term' }, { type: 'text', text: ' — A short, plain definition of the term.' }] }) }
    default: return { ...base, doc: doc(P('')) }
  }
}

export function blankProject(title = 'Untitled Book', author = ''): Project {
  const now = Date.now()
  const ch = makeSection('chapter', 'Chapter Title')
  return {
    formatVersion: FORMAT_VERSION, appVersion: APP_VERSION, id: uid('b_'), createdAt: now, updatedAt: now,
    meta: { ...defaultMeta(), title, author, copyrightHolder: author },
    settings: defaultSettings(),
    sections: [makeSection('title'), makeSection('copyright'), makeSection('toc'), ch],
    images: [], customFonts: [], customStyles: [], customPalettes: [], cover: defaultCover(),
  }
}
