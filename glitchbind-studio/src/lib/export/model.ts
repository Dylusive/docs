/** Shared export model: walks the book once so EPUB, HTML, DOCX and plain text agree on structure. */
import type { PMDoc, Project, Section } from '@/types'
import { chapterLabel } from '@/lib/generated'
import { copyrightLines } from '@/lib/generated'
import { chapterNumbering } from '@/lib/pagination/book'
import { asmSection } from '@/lib/layoutManager'
import { getBlob } from '@/lib/storage'
import { filterCss, type FigureAttrs, FIGURE_DEFAULTS } from '@/lib/editor/figure'

export interface ExportSection { section: Section; label: string; heading: string; blocks: PMDoc[] }

export function exportSections(project: Project): ExportSection[] {
  const numbering = chapterNumbering(project.sections.map((s) => asmSection(s, project)))
  return project.sections.filter((s) => s.kind !== 'toc').map((s) => ({
    section: s,
    label: s.numbered && numbering[s.id] ? chapterLabel(numbering[s.id], project.settings.typography.chapterNumber) : '',
    heading: s.showTitle ? s.title : '',
    blocks: s.kind === 'copyright' ? copyrightLines(project.meta).map((l) => ({ type: 'paragraph', content: [{ type: 'text', text: l }] })) as PMDoc[] : s.doc?.content ?? [],
  }))
}

export const xml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface BakedImage { blob: Blob; width: number; height: number; ext: string; type: string }
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }

/**
 * The picture as the reader should see it in a reflowable file: crop and adjustments are baked into
 * a new bitmap (the stored original is never modified). Untouched images are passed through as-is.
 */
export async function bakeImage(attrsIn: Partial<FigureAttrs>, opts: { forceRaster?: boolean; maxPx?: number } = {}): Promise<BakedImage | null> {
  const a = { ...FIGURE_DEFAULTS, ...attrsIn }
  if (!a.imageId) return null
  const original = await getBlob(a.imageId)
  if (!original) return null
  const type = original.type || 'image/png'
  const cropped = a.cx !== 0 || a.cy !== 0 || a.cw !== 1 || a.ch !== 1
  const filter = filterCss(a)
  const untouched = !cropped && !filter && a.opacity === 1
  const raster = type !== 'image/svg+xml'
  const size = await new Promise<{ w: number; h: number; img: HTMLImageElement | null }>((res) => {
    const img = new Image()
    const url = URL.createObjectURL(original)
    img.onload = () => res({ w: img.naturalWidth || 800, h: img.naturalHeight || 600, img })
    img.onerror = () => res({ w: 800, h: 600, img: null })
    img.src = url
  })
  if (untouched && (raster ? type !== 'image/webp' || !opts.forceRaster : !opts.forceRaster)) return { blob: original, width: size.w, height: size.h, ext: EXT[type] ?? 'png', type }
  if (!size.img) return { blob: original, width: size.w, height: size.h, ext: EXT[type] ?? 'png', type }
  const max = opts.maxPx ?? 2400
  const scaleUp = raster ? 1 : Math.max(1, 1600 / size.w)
  let w = Math.round(size.w * a.cw * scaleUp)
  let h = Math.round(size.h * a.ch * scaleUp)
  const k = Math.min(1, max / Math.max(w, h))
  w = Math.max(1, Math.round(w * k))
  h = Math.max(1, Math.round(h * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { blob: original, width: size.w, height: size.h, ext: EXT[type] ?? 'png', type }
  if (filter) ctx.filter = filter
  ctx.globalAlpha = a.opacity
  ctx.drawImage(size.img, size.w * a.cx, size.h * a.cy, size.w * a.cw, size.h * a.ch, 0, 0, w, h)
  const jpeg = type === 'image/jpeg' && a.opacity === 1
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), jpeg ? 'image/jpeg' : 'image/png', 0.92))
  return blob ? { blob, width: w, height: h, ext: jpeg ? 'jpg' : 'png', type: jpeg ? 'image/jpeg' : 'image/png' } : null
}

export interface XhtmlContext {
  /** returns the src to use for a figure, or null to omit it */
  image: (attrs: FigureAttrs) => string | null
  notes: string[]
  noteId: (n: number) => string
  epub: boolean
  sceneBreak: string
  figureCount: number
  figureNumbers: boolean
}

function marks(text: string, node: PMDoc): string {
  let out = xml(text)
  for (const m of node.marks ?? []) {
    if (m.type === 'bold') out = `<strong>${out}</strong>`
    else if (m.type === 'italic') out = `<em>${out}</em>`
    else if (m.type === 'underline') out = `<span class="u">${out}</span>`
    else if (m.type === 'strike') out = `<s>${out}</s>`
    else if (m.type === 'superscript') out = `<sup>${out}</sup>`
    else if (m.type === 'subscript') out = `<sub>${out}</sub>`
    else if (m.type === 'highlight') out = `<mark${m.attrs?.color ? ` style="background-color:${xml(String(m.attrs.color))}"` : ''}>${out}</mark>`
    else if (m.type === 'textStyle') {
      const st: string[] = []
      if (m.attrs?.color) st.push(`color:${m.attrs.color}`)
      if (m.attrs?.fontSize) st.push(`font-size:${m.attrs.fontSize}pt`)
      if (m.attrs?.letterSpacing) st.push(`letter-spacing:${m.attrs.letterSpacing}em`)
      if (m.attrs?.fontWeight) st.push(`font-weight:${m.attrs.fontWeight}`)
      if (st.length) out = `<span style="${xml(st.join(';'))}">${out}</span>`
    }
  }
  return out
}

/** Serialise document nodes to clean, well-formed XHTML (valid inside an EPUB 3 content document). */
export function nodesToXhtml(nodes: PMDoc[], ctx: XhtmlContext): string {
  const kids = (n: PMDoc): string => nodesToXhtml(n.content ?? [], ctx)
  const style = (n: PMDoc): string => {
    const st: string[] = []
    if (n.attrs?.textAlign) st.push(`text-align:${n.attrs.textAlign}`)
    return st.length ? ` style="${st.join(';')}"` : ''
  }
  return nodes.map((n) => {
    switch (n.type) {
      case 'text': return marks(n.text ?? '', n)
      case 'hardBreak': return '<br/>'
      case 'paragraph': { const cls = n.attrs?.variant ? ` class="${xml(String(n.attrs.variant))}"` : ''; const inner = kids(n); return `<p${cls}${style(n)}>${inner || '&#160;'}</p>\n` }
      case 'heading': { const l = Math.min(6, Number(n.attrs?.level ?? 1) + 1); return `<h${l}${style(n)}>${kids(n)}</h${l}>\n` }
      case 'bulletList': return `<ul>\n${kids(n)}</ul>\n`
      case 'orderedList': return `<ol>\n${kids(n)}</ol>\n`
      case 'listItem': return `<li>${kids(n)}</li>\n`
      case 'blockquote': return `<blockquote>\n${kids(n)}</blockquote>\n`
      case 'pullQuote': return `<blockquote class="pullquote"><p>${kids(n)}</p></blockquote>\n`
      case 'textBox': return `<aside class="textbox">\n${kids(n)}</aside>\n`
      case 'sceneBreak': return `<p class="scene">${xml(ctx.sceneBreak)}</p>\n`
      case 'pageBreak': return ''
      case 'table': return `<table>\n<tbody>\n${kids(n)}</tbody>\n</table>\n`
      case 'tableRow': return `<tr>${kids(n)}</tr>\n`
      case 'tableHeader': return `<th>${kids(n)}</th>`
      case 'tableCell': return `<td>${kids(n)}</td>`
      case 'footnote': {
        ctx.notes.push(String(n.attrs?.text ?? ''))
        const num = ctx.notes.length
        const id = ctx.noteId(num)
        return `<sup class="fnref"><a ${ctx.epub ? 'epub:type="noteref" ' : ''}href="#${id}" id="${id}-ref">${num}</a></sup>`
      }
      case 'figure': {
        const a = { ...FIGURE_DEFAULTS, ...(n.attrs as Partial<FigureAttrs>) }
        const src = ctx.image(a)
        if (!src) return ''
        let cap = ''
        if (a.caption && a.wrap !== 'page' && a.wrap !== 'behind') {
          const numbered = a.numbered || ctx.figureNumbers
          if (numbered) ctx.figureCount++
          cap = `<figcaption>${numbered ? `<strong>Figure ${ctx.figureCount}.</strong> ` : ''}${xml(a.caption)}</figcaption>`
        }
        const cls = a.wrap === 'left' ? 'fig fig-left' : a.wrap === 'right' ? 'fig fig-right' : a.wrap === 'page' ? 'fig fig-page' : 'fig'
        return `<figure class="${cls}"><img src="${xml(src)}" alt="${xml(a.alt)}"/>${cap}</figure>\n`
      }
      default: return kids(n)
    }
  }).join('')
}

export function notesXhtml(ctx: XhtmlContext): string {
  if (!ctx.notes.length) return ''
  const items = ctx.notes.map((t, i) => {
    const id = ctx.noteId(i + 1)
    return `<aside ${ctx.epub ? 'epub:type="footnote" ' : ''}class="note" id="${id}"><p><a href="#${id}-ref">${i + 1}.</a> ${xml(t)}</p></aside>`
  }).join('\n')
  return `<section class="notes">\n<hr/>\n${items}\n</section>\n`
}

/** Stylesheet for reflowable exports (EPUB and HTML). Deliberately simple: e-readers override most of it. */
export function reflowCss(project: Project, embedded: { family: string; file: string }[] = []): string {
  const t = project.settings.typography
  const c = project.settings.colors
  const faces = embedded.map((f) => `@font-face { font-family: "${f.family}"; src: url("${f.file}"); }`).join('\n')
  const serif = (f: string): string => `"${f}", Georgia, "Times New Roman", serif`
  return `${faces}
body { font-family: ${serif(t.bodyFont)}; line-height: ${t.lineHeight}; margin: 5%; text-align: ${t.align}; ${t.hyphenate ? 'hyphens: auto; -webkit-hyphens: auto;' : ''} }
p { margin: 0 0 ${t.paraSpacing}em; text-indent: ${t.indent}em; }
h1, h2, h3, h4 { font-family: ${serif(t.headingFont)}; line-height: 1.25; text-align: left; hyphens: manual; page-break-after: avoid; break-after: avoid; }
h1.chapter { font-family: ${serif(t.chapterFont)}; font-weight: normal; font-size: 1.9em; text-align: ${t.chapterAlign}; margin: 2.5em 0 1.4em; ${t.chapterUppercase ? 'text-transform: uppercase;' : ''} }
h1.chapter .label { display: block; font-family: ${serif(t.headingFont)}; font-size: 0.45em; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 1em; color: ${c.accent}; }
h1.chapter .orn { display: block; font-size: 0.6em; margin-top: 0.8em; color: ${c.accent}; }
h1 + p, h2 + p, h3 + p, h4 + p, p.scene + p, section > p:first-of-type { text-indent: 0; }
p.title { font-size: 2em; text-align: center; text-indent: 0; } p.subtitle { font-size: 1.2em; font-style: italic; text-align: center; text-indent: 0; }
p.caption { font-size: 0.85em; text-align: center; text-indent: 0; } p.epigraph { font-style: italic; text-align: right; text-indent: 0; }
p.scene { text-align: center; text-indent: 0; margin: 1.2em 0; letter-spacing: 0.15em; color: ${c.accent}; }
blockquote { margin: 1em 1.5em; } blockquote p { text-indent: 0; }
blockquote.pullquote { margin: 1.4em 8%; padding: 0.7em 0; border-top: 1px solid ${c.accent}; border-bottom: 1px solid ${c.accent}; font-size: 1.2em; font-style: italic; text-align: center; color: ${c.accent}; }
aside.textbox { margin: 1.2em 0; padding: 0.8em 1em; border: 1px solid #888; border-left: 4px solid ${c.accent}; font-size: 0.92em; text-align: left; } aside.textbox p { text-indent: 0; margin-bottom: 0.4em; }
figure.fig { margin: 1.2em 0; text-align: center; page-break-inside: avoid; break-inside: avoid; } figure.fig img { max-width: 100%; height: auto; }
figure.fig-left { float: left; width: 42%; margin: 0.3em 1em 0.6em 0; } figure.fig-right { float: right; width: 42%; margin: 0.3em 0 0.6em 1em; }
figcaption { font-size: 0.85em; font-style: italic; margin-top: 0.4em; text-indent: 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.92em; text-align: left; } td, th { border: 1px solid #777; padding: 0.3em 0.5em; vertical-align: top; } td p, th p { text-indent: 0; margin: 0; }
sup.fnref { font-size: 0.7em; line-height: 0; } sup.fnref a { text-decoration: none; }
section.notes { margin-top: 2em; font-size: 0.88em; } section.notes p { text-indent: 0; margin-bottom: 0.4em; } section.notes hr { width: 25%; margin: 0 0 1em; border: 0; border-top: 1px solid #777; }
.u { text-decoration: underline; } mark { background-color: ${c.highlight}; }
.titlepage { text-align: center; margin-top: 18%; } .titlepage h1 { font-family: ${serif(t.chapterFont)}; font-weight: normal; font-size: 2.4em; text-align: center; } .titlepage p { text-indent: 0; text-align: center; }
.titlepage .sub { font-style: italic; font-size: 1.2em; } .titlepage .author { font-size: 1.3em; margin-top: 2em; letter-spacing: 0.06em; } .titlepage .publisher { margin-top: 5em; font-size: 0.85em; letter-spacing: 0.2em; text-transform: uppercase; }
.copyright p { text-indent: 0; font-size: 0.85em; margin-bottom: 0.8em; text-align: left; white-space: pre-line; }
.dedication, .epigraph { margin-top: 20%; font-style: italic; text-align: center; } .dedication p, .epigraph p { text-indent: 0; }
`
}

export function sectionBodyXhtml(es: ExportSection, project: Project, ctx: XhtmlContext): string {
  const s = es.section
  const t = project.settings.typography
  const m = project.meta
  if (s.kind === 'title') {
    return `<div class="titlepage"><h1>${xml(m.title)}</h1>${m.subtitle ? `<p class="sub">${xml(m.subtitle)}</p>` : ''}${m.author ? `<p class="author">${xml(m.author)}</p>` : ''}${m.publisher ? `<p class="publisher">${xml(m.publisher)}</p>` : ''}</div>\n`
  }
  const head = es.heading ? `<h1 class="chapter">${es.label ? `<span class="label">${xml(es.label)}</span>` : ''}${xml(es.heading)}${t.ornament ? `<span class="orn">${xml(t.ornament)}</span>` : ''}</h1>\n` : ''
  const body = nodesToXhtml(es.blocks, ctx)
  const cls = s.kind === 'copyright' ? 'copyright' : s.kind === 'dedication' ? 'dedication' : s.kind === 'epigraph' ? 'epigraph' : 'text'
  return `${head}<div class="${cls}">\n${body}</div>\n${notesXhtml(ctx)}`
}
