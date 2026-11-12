/** EPUB 3 export: reflowable, with metadata, navigation document, NCX fallback, images and a stylesheet. */
import JSZip from 'jszip'
import type { Project } from '@/types'
import { blobToDataUrl } from '@/lib/images'
import { getBlob, getFont } from '@/lib/storage'
import { bakeImage, exportSections, reflowCss, sectionBodyXhtml, xml, type XhtmlContext } from './model'
import type { FigureAttrs } from '@/lib/editor/figure'

export interface EpubResult { blob: Blob; warnings: string[]; files: string[] }

const MEDIA: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', ttf: 'font/ttf', otf: 'font/otf', woff2: 'font/woff2' }

const page = (title: string, lang: string, body: string, css = '../css/book.css'): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${xml(lang)}" lang="${xml(lang)}">\n<head>\n<meta charset="UTF-8"/>\n<title>${xml(title)}</title>\n<link rel="stylesheet" type="text/css" href="${css}"/>\n</head>\n<body>\n${body}</body>\n</html>\n`

export function bookIdentifier(project: Project): string {
  const isbn = (project.meta.isbn13 || project.meta.isbn10).replace(/[^0-9Xx]/g, '')
  return isbn ? `urn:isbn:${isbn}` : `urn:uuid:${project.id.replace(/[^a-z0-9]/gi, '').padEnd(12, '0')}`
}

export async function buildEpub(project: Project): Promise<EpubResult> {
  const zip = new JSZip()
  const warnings: string[] = []
  const m = project.meta
  const lang = m.language || 'en'
  // the mimetype entry must be first and stored without compression
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n<rootfiles>\n<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n</rootfiles>\n</container>\n`)

  // ---- images (crop and adjustments baked in; originals untouched)
  const manifest: { id: string; href: string; type: string; props?: string }[] = []
  const figureSrc = new Map<string, string>()
  const figures: FigureAttrs[] = []
  const collect = (nodes: unknown[]): void => {
    for (const n of nodes as { type?: string; attrs?: FigureAttrs; content?: unknown[] }[]) {
      if (n.type === 'figure' && n.attrs?.imageId) figures.push(n.attrs)
      if (n.content) collect(n.content)
    }
  }
  const sections = exportSections(project)
  sections.forEach((s) => collect(s.blocks))
  let imgN = 0
  for (const a of figures) {
    const baked = await bakeImage(a, { maxPx: 2000, forceRaster: false })
    if (!baked) { warnings.push('An image could not be read and was left out.'); continue }
    imgN++
    const href = `images/img${String(imgN).padStart(3, '0')}.${baked.ext}`
    zip.file(`OEBPS/${href}`, baked.blob)
    manifest.push({ id: `img${imgN}`, href, type: baked.type })
    figureSrc.set(a.id, `../${href}`)
  }

  // ---- optional cover image (the front-cover picture from the Cover Builder)
  const coverItem = project.cover.items.find((i) => i.type === 'image' && i.panel === 'front' && i.imageId)
  if (coverItem?.imageId) {
    const blob = await getBlob(coverItem.imageId)
    if (blob && blob.type !== 'image/svg+xml') {
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : blob.type === 'image/gif' ? 'gif' : 'jpg'
      zip.file(`OEBPS/images/cover.${ext}`, blob)
      manifest.push({ id: 'cover-image', href: `images/cover.${ext}`, type: MEDIA[ext], props: 'cover-image' })
    }
  }

  // ---- fonts: only author-uploaded fonts whose licence the author confirmed are embedded
  const embedded: { family: string; file: string }[] = []
  for (const f of project.customFonts) {
    if (!f.licenceConfirmed) { warnings.push(`“${f.family}” was not embedded because its licence is not confirmed — readers will see their device's own font. Tick the licence box under Design ▸ Fonts to embed it.`); continue }
    const blob = await getFont(f.id)
    if (!blob) continue
    const href = `fonts/${f.id}.${f.format}`
    zip.file(`OEBPS/${href}`, blob)
    manifest.push({ id: `font-${f.id}`, href, type: MEDIA[f.format] ?? 'application/octet-stream' })
    embedded.push({ family: f.family, file: `../${href}` })
  }
  zip.file('OEBPS/css/book.css', reflowCss(project, embedded))
  manifest.push({ id: 'css', href: 'css/book.css', type: 'text/css' })

  // ---- content documents
  const spine: string[] = []
  const toc: { href: string; title: string }[] = []
  let figureCount = 0
  sections.forEach((es, i) => {
    const id = `s${String(i + 1).padStart(3, '0')}`
    const href = `text/${id}.xhtml`
    const ctx: XhtmlContext = { image: (a) => figureSrc.get(a.id) ?? null, notes: [], noteId: (n) => `${id}-fn${n}`, epub: true, sceneBreak: project.settings.typography.sceneBreak, figureCount, figureNumbers: project.settings.figureNumbers }
    if (es.section.kind === 'chapter') { ctx.figureCount = 0 }
    const body = `<section epub:type="${es.section.kind === 'chapter' ? 'chapter' : es.section.matter === 'front' ? 'frontmatter' : es.section.matter === 'back' ? 'backmatter' : 'bodymatter'}" id="${id}">\n${sectionBodyXhtml(es, project, ctx)}</section>\n`
    figureCount = ctx.figureCount
    zip.file(`OEBPS/${href}`, page(es.section.title || m.title, lang, body))
    manifest.push({ id, href, type: 'application/xhtml+xml' })
    spine.push(id)
    if (es.section.includeInToc || es.section.kind === 'title') toc.push({ href, title: (es.label ? `${es.label}: ` : '') + (es.section.title || 'Untitled') })
  })

  // ---- navigation
  const first = toc[0]?.href ?? 'text/s001.xhtml'
  const navBody = `<nav epub:type="toc" id="toc">\n<h1>Contents</h1>\n<ol>\n${toc.map((t) => `<li><a href="${t.href}">${xml(t.title)}</a></li>`).join('\n')}\n</ol>\n</nav>\n<nav epub:type="landmarks" hidden="hidden">\n<ol>\n<li><a epub:type="bodymatter" href="${first}">Start of content</a></li>\n</ol>\n</nav>\n`
  zip.file('OEBPS/nav.xhtml', page('Contents', lang, navBody, 'css/book.css'))
  manifest.push({ id: 'nav', href: 'nav.xhtml', type: 'application/xhtml+xml', props: 'nav' })
  const uid = bookIdentifier(project)
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n<head><meta name="dtb:uid" content="${xml(uid)}"/><meta name="dtb:depth" content="1"/></head>\n<docTitle><text>${xml(m.title)}</text></docTitle>\n<navMap>\n${toc.map((t, i) => `<navPoint id="np${i + 1}" playOrder="${i + 1}"><navLabel><text>${xml(t.title)}</text></navLabel><content src="${t.href}"/></navPoint>`).join('\n')}\n</navMap>\n</ncx>\n`)
  manifest.push({ id: 'ncx', href: 'toc.ncx', type: 'application/x-dtbncx+xml' })

  // ---- package document: every field comes from Book Metadata
  const modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const meta = [
    `<dc:identifier id="pub-id">${xml(uid)}</dc:identifier>`,
    `<dc:title>${xml(m.title)}${m.subtitle ? `: ${xml(m.subtitle)}` : ''}</dc:title>`,
    `<dc:language>${xml(lang)}</dc:language>`,
    m.author ? `<dc:creator id="creator">${xml(m.author)}</dc:creator>\n<meta refines="#creator" property="role" scheme="marc:relators">aut</meta>` : '',
    m.publisher ? `<dc:publisher>${xml(m.publisher)}</dc:publisher>` : '',
    m.description ? `<dc:description>${xml(m.description)}</dc:description>` : '',
    `<dc:rights>Copyright © ${xml(m.copyrightYear)} ${xml(m.copyrightHolder || m.author)}</dc:rights>`,
    m.copyrightYear ? `<dc:date>${xml(m.copyrightYear)}</dc:date>` : '',
    `<meta property="dcterms:modified">${modified}</meta>`,
    manifest.some((x) => x.id === 'cover-image') ? '<meta name="cover" content="cover-image"/>' : '',
  ].filter(Boolean).join('\n')
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${xml(lang)}">\n<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n${meta}\n</metadata>\n<manifest>\n${manifest.map((x) => `<item id="${x.id}" href="${x.href}" media-type="${x.type}"${x.props ? ` properties="${x.props}"` : ''}/>`).join('\n')}\n</manifest>\n<spine toc="ncx">\n${spine.map((id) => `<itemref idref="${id}"/>`).join('\n')}\n</spine>\n</package>\n`)

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' })
  return { blob, warnings, files: Object.keys(zip.files) }
}

/** Single-file HTML: the same content documents joined together, images embedded as data URLs. */
export async function buildHtml(project: Project): Promise<Blob> {
  const sections = exportSections(project)
  const src = new Map<string, string>()
  const walk = async (nodes: unknown[]): Promise<void> => {
    for (const n of nodes as { type?: string; attrs?: FigureAttrs; content?: unknown[] }[]) {
      if (n.type === 'figure' && n.attrs?.imageId) {
        const baked = await bakeImage(n.attrs, { maxPx: 2000 })
        if (baked) src.set(n.attrs.id, await blobToDataUrl(baked.blob.type ? baked.blob : new Blob([baked.blob], { type: baked.type })))
      }
      if (n.content) await walk(n.content)
    }
  }
  for (const s of sections) await walk(s.blocks)
  const m = project.meta
  let figureCount = 0
  const body = sections.map((es, i) => {
    const id = `s${i + 1}`
    const ctx: XhtmlContext = { image: (a) => src.get(a.id) ?? null, notes: [], noteId: (n) => `${id}-fn${n}`, epub: false, sceneBreak: project.settings.typography.sceneBreak, figureCount: es.section.kind === 'chapter' ? 0 : figureCount, figureNumbers: project.settings.figureNumbers }
    const out = `<section id="${id}">\n${sectionBodyXhtml(es, project, ctx)}</section>\n<hr class="sep"/>\n`
    figureCount = ctx.figureCount
    return out
  }).join('')
  const css = reflowCss(project) + `\nbody { max-width: 38em; margin: 0 auto; padding: 3em 1.5em 6em; font-size: 1.12em; color: #111; background: #fff; }\nhr.sep { border: 0; margin: 4em 0; }\n`
  const html = `<!DOCTYPE html>\n<html lang="${xml(m.language || 'en')}">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${xml(m.title)}</title>\n<meta name="author" content="${xml(m.author)}">\n<meta name="description" content="${xml(m.description)}">\n<style>\n${css}</style>\n</head>\n<body>\n${body}</body>\n</html>\n`
  return new Blob([html], { type: 'text/html' })
}
