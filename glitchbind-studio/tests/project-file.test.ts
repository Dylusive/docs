import { describe, expect, it } from 'vitest'
import { buildProjectFile, parseProjectFile, reidentify } from '@/lib/export/projectFile'
import { blankProject, APP_VERSION, FORMAT_VERSION } from '@/lib/defaults'
import { dataUrlToBlob } from '@/lib/images'
import { chapterTitleFrom, parseMarkdown, parsePlainText } from '@/lib/importers'
import { buildText } from '@/lib/export/text'
import type { Project } from '@/types'

const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218, 99, 252, 207, 192, 80, 15, 0, 4, 133, 1, 128, 132, 169, 140, 33, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])

function sample(): Project {
  const p = blankProject('Round Trip', 'Ada Author')
  p.images = [{ id: 'img_one', name: 'dot.png', type: 'image/png', width: 1, height: 1, bytes: PNG.length, createdAt: 1 }]
  p.sections[3].doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello page.' }] }, { type: 'figure', attrs: { id: 'f_1', imageId: 'img_one', widthIn: 2 } }] }
  p.meta.isbn13 = '978-1-23456-789-7'
  return p
}
const bytes = async (b: Blob): Promise<number[]> => Array.from(new Uint8Array(await b.arrayBuffer()))

describe('.glitchbind.json project files', () => {
  it('round-trips the whole book with its images, byte for byte', async () => {
    const p = sample()
    const file = await buildProjectFile(p, async () => new Blob([PNG], { type: 'image/png' }), async () => undefined)
    expect(file.formatVersion).toBe(1)
    expect(file.appVersion).toBe(APP_VERSION)
    const text = JSON.stringify(file)
    expect(text).toContain('"formatVersion":1')
    const { file: back, warning } = parseProjectFile(text)
    expect(warning).toBeNull()
    expect(back.project.meta).toEqual(p.meta)
    expect(back.project.settings).toEqual(p.settings)
    expect(back.project.sections).toEqual(p.sections)
    expect(back.images.img_one.startsWith('data:image/png;base64,')).toBe(true)
    expect(await bytes(dataUrlToBlob(back.images.img_one))).toEqual(Array.from(PNG))
  })

  it('gives a loaded copy fresh ids and rewrites every image reference', async () => {
    const p = sample()
    const file = await buildProjectFile(p, async () => new Blob([PNG], { type: 'image/png' }), async () => undefined)
    const copy = reidentify(parseProjectFile(JSON.stringify(file)).file)
    const newId = copy.project.images[0].id
    expect(copy.project.id).not.toBe(p.id)
    expect(newId).not.toBe('img_one')
    expect(Object.keys(copy.images)).toEqual([newId])
    expect(JSON.stringify(copy.project.sections)).toContain(newId)
    expect(JSON.stringify(copy.project.sections)).not.toContain('img_one')
  })

  it('warns — but still opens — a file from a newer version, and rejects non-project files', async () => {
    const file = await buildProjectFile(sample(), async () => undefined, async () => undefined)
    const newer = JSON.stringify({ ...file, formatVersion: FORMAT_VERSION + 4, appVersion: '9.0.0', project: { ...file.project, futureField: true } })
    const parsed = parseProjectFile(newer)
    expect(parsed.warning).toMatch(/newer GlitchBind/)
    expect(parsed.file.project.sections.length).toBe(4)
    expect(() => parseProjectFile('not json')).toThrow(/not a GlitchBind project file/)
    expect(() => parseProjectFile('{"hello":1}')).toThrow(/does not contain/)
    // an old file missing newer settings is filled with defaults instead of crashing
    const sparse = JSON.stringify({ formatVersion: 1, project: { id: 'x', sections: [], meta: { title: 'Old' }, settings: { trimId: '5x8', trim: { w: 5, h: 8 } } } })
    const old = parseProjectFile(sparse).file.project
    expect(old.settings.typography.bodyFont).toBeTruthy()
    expect(old.settings.trim).toEqual({ w: 5, h: 8 })
    expect(old.cover.items).toEqual([])
  })
})

describe('manuscript import', () => {
  it('recognises chapter lines', () => {
    expect(chapterTitleFrom('Chapter 3: The Storm')).toBe('The Storm')
    expect(chapterTitleFrom('CHAPTER FOUR')).toBe('Chapter Four')
    expect(chapterTitleFrom('Chapter IX')).toBe('Chapter IX')
    expect(chapterTitleFrom('PROLOGUE')).toBe('Prologue')
    expect(chapterTitleFrom('The chapter was long and she was tired.')).toBeNull()
  })
  it('splits plain text on “Chapter X” and keeps paragraphs', () => {
    const ch = parsePlainText('Chapter 1\n\nFirst para line one\nline two.\n\nSecond para.\n\n* * *\n\nChapter 2: Home\n\nShe arrived.')
    expect(ch.map((c) => c.title)).toEqual(['Chapter 1', 'Home'])
    expect(ch[0].html).toBe('<p>First para line one line two.</p><p>Second para.</p><div data-scene></div>')
    expect(ch[1].html).toBe('<p>She arrived.</p>')
  })
  it('splits Markdown on top-level headings and converts inline styles', () => {
    const ch = parseMarkdown('# One\n\nSome **bold** and *italic* text.\n\n## Inside\n\n- a\n- b\n\n> quoted\n\n# Two\n\nEnd.')
    expect(ch.map((c) => c.title)).toEqual(['One', 'Two'])
    expect(ch[0].html).toContain('<strong>bold</strong>')
    expect(ch[0].html).toContain('<em>italic</em>')
    expect(ch[0].html).toContain('<h1>Inside</h1>')
    expect(ch[0].html).toContain('<ul><li><p>a</p></li><li><p>b</p></li></ul>')
    expect(ch[0].html).toContain('<blockquote><p>quoted</p></blockquote>')
  })
  it('plain-text export carries metadata-driven copyright and chapter text', () => {
    const out = buildText(sample())
    expect(out).toContain('ROUND TRIP')
    expect(out).toContain('Copyright © ' + new Date().getFullYear() + ' Ada Author')
    expect(out).toContain('ISBN-13: 978-1-23456-789-7')
    expect(out).toContain('Hello page.')
  })
})
