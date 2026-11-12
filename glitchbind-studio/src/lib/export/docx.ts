/** DOCX export via the `docx` package: real Word paragraphs, headings, footnotes, tables and images. */
import {
  AlignmentType, Document, FootnoteReferenceRun, HeadingLevel, ImageRun, LevelFormat, Packer, PageBreak, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
  type IRunOptions, type ParagraphChild,
} from 'docx'
import type { PMDoc, Project } from '@/types'
import { FIGURE_DEFAULTS, type FigureAttrs } from '@/lib/editor/figure'
import { bakeImage, exportSections, type BakedImage } from './model'

type AlignValue = (typeof AlignmentType)[keyof typeof AlignmentType]
const ALIGN: Record<string, AlignValue> = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED }
const TWIP = 1440

export async function buildDocx(project: Project): Promise<Blob> {
  const t = project.settings.typography
  const s = project.settings
  const sections = exportSections(project)
  const footnotes: Record<number, { children: Paragraph[] }> = {}
  let fnId = 0

  // images first (async), keyed by figure id
  const baked = new Map<string, BakedImage & { data: ArrayBuffer }>()
  const walk = async (nodes: PMDoc[]): Promise<void> => {
    for (const n of nodes) {
      if (n.type === 'figure' && n.attrs?.imageId) {
        const b = await bakeImage(n.attrs as FigureAttrs, { forceRaster: true, maxPx: 2200 })
        if (b && b.type !== 'image/svg+xml') baked.set(String(n.attrs.id), { ...b, data: await b.blob.arrayBuffer() })
      }
      if (n.content) await walk(n.content)
    }
  }
  for (const es of sections) await walk(es.blocks)

  const runs = (nodes: PMDoc[] | undefined, base: Partial<IRunOptions> = {}): ParagraphChild[] => {
    const out: ParagraphChild[] = []
    for (const n of nodes ?? []) {
      if (n.type === 'text') {
        const o: Record<string, unknown> = { ...base, text: n.text ?? '' }
        for (const m of n.marks ?? []) {
          if (m.type === 'bold') o.bold = true
          else if (m.type === 'italic') o.italics = true
          else if (m.type === 'underline') o.underline = {}
          else if (m.type === 'strike') o.strike = true
          else if (m.type === 'superscript') o.superScript = true
          else if (m.type === 'subscript') o.subScript = true
          else if (m.type === 'highlight') o.shading = { fill: String(m.attrs?.color ?? '#FFF1A8').replace('#', '') }
          else if (m.type === 'textStyle') {
            if (m.attrs?.color) o.color = String(m.attrs.color).replace('#', '')
            if (m.attrs?.fontSize) o.size = Math.round(Number(m.attrs.fontSize) * 2)
            if (m.attrs?.fontFamily) o.font = String(m.attrs.fontFamily)
          }
        }
        out.push(new TextRun(o as IRunOptions))
      } else if (n.type === 'hardBreak') out.push(new TextRun({ break: 1 }))
      else if (n.type === 'footnote') {
        fnId++
        footnotes[fnId] = { children: [new Paragraph({ children: [new TextRun(String(n.attrs?.text ?? ''))] })] }
        out.push(new FootnoteReferenceRun(fnId))
      }
    }
    return out
  }

  const blocks = (nodes: PMDoc[], ctx: { list?: 'bullet' | 'number'; level?: number; indentQuote?: boolean } = {}): (Paragraph | Table)[] => {
    const out: (Paragraph | Table)[] = []
    for (const n of nodes) {
      const align = n.attrs?.textAlign ? ALIGN[String(n.attrs.textAlign)] : undefined
      switch (n.type) {
        case 'paragraph': {
          const v = n.attrs?.variant
          out.push(new Paragraph({
            children: runs(n.content, v === 'epigraph' ? { italics: true } : {}),
            alignment: align ?? (v === 'title' || v === 'subtitle' || v === 'caption' ? AlignmentType.CENTER : v === 'epigraph' ? AlignmentType.RIGHT : ctx.list ? AlignmentType.LEFT : ALIGN[t.align]),
            heading: v === 'title' ? HeadingLevel.TITLE : undefined,
            indent: ctx.indentQuote ? { left: 720, right: 720 } : ctx.list || v ? undefined : { firstLine: Math.round(t.indent * t.bodySize * 20) },
            bullet: ctx.list === 'bullet' ? { level: ctx.level ?? 0 } : undefined,
            numbering: ctx.list === 'number' ? { reference: 'gb-numbered', level: ctx.level ?? 0 } : undefined,
            spacing: { after: Math.round(t.paraSpacing * t.bodySize * 20), line: Math.round(t.lineHeight * 240) },
          }))
          break
        }
        case 'heading': out.push(new Paragraph({ children: runs(n.content), heading: [HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][Number(n.attrs?.level ?? 1) - 1] ?? HeadingLevel.HEADING_2, alignment: align })); break
        case 'bulletList': for (const li of n.content ?? []) out.push(...blocks(li.content ?? [], { list: 'bullet', level: (ctx.level ?? -1) + 1 })); break
        case 'orderedList': for (const li of n.content ?? []) out.push(...blocks(li.content ?? [], { list: 'number', level: (ctx.level ?? -1) + 1 })); break
        case 'blockquote': out.push(...blocks(n.content ?? [], { indentQuote: true })); break
        case 'textBox': out.push(...blocks(n.content ?? [], { indentQuote: true })); break
        case 'pullQuote': out.push(new Paragraph({ children: runs(n.content, { italics: true, size: Math.round(t.bodySize * 2.5) }), alignment: AlignmentType.CENTER, spacing: { before: 240, after: 240 }, indent: { left: 720, right: 720 } })); break
        case 'sceneBreak': out.push(new Paragraph({ children: [new TextRun(t.sceneBreak)], alignment: AlignmentType.CENTER, spacing: { before: 240, after: 240 } })); break
        case 'pageBreak': out.push(new Paragraph({ children: [new PageBreak()] })); break
        case 'table':
          out.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: (n.content ?? []).map((r) => new TableRow({
              children: (r.content ?? []).map((c) => new TableCell({ children: blocks(c.content ?? [], { list: undefined }).map((b) => b as Paragraph), shading: c.type === 'tableHeader' ? { fill: 'EEEEEE' } : undefined })),
            })),
          }))
          break
        case 'figure': {
          const a = { ...FIGURE_DEFAULTS, ...(n.attrs as Partial<FigureAttrs>) }
          const b = baked.get(a.id)
          if (!b) break
          const maxIn = s.trim.w - s.margins.outside - s.margins.inside
          const wIn = a.wrap === 'page' || a.wrap === 'full' ? maxIn : Math.min(a.widthIn, maxIn)
          const w = Math.round(wIn * 96)
          out.push(new Paragraph({
            alignment: a.align === 'left' ? AlignmentType.LEFT : a.align === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER, spacing: { before: 200, after: a.caption ? 60 : 200 },
            children: [new ImageRun({ data: b.data, type: b.ext === 'jpg' ? 'jpg' : b.ext === 'gif' ? 'gif' : 'png', transformation: { width: w, height: Math.round((w * b.height) / b.width) }, altText: { title: a.alt || 'Image', description: a.alt, name: a.alt || 'Image' } })],
          }))
          if (a.caption && a.wrap !== 'page') out.push(new Paragraph({ children: [new TextRun({ text: a.caption, italics: true, size: Math.round(t.bodySize * 1.7) })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }))
          break
        }
        default: if (n.content) out.push(...blocks(n.content, ctx))
      }
    }
    return out
  }

  const children: (Paragraph | Table)[] = []
  const m = project.meta
  sections.forEach((es, i) => {
    const sec = es.section
    const brk = i > 0
    if (sec.kind === 'title') {
      children.push(new Paragraph({ children: [new TextRun({ text: m.title })], heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 240 }, pageBreakBefore: brk }))
      if (m.subtitle) children.push(new Paragraph({ children: [new TextRun({ text: m.subtitle, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 600 } }))
      if (m.author) children.push(new Paragraph({ children: [new TextRun({ text: m.author, size: 30 })], alignment: AlignmentType.CENTER }))
      if (m.publisher) children.push(new Paragraph({ children: [new TextRun({ text: m.publisher.toUpperCase(), size: 18 })], alignment: AlignmentType.CENTER, spacing: { before: 2400 } }))
      return
    }
    if (es.heading) {
      if (es.label) children.push(new Paragraph({ children: [new TextRun({ text: es.label.toUpperCase(), size: 18 })], alignment: ALIGN[t.chapterAlign], pageBreakBefore: brk, spacing: { before: 1200, after: 120 } }))
      children.push(new Paragraph({ children: [new TextRun({ text: es.heading })], heading: HeadingLevel.HEADING_1, alignment: ALIGN[t.chapterAlign], pageBreakBefore: brk && !es.label, spacing: { before: es.label ? 0 : 1200, after: 480 } }))
      children.push(...blocks(es.blocks))
    } else {
      const body = blocks(es.blocks)
      if (brk) children.push(new Paragraph({ children: [new PageBreak()] }))
      children.push(...body)
    }
  })

  const doc = new Document({
    creator: m.author || 'GlitchBind Studio', title: m.title, description: m.description, subject: m.subtitle,
    styles: { default: { document: { run: { font: t.bodyFont, size: Math.round(t.bodySize * 2) } } } },
    numbering: { config: [{ reference: 'gb-numbered', levels: [0, 1, 2].map((level) => ({ level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })) }] },
    footnotes,
    sections: [{
      properties: { page: { size: { width: Math.round(s.trim.w * TWIP), height: Math.round(s.trim.h * TWIP) }, margin: { top: Math.round(s.margins.top * TWIP), bottom: Math.round(s.margins.bottom * TWIP), left: Math.round(s.margins.inside * TWIP), right: Math.round(s.margins.outside * TWIP) } } },
      children,
    }],
  })
  return Packer.toBlob(doc)
}
