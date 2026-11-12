import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import JSZip from 'jszip'
import { caretInto, collectErrors, makePng, openDemo, openSection, pageCount, ready, reveal, settle } from './helpers'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glitchbind-features-'))
const figAttrs = (page: Page) => page.evaluate(() => {
  const sel = window.__gb!.controller.view!.state.selection as unknown as { node?: { type: { name: string }; attrs: Record<string, unknown> } }
  return sel.node?.type.name === 'figure' ? sel.node.attrs : null
})
const project = <T,>(page: Page, fn: string): Promise<T> => page.evaluate(`(() => { const p = window.__gb.project.getState().project; return (${fn})(p) })()`) as Promise<T>
const layoutPages = (page: Page) => page.evaluate(() => window.__gb!.layout.getState().pages.map((p) => ({ kind: p.kind, side: p.side, sectionId: p.sectionId, folio: p.folio, showFolio: p.showFolio, showHeader: p.showHeader, header: p.header, first: p.first })))
const drag = async (page: Page, testId: string, dx: number, dy: number): Promise<void> => {
  const box = (await page.getByTestId(testId).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 })
  await page.mouse.up()
  await settle(page, 300)
}

test.describe('features', () => {
  test('image tools: library reuse, rotate, crop, caption numbering, behind-text placement, adjustments in the PDF', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await openSection(page, 'The Answer')
    await caretInto(page, 'a light came on')

    // add a sharp image through the Image Library, then reuse it by dragging its thumbnail onto a page
    await page.getByRole('button', { name: 'Image library', exact: true }).click()
    await page.getByTestId('library-file-input').setInputFiles({ name: 'sharp.png', mimeType: 'image/png', buffer: makePng(1500, 1000) })
    await expect(page.getByTestId('library-item')).toHaveCount(4)
    await expect(page.getByTestId('library-item').filter({ hasText: 'sharp.png' })).toContainText('1500 × 1000px')
    await expect(page.getByTestId('library-item').filter({ hasText: 'sharp.png' })).toContainText('unused')
    const pageIndex = await page.evaluate(() => window.__gb!.controller.caretPage())
    const imageId = await project<string>(page, '(p) => p.images.find((i) => i.name === "sharp.png").id')
    await page.evaluate(({ pageIndex, imageId }) => {
      const dt = new DataTransfer()
      dt.setData('application/x-glitchbind-image', imageId)
      const target = document.querySelector(`.gb-page[data-page-index="${pageIndex}"] .gb-live p, .gb-live p`) as HTMLElement
      const r = target.getBoundingClientRect()
      for (const ev of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 40, clientY: r.top + 4 }))
    }, { pageIndex, imageId })
    await expect.poll(async () => (await figAttrs(page))?.imageId).toBe(imageId)
    await expect(page.getByTestId('library-item').filter({ hasText: 'sharp.png' })).toContainText('used 1×')
    // a used image cannot be deleted from the library by accident
    await page.getByRole('button', { name: 'Delete sharp.png' }).click({ force: true })
    await expect(page.getByText(/is used 1× in the book/)).toBeVisible()
    await expect(page.getByTestId('library-item')).toHaveCount(4)

    // rotate with the handle (clear notices and bring the image to the middle of the screen first)
    await page.evaluate(() => window.__gb!.ui.setState({ toasts: [] }))
    await page.locator('.gb-live figure.ProseMirror-selectednode').evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await settle(page, 300)
    await drag(page, 'handle-rotate', 60, 30)
    const rotated = (await figAttrs(page))!.rotation as number
    expect(Math.abs(rotated)).toBeGreaterThan(5)
    expect(await page.locator('.gb-live figure.ProseMirror-selectednode .gb-fig-frame').evaluate((el) => (el as HTMLElement).style.transform)).toContain('rotate(')
    await page.evaluate(() => window.__gb!.controller.editor!.commands.updateFigure({ rotation: 0 }))

    // crop: the frame changes shape, the picture is not stretched
    const before = await page.locator('.gb-live figure.ProseMirror-selectednode .gb-fig-frame').evaluate((el) => { const r = el.getBoundingClientRect(); return r.width / r.height })
    await page.getByRole('button', { name: 'Crop', exact: true }).click()
    await page.getByTestId('inspector').getByRole('slider', { name: 'Left', exact: true }).fill('40')
    await settle(page)
    const a = (await figAttrs(page))!
    expect(a.cx).toBeCloseTo(0.4, 2)
    expect(a.cw).toBeCloseTo(0.6, 2)
    const after = await page.locator('.gb-live figure.ProseMirror-selectednode .gb-fig-frame').evaluate((el) => { const r = el.getBoundingClientRect(); const i = el.querySelector('img')!.getBoundingClientRect(); return { aspect: r.width / r.height, imgAspect: i.width / i.height } })
    expect(after.aspect).toBeCloseTo(before * 0.6, 1)
    expect(after.imgAspect).toBeCloseTo(1.5, 1) // the image itself keeps its true proportions
    // shift-drag a corner: free aspect by cropping
    await page.evaluate(() => window.__gb!.ui.setState({ toasts: [] }))
    await page.locator('.gb-live figure.ProseMirror-selectednode').evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await settle(page, 300)
    const ch0 = (await figAttrs(page))!.ch as number
    const hb = (await page.getByTestId('handle-se').boundingBox())!
    await page.mouse.move(hb.x + 5, hb.y + 5)
    await page.mouse.down()
    await page.keyboard.down('Shift')
    await page.mouse.move(hb.x + 5, hb.y - 60, { steps: 5 })
    await page.keyboard.up('Shift')
    await page.mouse.up()
    await settle(page)
    expect((await figAttrs(page))!.ch as number).toBeLessThan(ch0)

    // caption with automatic figure number
    await page.getByTestId('caption-input').fill('The harbour at dusk.')
    await page.getByRole('switch', { name: 'Number this figure' }).click()
    await settle(page)
    const cap = page.locator('.gb-live figure.ProseMirror-selectednode figcaption')
    await expect(cap).toHaveText('The harbour at dusk.')
    expect(await cap.evaluate((el) => getComputedStyle(el, '::before').content)).toContain('Figure ')

    // grayscale adjustment, then check what the PDF actually contains
    await page.getByRole('button', { name: 'Adjust', exact: true }).click()
    await page.getByTestId('inspector').getByLabel('Grayscale').fill('100')
    await settle(page)
    expect((await figAttrs(page))!.grayscale).toBe(100)
    await page.evaluate(() => window.__gbPrint!.prepare('interior'))
    await page.emulateMedia({ media: 'print' })
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
    await page.emulateMedia({ media: 'screen' })
    await page.evaluate(() => window.__gbPrint!.cleanup())
    const file = path.join(tmp, 'adjust.pdf')
    fs.writeFileSync(file, pdf)
    const images = execFileSync('pdfimages', ['-list', file]).toString().split('\n').filter((l) => /^\s*\d+\s+\d+\s+image/.test(l)).map((l) => l.trim().split(/\s+/)).map((c) => ({ w: parseInt(c[3], 10), ppi: parseInt(c[12], 10) }))
    console.log('[pdf] embedded images (width px @ ppi):', images.map((i) => `${i.w}@${i.ppi}`).join(', '))
    expect(images.some((i) => i.w === 420), 'the untouched demo drawing is embedded at its original pixel size').toBe(true)
    expect(Math.min(...images.map((i) => i.ppi)), 'adjusted images are rasterised at print resolution').toBeGreaterThanOrEqual(240)
    // printing with an image selected leaves the app exactly as it was
    await expect(page.getByTestId('studio')).toBeVisible()
    await expect(page.getByTestId('figure-overlay')).toBeVisible()
    expect(await project<boolean>(page, '(p) => !!p')).toBe(true)

    // behind text: the image leaves the flow, sits on the page layer, and can be dragged anywhere
    const pagesBefore = await pageCount(page)
    await page.getByLabel('Text wrap').selectOption('behind')
    await settle(page)
    await reveal(page, await page.evaluate(() => window.__gb!.controller.caretPage()))
    const floating = page.locator('.gb-page .gb-floats figure.gb-fig')
    await expect(floating).toHaveCount(1)
    expect(await pageCount(page)).toBeLessThanOrEqual(pagesBefore)
    const x0 = (await figAttrs(page))!.x as number
    const mv = (await page.getByTestId('figure-move').boundingBox())!
    await page.mouse.move(mv.x + mv.width / 2, mv.y + mv.height / 2)
    await page.mouse.down()
    await page.mouse.move(mv.x + mv.width / 2 + 70, mv.y + mv.height / 2 + 40, { steps: 6 })
    await page.mouse.up()
    await settle(page)
    expect((await figAttrs(page))!.x as number).toBeGreaterThan(x0)
    // delete it
    await page.getByTestId('delete-image').click()
    await settle(page)
    await expect(page.locator('.gb-page .gb-floats figure.gb-fig')).toHaveCount(0)
    await expect(page.getByTestId('library-item').filter({ hasText: 'sharp.png' })).toContainText('unused')
    await page.getByRole('button', { name: /Delete 1 unused/ }).click()
    await expect(page.getByTestId('library-item')).toHaveCount(3)
    expect(log.errors).toEqual([])
  })

  test('structure: add, rename, reorder, duplicate and delete sections; contents and numbering follow', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    const titles = () => project<string[]>(page, '(p) => p.sections.map((s) => s.title)')
    const t0 = await titles()

    await openSection(page, 'The Answer')
    await page.getByTestId('add-section').click()
    await page.getByRole('button', { name: 'New chapter' }).click()
    await settle(page, 600)
    const t1 = await titles()
    expect(t1.length).toBe(t0.length + 1)
    expect(t1[t1.indexOf('The Answer') + 1]).toBe('Chapter 4')
    // the new chapter is ready to type in
    await page.keyboard.type('Fresh words in a fresh chapter.', { delay: 0 })
    await settle(page)
    expect(await project<string>(page, '(p) => JSON.stringify(p.sections.find((s) => s.title === "Chapter 4").doc)')).toContain('Fresh words in a fresh chapter.')

    // rename in the inspector → opener, contents and running heads all change
    await page.locator('body').click({ position: { x: 700, y: 995 } })
    await page.getByTestId('section-title-input').fill('Aftermath')
    await settle(page, 600)
    expect(await page.evaluate(() => window.__gb!.layout.getState().toc.map((t) => `${t.label}:${t.title}`))).toContain('4:Aftermath')
    const opener = await page.evaluate(() => { const l = window.__gb!.layout.getState(); const id = window.__gb!.ui.getState().activeSectionId!; return l.pages[l.firstPage[id]].page!.segments[0].html })
    expect(opener).toContain('Chapter Four')
    expect(opener).toContain('Aftermath')

    // drag it above "Eleven Sheets": chapter numbers re-count
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid="section-row"]')) as HTMLElement[]
      const src = rows.find((r) => r.textContent!.includes('Aftermath'))!
      const dst = rows.find((r) => r.textContent!.includes('Eleven Sheets'))!
      const dt = new DataTransfer()
      src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }))
      const r = dst.getBoundingClientRect()
      dst.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 20, clientY: r.top + 3 }))
      dst.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 20, clientY: r.top + 3 }))
      src.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
    })
    await settle(page, 600)
    const t2 = await titles()
    expect(t2.indexOf('Aftermath')).toBe(t2.indexOf('Eleven Sheets') - 1)
    expect(await page.evaluate(() => window.__gb!.layout.getState().toc.map((t) => `${t.label}:${t.title}`))).toEqual(expect.arrayContaining(['2:Aftermath', '3:Eleven Sheets', '4:The Answer']))

    // duplicate, then delete with undo
    const row = page.getByTestId('section-row').filter({ hasText: 'Aftermath' })
    await row.hover()
    await row.getByRole('button', { name: 'Actions for Aftermath' }).click()
    await page.getByRole('button', { name: 'Duplicate' }).click()
    await settle(page)
    expect(await titles()).toContain('Aftermath (copy)')
    const copy = page.getByTestId('section-row').filter({ hasText: 'Aftermath (copy)' })
    await copy.hover()
    await copy.getByRole('button', { name: 'Actions for Aftermath (copy)' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('Deleted “Aftermath (copy)”.')).toBeVisible()
    expect(await titles()).not.toContain('Aftermath (copy)')
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    expect(await titles()).toContain('Aftermath (copy)')

    // one-click front and back matter templates
    await page.getByTestId('add-section').click()
    await page.getByRole('button', { name: 'Acknowledgements' }).click()
    await settle(page, 500)
    await page.getByTestId('add-section').click()
    await expect(page.getByRole('button', { name: /Title Page/ })).toBeDisabled() // only one title page per book
    await page.getByRole('button', { name: 'Epigraph' }).click()
    await settle(page, 500)
    const kinds = await project<string[]>(page, '(p) => p.sections.map((s) => s.kind + ":" + s.matter)')
    expect(kinds).toContain('acknowledgements:back')
    expect(kinds).toContain('epigraph:front')
    expect(kinds.indexOf('epigraph:front')).toBeLessThan(kinds.findIndex((k) => k.startsWith('chapter')))
    expect(kinds.indexOf('acknowledgements:back')).toBeGreaterThan(kinds.lastIndexOf('chapter:body'))
    expect(log.errors).toEqual([])
  })

  test('layout controls: chapters on right-hand pages, running heads, page numbers, custom trim, footers hidden on openers', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await page.getByTestId('inspector-tab-layout').click()
    const p0 = await layoutPages(page)
    const starts = (pages: Awaited<ReturnType<typeof layoutPages>>) => pages.filter((p) => p.first && p.sectionId).map((p) => p.side)

    await page.getByRole('switch', { name: 'Chapters start on a right-hand page' }).click()
    await settle(page, 700)
    const p1 = await layoutPages(page)
    const chapterIds = await project<string[]>(page, '(p) => p.sections.filter((s) => s.kind === "chapter").map((s) => s.id)')
    for (const id of chapterIds) expect(p1.find((p) => p.sectionId === id && p.first)!.side).toBe('right')
    expect(p1.filter((p) => p.kind === 'blank').length).toBeGreaterThan(p0.filter((p) => p.kind === 'blank').length)
    expect(starts(p1).length).toBe(starts(p0).length)

    // running heads: choose chapter title on right pages
    await page.getByLabel('Right page header').selectOption('chapter')
    await settle(page, 500)
    const p2 = await layoutPages(page)
    const withHead = p2.filter((p) => p.showHeader && p.side === 'right')
    expect(withHead.length).toBeGreaterThan(0)
    const names = await project<string[]>(page, '(p) => p.sections.map((s) => s.title)')
    for (const p of withHead) expect(names).toContain(p.header)
    // never on chapter openers, the title page or blanks
    expect(p2.filter((p) => p.first).every((p) => !p.showHeader && !p.showFolio)).toBe(true)
    expect(p2[0].showFolio).toBe(false)
    // front matter roman, body arabic from 1
    const firstChapter = p2.find((p) => p.sectionId === chapterIds[0] && p.first)!
    expect(firstChapter.folio).toBe('1')
    expect(p2[2].folio).toBe('iii')

    await page.getByLabel('Page number position').selectOption('none')
    await settle(page, 500)
    expect((await layoutPages(page)).some((p) => p.showFolio)).toBe(false)
    await page.getByLabel('Page number position').selectOption('bottom-outer')
    await settle(page, 500)
    const body = (await layoutPages(page)).findIndex((p) => p.showFolio && p.side === 'left')
    await reveal(page, body)
    const folioSide = await page.locator(`.gb-page[data-page-index="${body}"]`).evaluate((el) => { const p = el.getBoundingClientRect(); const f = el.querySelector('.gb-folio')!.getBoundingClientRect(); return (f.left + f.width / 2 - p.left) / p.width })
    expect(folioSide).toBeLessThan(0.3) // outer edge of a left-hand page is its left

    // custom trim in millimetres
    await page.getByLabel('Trim size').last().selectOption('custom')
    await page.getByRole('radio', { name: 'Millimetres', exact: true }).click()
    await page.getByTestId('inspector').getByLabel('Width', { exact: true }).fill('130')
    await page.getByTestId('inspector').getByLabel('Height', { exact: true }).fill('200')
    await page.keyboard.press('Tab')
    await settle(page, 800)
    const trim = await project<{ w: number; h: number }>(page, '(p) => p.settings.trim')
    expect(trim.w).toBeCloseTo(130 / 25.4, 3)
    expect(trim.h).toBeCloseTo(200 / 25.4, 3)
    const geo = await page.evaluate(() => window.__gb!.layout.getState().geo)
    expect(geo.trimW).toBeCloseTo((130 / 25.4) * 96, 1)
    // presets set trim, margins, bleed and gutter in one click
    await page.getByLabel('Publishing preset').last().selectOption('ingram')
    await settle(page, 700)
    const s = await project<{ bleed: boolean; autoGutter: boolean; margins: { inside: number } }>(page, '(p) => p.settings')
    expect(s.bleed).toBe(true)
    expect(s.autoGutter).toBe(false)
    expect(s.margins.inside).toBe(0.875)
    expect(log.errors).toEqual([])
  })

  test('design: fonts per slot, saved palette, my-own-style, custom font upload with licence handling', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await page.getByTestId('inspector-tab-design').click()

    // body font slot → every page's text changes font; the picker previews each family in its own face
    await page.getByRole('button', { name: 'Body font', exact: true }).click()
    const option = page.getByRole('option', { name: 'Lora', exact: true })
    expect(await option.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Lora')
    expect(await page.getByRole('option').count()).toBeGreaterThanOrEqual(30)
    await option.click()
    await settle(page, 900)
    expect(await project<string>(page, '(p) => p.settings.typography.bodyFont')).toBe('Lora')
    await openSection(page, 'The Keeper of Dead Air')
    expect(await page.locator('.gb-live p').first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Lora')
    expect(await page.evaluate(() => document.fonts.check('16px "Lora"'))).toBe(true)

    // save a palette
    await page.getByTestId('inspector-tab-design').click()
    await page.getByLabel('Accent colour hex').fill('#B8325A')
    await page.getByLabel('Palette name').fill('House style')
    await page.getByRole('button', { name: 'Save', exact: true }).last().click()
    await expect(page.getByRole('button', { name: 'Palette: House style' })).toBeVisible()
    expect(await project<number>(page, '(p) => p.customPalettes.length')).toBe(1)
    await page.getByRole('button', { name: 'Palette: Parchment' }).click()
    await settle(page, 500)
    expect(await project<string>(page, '(p) => p.settings.colors.page')).toBe('#F4ECD8')
    await page.getByRole('button', { name: 'Palette: House style' }).click()
    expect(await project<string>(page, '(p) => p.settings.colors.accent')).toBe('#B8325A')

    // save-my-own-style: format a paragraph, save it, apply it to another
    await page.getByTestId('inspector-tab-context').click()
    await caretInto(page, 'The night the map arrived')
    await page.getByLabel('Centre', { exact: true }).click()
    await page.getByLabel('Italic  Ctrl+I').click()
    await page.getByRole('button', { name: 'My styles', exact: true }).click()
    await page.getByLabel('New style name').fill('Whisper')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await settle(page)
    const styleId = await project<string>(page, '(p) => p.customStyles[0].id')
    expect(await project<string>(page, '(p) => p.customStyles[0].name + "|" + p.customStyles[0].align')).toBe('Whisper|center')
    await caretInto(page, 'It began as a flicker')
    await page.getByLabel('Paragraph style').selectOption(styleId)
    await settle(page)
    const styled = page.locator(`.gb-live p.gb-v-${styleId}`).filter({ hasText: 'It began as a flicker' })
    await expect(styled).toHaveCount(1)
    expect(await styled.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center')

    // upload a custom font (a real woff2), see the licence reminder, and check EPUB refuses to embed it silently
    await page.getByTestId('inspector-tab-design').click()
    const fontFile = path.resolve('node_modules/@fontsource/caveat/files/caveat-latin-700-normal.woff2')
    await page.locator('input[type=file][accept=".ttf,.otf,.woff2"]').setInputFiles({ name: 'My-Handwriting.woff2', mimeType: 'font/woff2', buffer: fs.readFileSync(fontFile) })
    await expect(page.getByText(/You are responsible for this font’s print and commercial licence/)).toBeVisible()
    expect(await project<string>(page, '(p) => p.customFonts[0].family')).toBe('My Handwriting')
    await page.getByRole('button', { name: 'Chapter title font', exact: true }).click()
    await page.getByRole('option', { name: 'My Handwriting', exact: true }).click()
    await settle(page, 900)
    expect(await page.evaluate(() => document.fonts.check('20px "My Handwriting"'))).toBe(true)
    await page.getByTestId('export-button').click()
    const [dl1] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-epub').click()])
    const epub1 = path.join(tmp, 'nofont.epub')
    await dl1.saveAs(epub1)
    await expect(page.getByText(/was not embedded because its licence is not confirmed/)).toBeVisible()
    expect(Object.keys((await JSZip.loadAsync(fs.readFileSync(epub1))).files).some((n) => n.startsWith('OEBPS/fonts/'))).toBe(false)
    await page.keyboard.press('Escape')
    await page.getByText('My licence allows embedding this font in e-books').click()
    await page.getByTestId('export-button').click()
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-epub').click()])
    const epub2 = path.join(tmp, 'font.epub')
    await dl2.saveAs(epub2)
    const zip = await JSZip.loadAsync(fs.readFileSync(epub2))
    expect(Object.keys(zip.files).filter((n) => n.startsWith('OEBPS/fonts/') && !n.endsWith('/')).length).toBe(1)
    expect(await zip.file('OEBPS/css/book.css')!.async('string')).toContain('@font-face { font-family: "My Handwriting"')
    await page.keyboard.press('Escape')
    // the font travels with the project after a reload
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', { timeout: 15_000 })
    await page.reload()
    await ready(page)
    await expect.poll(() => page.evaluate(() => document.fonts.check('20px "My Handwriting"'))).toBe(true)
    expect(log.errors).toEqual([])
  })

  test('tables, lists, scene and page breaks, hyphenation toggle, view modes and zoom', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await openSection(page, 'The Answer')
    await caretInto(page, 'a light came on')
    const insert = async (label: string): Promise<void> => { await page.getByTestId('insert-menu').click(); await page.getByRole('button', { name: label }).click(); await settle(page, 350) }
    const count = (type: string) => page.evaluate((t) => { let n = 0; window.__gb!.controller.view!.state.doc.descendants((x) => { if (x.type.name === t) n++ }); return n }, type)

    await page.keyboard.press('Enter')
    await insert('Table (3 × 3)')
    expect(await count('tableRow')).toBe(3)
    await page.keyboard.type('Cell one', { delay: 0 })
    await page.getByRole('button', { name: 'Add row' }).click()
    await page.getByRole('button', { name: 'Add column' }).click()
    await settle(page)
    expect(await count('tableRow')).toBe(4)
    expect(await page.locator('.gb-live table tr').first().locator('th, td').count()).toBe(4)
    await page.getByRole('button', { name: 'Remove row' }).click()
    await page.getByRole('button', { name: 'Remove column' }).click()
    await settle(page)
    expect(await count('tableRow')).toBe(3)
    await page.getByRole('button', { name: 'Delete table' }).click()
    expect(await count('table')).toBe(0)

    // page break really starts a new page
    await caretInto(page, 'There is a particular silence')
    const startsOfPages = () => page.evaluate(() => { const g = window.__gb!; const id = g.ui.getState().activeSectionId; return g.layout.getState().pages.filter((p) => p.sectionId === id).map((p) => (p.page!.segments.find((s) => s.key === 'main')?.html ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 20)) })
    const before = await startsOfPages()
    await page.keyboard.press('Control+Enter')
    await settle(page, 500)
    expect(await count('pageBreak')).toBe(1)
    // the paragraph after the break now opens the next page
    expect((await startsOfPages())[1]).toBe('The entry was short.')
    await page.keyboard.press('Control+z')
    await settle(page, 500)
    expect(await count('pageBreak')).toBe(0)
    expect(await startsOfPages()).toEqual(before)

    // scene break uses the book-wide glyph
    await caretInto(page, 'She understood then')
    await insert('Scene break')
    expect(await count('sceneBreak')).toBe(1)
    expect(await page.locator('.gb-live .gb-scene').first().evaluate((el) => getComputedStyle(el, '::before').content)).toBe('"* * *"')
    await page.getByTestId('inspector-tab-design').click()
    await page.getByRole('radio', { name: '✦ ✦ ✦', exact: true }).click()
    await settle(page, 500)
    expect(await page.locator('.gb-live .gb-scene').first().evaluate((el) => getComputedStyle(el, '::before').content)).toBe('"✦ ✦ ✦"')

    // lists
    await caretInto(page, 'She understood then')
    await page.getByLabel('Numbered list').click()
    expect(await count('orderedList')).toBe(1)
    await page.getByLabel('Numbered list').click()
    expect(await count('orderedList')).toBe(0)

    // hyphenation toggle changes the CSS on real pages
    const hy = () => page.locator('.gb-live p').first().evaluate((el) => getComputedStyle(el).hyphens)
    expect(await hy()).toBe('auto')
    await page.getByRole('switch', { name: 'Hyphenation' }).click()
    await settle(page, 500)
    expect(await hy()).toBe('manual')
    expect(await page.locator('.gb-live').getAttribute('lang')).toBe('en')
    expect(await page.locator('.gb-live').getAttribute('spellcheck')).toBe('true')

    // views and zoom
    const zoom = () => page.locator('.gb-screen').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)
    await page.locator('[data-tip="Single page"]').click()
    expect(await page.getByTestId('canvas').evaluate((el) => getComputedStyle(el).scrollSnapType)).toContain('y')
    await page.locator('[data-tip="Continuous"]').click()
    await page.getByLabel('Zoom in', { exact: true }).click()
    const z1 = await zoom()
    await page.getByLabel('Zoom in', { exact: true }).click()
    expect(await zoom()).toBeGreaterThan(z1)
    for (let i = 0; i < 30; i++) await page.getByLabel('Zoom out', { exact: true }).click({ force: true }).catch(() => undefined)
    expect(await zoom()).toBeCloseTo(0.5, 2)
    await expect(page.getByTestId('zoom-label')).toHaveText('50%')
    await page.getByLabel('Fit to window').click()
    await expect(page.getByTestId('zoom-label')).toHaveText('Fit')
    // guides are on screen only
    await page.locator('[aria-label="Guides"]').click()
    await page.getByRole('switch', { name: 'Margin guides' }).click()
    await page.getByRole('switch', { name: 'Bleed line (0.125″, red)' }).click()
    expect(await page.locator('.gb-page .gb-guide-margin').count()).toBeGreaterThan(0)
    expect(await page.locator('.gb-page .gb-guide-bleed').count()).toBeGreaterThan(0)
    expect(log.errors).toEqual([])
  })

  test('cover builder: starting layout from metadata, move, resize, add text and image, spine follows the page count', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await page.getByTestId('top-bar').getByRole('radio', { name: 'Cover', exact: true }).click()
    await expect(page.getByTestId('cover-builder')).toBeVisible()
    const items = () => project<{ id: string; type: string; bind: string | null; panel: string; x: number; y: number; w: number; h: number; imageId?: string }[]>(page, '(p) => p.cover.items')
    await expect.poll(async () => (await items()).length).toBeGreaterThanOrEqual(5)
    const start = await items()
    expect(start.filter((i) => i.type === 'barcode').length).toBe(1)
    expect(start.find((i) => i.bind === 'title')!.panel).toBe('front')
    await expect(page.locator('[data-cover-item]').filter({ hasText: 'The Lighthouse at the Edge of the Signal' })).toBeVisible()
    await expect(page.locator('[data-type="barcode"]')).toContainText('ISBN')

    // metadata flows straight onto the cover and the barcode box
    await page.getByTestId('book-title').click()
    await page.getByTestId('meta-title').fill('Signal Fires')
    await page.getByTestId('meta-isbn13').fill('978-1-23456-789-7')
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.locator('[data-cover-item]').filter({ hasText: 'Signal Fires' })).toBeVisible()
    await expect(page.locator('[data-type="barcode"]')).toContainText('ISBN 978-1-23456-789-7')

    // drag the author line, then resize it
    const author = start.find((i) => i.bind === 'author')!
    const el = page.locator(`[data-cover-item="${author.id}"]`)
    const box = (await el.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 - 60, { steps: 6 })
    await page.mouse.up()
    await settle(page)
    const moved = (await items()).find((i) => i.id === author.id)!
    expect(moved.y).toBeLessThan(author.y)
    await drag(page, 'cover-resize', 30, 40)
    expect((await items()).find((i) => i.id === author.id)!.h).toBeGreaterThan(moved.h)
    // arrow keys nudge, undo restores
    await page.keyboard.press('ArrowDown')
    await settle(page, 200)
    expect((await items()).find((i) => i.id === author.id)!.y).toBeGreaterThan(moved.y)

    // add text and a front image
    await page.getByTestId('cover-builder').getByRole('button', { name: 'Text', exact: true }).first().click()
    await page.getByLabel('Cover text').fill('A NOVELLA')
    await expect(page.locator('[data-cover-item]').filter({ hasText: 'A NOVELLA' })).toBeVisible()
    await page.getByTestId('cover-file-input').setInputFiles({ name: 'art.png', mimeType: 'image/png', buffer: makePng(1300, 1900) })
    await expect.poll(async () => (await items()).filter((i) => i.type === 'image').length).toBe(1)
    const img = (await items()).find((i) => i.type === 'image')!
    expect(img.panel).toBe('front')
    expect((await items())[0].id).toBe(img.id) // pictures go under the text
    await expect(page.locator(`[data-cover-item="${img.id}"] img`)).toBeVisible()

    // the spine (and so the whole cover) grows with the page count
    const w0 = await page.getByTestId('cover-canvas').evaluate((c) => parseFloat(c.getAttribute('data-width-in')!))
    const frontX0 = (await items()).find((i) => i.bind === 'title')!.x
    await page.evaluate(() => {
      const g = window.__gb!
      g.project.getState().mutate((p) => {
        const src = p.sections.find((s) => s.kind === 'chapter')!
        const extra = Array.from({ length: 60 }, (_, i) => ({ ...src, id: 'grow_' + i, title: 'Extra ' + i }))
        return { ...p, sections: [...p.sections, ...extra] }
      }, { label: 'grow' })
    })
    await settle(page, 1800)
    const total = await pageCount(page)
    expect(total).toBeGreaterThan(100)
    const w1 = await page.getByTestId('cover-canvas').evaluate((c) => parseFloat(c.getAttribute('data-width-in')!))
    expect(w1 - w0).toBeCloseTo((total - 14) * 0.0025, 1)
    await expect.poll(async () => (await items()).find((i) => i.bind === 'title')!.x).toBeGreaterThan(frontX0) // front items moved with the front panel
    await expect(page.getByTestId('cover-dims')).toContainText(`${(total * 0.0025).toFixed(3)} in`)
    expect(log.errors).toEqual([])
  })

  test('a blank book: write, autosave, see honest save status, title page and copyright fill from metadata', async ({ page }) => {
    const log = collectErrors(page)
    await page.goto('/')
    await page.getByTestId('start-blank').click()
    await ready(page)
    await expect(page.getByTestId('save-status')).toHaveText(/Saved \d/)
    await openSection(page, 'Chapter Title')
    await page.keyboard.type('It was a dark and stormy night, and the printer was out of cyan.', { delay: 0 })
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', /dirty|saving/)
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', { timeout: 15_000 })
    await expect(page.getByTestId('book-stats')).toContainText('14')
    await page.getByTestId('book-title').click()
    await page.getByTestId('meta-title').fill('Out of Cyan')
    await page.getByTestId('meta-author').fill('P. Rinter')
    await page.getByRole('button', { name: 'Done' }).click()
    await settle(page, 600)
    const html = await page.evaluate(() => window.__gb!.layout.getState().pages.slice(0, 2).map((p) => p.page!.segments.map((s) => s.html).join('')).join('\n'))
    expect(html).toContain('Out of Cyan')
    expect(html).toContain('P. Rinter')
    expect(html).toContain('Copyright © ' + new Date().getFullYear())
    await expect(page).toHaveTitle('Out of Cyan — GlitchBind Studio')
    // back on the shelf: the thumbnail, word count and edit time are real
    await page.locator('[aria-label="Back to your books"]').click()
    const card = page.getByTestId('project-card').filter({ hasText: 'Out of Cyan' })
    await expect(card).toContainText('14 words')
    await expect(card).toContainText('Edited just now')
    // rename and delete from the shelf
    await card.hover()
    await card.getByRole('button', { name: 'Actions for Out of Cyan' }).click()
    await page.getByRole('button', { name: 'Duplicate' }).click()
    await expect(page.getByTestId('project-card').filter({ hasText: 'Out of Cyan (copy)' })).toBeVisible()
    const copy = page.getByTestId('project-card').filter({ hasText: 'Out of Cyan (copy)' })
    await copy.hover()
    await copy.getByRole('button', { name: 'Actions for Out of Cyan (copy)' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete forever' }).click()
    await expect(page.getByTestId('project-card').filter({ hasText: 'Out of Cyan (copy)' })).toHaveCount(0)
    expect(log.errors).toEqual([])
  })
})
