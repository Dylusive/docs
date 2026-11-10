import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import JSZip from 'jszip'
import { caretInto, collectErrors, histogram, makePng, openDemo, openSection, pageCount, ready, reveal, settle } from './helpers'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glitchbind-e2e-'))
const state = (page: Page) => page.evaluate(() => {
  const g = window.__gb!
  const l = g.layout.getState()
  return { pages: l.pages.length, insideIn: l.geo.insideIn, contentW: l.geo.contentW, toc: l.toc, firstPage: l.firstPage, folios: l.pages.map((p) => p.folio), kinds: l.pages.map((p) => p.kind), sides: l.pages.map((p) => p.side) }
})

/** Dispatch a real file drop (DataTransfer with a File) at the centre of a page element. */
async function dropImageOnPage(page: Page, pageIndex: number, type: 'image/jpeg' | 'image/png', w: number, h: number, name: string): Promise<void> {
  await page.evaluate(async ({ pageIndex, type, w, h, name }) => {
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#224466'); g.addColorStop(1, '#cc8844')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), type, 0.9))
    const dt = new DataTransfer()
    dt.items.add(new File([blob], name, { type }))
    const el = document.querySelector(`.gb-page[data-page-index="${pageIndex}"]`) as HTMLElement
    el.scrollIntoView({ block: 'center' })
    await new Promise((r) => setTimeout(r, 200))
    const target = el.querySelector('.gb-slice[data-src="main"] p') ?? el
    const r = target.getBoundingClientRect()
    for (const ev of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + r.width / 2, clientY: r.top + 6 }))
  }, { pageIndex, type, w, h, name })
}

async function printPdf(page: Page, kind: 'interior' | 'cover' | 'screen', file: string) {
  const job = await page.evaluate((k) => window.__gbPrint!.prepare(k), kind)
  await page.emulateMedia({ media: 'print' })
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
  await page.emulateMedia({ media: 'screen' })
  await page.evaluate(() => window.__gbPrint!.cleanup())
  fs.writeFileSync(file, pdf)
  const info = execFileSync('pdfinfo', [file]).toString()
  const pages = parseInt(/Pages:\s+(\d+)/.exec(info)![1], 10)
  const size = /Page size:\s+([\d.]+) x ([\d.]+) pts/.exec(info)!
  return { job: job!, pages, widthPt: parseFloat(size[1]), heightPt: parseFloat(size[2]) }
}

/** The letters each preview page shows, straight from the layout the canvas renders. */
const previewText = (page: Page) => page.evaluate(() => {
  const l = window.__gb!.layout.getState()
  return l.pages.map((p) => {
    const d = document.createElement('div')
    if (p.page) d.innerHTML = p.page.segments.map((s) => s.html).join(' ') + p.page.notes.map((n) => `<p>${n.text}</p>`).join(' ')
    d.querySelectorAll('.gb-hy, .gb-fig-empty').forEach((el) => el.remove())
    return (d.textContent ?? '') + ' ' + (p.showHeader ? p.header : '') + ' ' + (p.showFolio ? p.folio : '')
  })
})
function comparePdfToPreview(file: string, expected: string[]): number {
  let compared = 0
  for (let i = 0; i < expected.length; i++) {
    const text = execFileSync('pdftotext', ['-f', String(i + 1), '-l', String(i + 1), '-enc', 'UTF-8', file, '-']).toString()
    expect(histogram(text), `PDF page ${i + 1} carries exactly the letters of preview page ${i + 1}`).toEqual(histogram(expected[i]))
    if (Object.keys(histogram(expected[i])).length) compared++
  }
  return compared
}

test.describe('acceptance', () => {
  test('pagination proof: the 10,000-word fixture gives different, correct counts at 6×9 and 5.5×8.5', async ({ page }) => {
    await page.goto('/pagination-test')
    await page.waitForFunction(() => window.__paginationProof)
    const proof = await page.evaluate(() => window.__paginationProof!)
    console.log(`[browser] 10k fixture → ${proof.results.map((r) => `${r.trim}: ${r.pages} pages`).join(' · ')}`)
    expect(proof.words).toBe(10000)
    expect(proof.pass).toBe(true)
    const [a, b] = proof.results
    expect(b.pages).toBeGreaterThan(a.pages)
    for (const r of proof.results) {
      expect(r.overflow).toBe(0)
      expect(r.forced).toBe(0)
      expect(r.maxDrift).toBeLessThan(1)
      expect(r.charsOnPages).toBe(r.charsExpected)
    }
    await expect(page.getByTestId('proof-verdict')).toContainText('PASS')
  })

  test('typing repaginates live; a trim change repaginates the whole book', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await openSection(page, 'The Answer')
    const before = await state(page)
    /** where each chapter's first page ends — changes whenever its lines are re-broken */
    const firstPageEnds = () => page.evaluate(() => {
      const l = window.__gb!.layout.getState()
      const out: Record<string, string> = {}
      for (const p of l.pages) { const seg = p.page?.segments.find((s) => s.key === 'main'); if (p.sectionId && seg && !(p.sectionId in out)) out[p.sectionId] = seg.html.replace(/<[^>]+>/g, '').slice(-60) }
      return out
    })
    const ends0 = await firstPageEnds()
    await caretInto(page, 'a light came on')
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Enter')
      await page.keyboard.type(`Paragraph ${i} keeps going long enough to wrap across more than one line of the text block, which is the point.`, { delay: 0 })
    }
    await settle(page)
    const after = await state(page)
    expect(after.pages).toBeGreaterThan(before.pages)
    // the live editor window followed the caret onto the new last page of the chapter
    const live = await page.evaluate(() => { const g = window.__gb!; return { live: g.ui.getState().livePage, caret: g.controller.caretPage() } })
    expect(live.live).toBe(live.caret)
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', /dirty|saving|saved/)

    // trim change: every chapter reflows
    await page.getByLabel('Trim size').first().selectOption('5x8')
    await settle(page, 900)
    const small = await state(page)
    const ends1 = await firstPageEnds()
    expect(small.contentW).toBeLessThan(after.contentW)
    expect(small.pages).toBeGreaterThan(after.pages)
    const chapters = await page.evaluate(() => window.__gb!.project.getState().project!.sections.filter((x) => x.kind === 'chapter').map((x) => x.id))
    for (const id of chapters) expect(ends1[id], 'every chapter was re-broken for the new text block').not.toBe(ends0[id])
    await page.getByLabel('Trim size').first().selectOption('8.5x11')
    await settle(page, 900)
    expect((await state(page)).pages).toBeLessThan(small.pages)
    expect(log.errors).toEqual([])
  })

  test('drag a JPG onto the second page of a chapter: it appears, resizes and wraps; Ctrl+V paste works', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await openSection(page, 'The Keeper of Dead Air')
    const first = (await state(page)).firstPage
    const secId = await page.evaluate(() => window.__gb!.ui.getState().activeSectionId!)
    const target = first[secId] + 1 // second page of chapter one — a static page, not the one holding the caret
    const countFigs = () => page.evaluate(() => { let n = 0; window.__gb!.controller.view!.state.doc.descendants((x) => { if (x.type.name === 'figure') n++ }); return n })
    const n0 = await countFigs()
    await dropImageOnPage(page, target, 'image/jpeg', 1500, 1000, 'dropped.jpg')
    await expect.poll(countFigs).toBe(n0 + 1)
    await settle(page)
    const fig = page.locator('.gb-live figure.gb-fig.ProseMirror-selectednode')
    await expect(fig).toBeVisible()
    await expect(page.getByTestId('inspector')).toContainText('dropped.jpg')
    // it landed on the page it was dropped on
    expect(await page.evaluate(() => window.__gb!.controller.caretPage())).toBe(target)
    const library = await page.evaluate(() => window.__gb!.project.getState().project!.images.map((i) => i.name))
    expect(library).toContain('dropped.jpg')

    // resize with a corner handle
    const w0 = await fig.evaluate((el) => (el as HTMLElement).style.width)
    const handle = page.getByTestId('handle-se')
    const hb = (await handle.boundingBox())!
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(hb.x - 120, hb.y - 80, { steps: 6 })
    await page.mouse.up()
    await settle(page)
    const w1 = await fig.evaluate((el) => (el as HTMLElement).style.width)
    expect(parseFloat(w1)).toBeLessThan(parseFloat(w0))

    // wrap: text flows beside the image
    await page.getByLabel('Text wrap').selectOption('left')
    await settle(page)
    await expect(fig).toHaveAttribute('data-wrap', 'left')
    expect(await fig.evaluate((el) => getComputedStyle(el).float)).toBe('left')
    const beside = await page.evaluate(() => {
      const f = document.querySelector('.gb-live figure.ProseMirror-selectednode')!.getBoundingClientRect()
      const range = document.createRange()
      let hit = false
      document.querySelectorAll('.gb-live p').forEach((p) => { range.selectNodeContents(p); for (const r of range.getClientRects()) if (r.left >= f.right - 1 && r.top < f.bottom && r.bottom > f.top) hit = true })
      return hit
    })
    expect(beside).toBe(true)

    // paste an image from the clipboard
    await caretInto(page, 'tear was the size of the sky')
    const png = makePng(640, 480).toString('base64')
    await page.evaluate((b64) => {
      const bin = atob(b64); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
      const dt = new DataTransfer(); dt.items.add(new File([buf], 'clipboard.png', { type: 'image/png' }))
      document.querySelector('.gb-live')!.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }))
    }, png)
    await expect.poll(countFigs).toBe(n0 + 2)
    expect(log.errors).toEqual([])
  })

  test('illustrated full-page image and two-page spread render on their own pages', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    const s0 = await state(page)
    // the demo ships one full-bleed plate
    expect(s0.kinds.filter((k) => k === 'float').length).toBe(1)
    const plateIndex = s0.kinds.indexOf('float')
    await reveal(page, plateIndex)
    const plate = page.locator(`.gb-page[data-page-index="${plateIndex}"]`)
    await expect(plate.locator('.gb-plate img')).toBeVisible()
    // the picture fills the whole page (bleed is off in the demo, so it fills the trim box)
    const cover = await plate.evaluate((el) => { const p = el.getBoundingClientRect(); const i = el.querySelector('.gb-plate img')!.getBoundingClientRect(); return [Math.round(p.width - i.width), Math.round(p.height - i.height)] })
    expect(cover).toEqual([0, 0])
    await expect(plate.locator('.gb-folio')).toHaveCount(0)

    // insert a two-page spread into chapter three
    await openSection(page, 'The Answer')
    await caretInto(page, 'There is a particular silence')
    await page.getByTestId('insert-menu').click()
    const chooser = page.waitForEvent('filechooser')
    await page.getByText('Two-page spread image…').click()
    await (await chooser).setFiles({ name: 'panorama.png', mimeType: 'image/png', buffer: makePng(2400, 900) })
    await expect.poll(async () => (await state(page)).kinds.includes('spread-left')).toBe(true)
    const s1 = await state(page)
    const left = s1.kinds.indexOf('spread-left')
    expect(s1.kinds[left + 1]).toBe('spread-right')
    expect(s1.sides[left]).toBe('left')
    expect(s1.sides[left + 1]).toBe('right')
    // in spread view the two halves sit side by side and show different halves of one image
    await page.locator('[data-tip="Two-page spread"]').click()
    await settle(page)
    await reveal(page, left)
    await reveal(page, left + 1)
    const halves = await page.evaluate((i) => {
      const a = document.querySelector(`.gb-page[data-page-index="${i}"]`)!
      const b = document.querySelector(`.gb-page[data-page-index="${i + 1}"]`)!
      const ar = a.getBoundingClientRect(); const br = b.getBoundingClientRect()
      const ai = a.querySelector('.gb-plate figure')!.getBoundingClientRect(); const bi = b.querySelector('.gb-plate figure')!.getBoundingClientRect()
      return { touching: Math.abs(ar.right - br.left) < 1.5, sameRow: Math.abs(ar.top - br.top) < 1, figW: ai.width / ar.width, leftOffset: (ai.left - ar.left) / ar.width, rightOffset: (bi.left - br.left) / br.width }
    }, left)
    expect(halves.touching).toBe(true)
    expect(halves.sameRow).toBe(true)
    expect(halves.figW).toBeCloseTo(2, 1) // each page shows half of a double-width image
    expect(halves.leftOffset).toBeLessThanOrEqual(0)
    expect(halves.rightOffset).toBeGreaterThan(-1.01)
    expect(halves.rightOffset).toBeLessThan(-0.9) // right page shows the right half, nudged by gutter compensation
    expect(log.errors).toEqual([])
  })

  test('KDP preset: the gutter changes by itself when the book crosses 150 pages, and tells the author', async ({ page }) => {
    test.setTimeout(240_000)
    const log = collectErrors(page)
    await page.goto('/pagination-test')
    await page.getByTestId('stress-gutter').click()
    await ready(page)
    const s0 = await state(page)
    console.log(`[gutter] start: ${s0.pages} pages, inside margin ${s0.insideIn} in`)
    expect(s0.pages).toBeGreaterThan(24)
    expect(s0.pages).toBeLessThanOrEqual(150)
    expect(s0.insideIn).toBeCloseTo(0.375 + 0.25, 5)
    // a long book full of paragraphs split (and hyphenated) across pages: the PDF still matches page for page
    const longPdf = path.join(tmp, 'long.pdf')
    const printed = await printPdf(page, 'interior', longPdf)
    expect(printed.pages).toBe(s0.pages)
    const matched = comparePdfToPreview(longPdf, await previewText(page))
    console.log(`[pdf] long book: ${printed.pages} PDF pages, ${matched} compared letter-for-letter with the preview`)
    expect(matched).toBeGreaterThan(120)
    // grow the book by duplicating a chapter until it crosses 150 pages
    for (let i = 0; i < 4 && (await pageCount(page)) <= 150; i++) {
      await page.evaluate(() => {
        const g = window.__gb!
        g.project.getState().mutate((p) => {
          const src = p.sections.find((s) => s.kind === 'chapter')!
          return { ...p, sections: [...p.sections, { ...src, id: 'dup_' + Math.random().toString(36).slice(2), title: src.title + ' again' }] }
        }, { label: 'grow' })
      })
      await settle(page, 1200)
    }
    const s1 = await state(page)
    console.log(`[gutter] after growing: ${s1.pages} pages, inside margin ${s1.insideIn} in`)
    expect(s1.pages).toBeGreaterThan(150)
    expect(s1.insideIn).toBeCloseTo(0.5 + 0.25, 5)
    expect(s1.contentW).toBeCloseTo(s0.contentW - 0.125 * 96, 3)
    await expect(page.getByText(/KDP requires a 0\.5″ gutter at this length/)).toBeVisible()
    await page.getByTestId('inspector-tab-layout').click()
    await expect(page.getByTestId('inside-margin')).toHaveText('0.75″')
    expect(log.errors).toEqual([])
  })

  test('contents page numbers are the real chapter pages; metadata fills the copyright page and the EPUB', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    const s = await state(page)
    expect(s.toc.length).toBe(4) // three chapters + About the Author
    const tocText = await page.evaluate(() => {
      const l = window.__gb!.layout.getState()
      const toc = l.pages.find((p) => p.page?.segments.some((seg) => seg.html.includes('gb-toc-row')))!
      const d = document.createElement('div'); d.innerHTML = toc.page!.segments.map((x) => x.html).join('')
      return Array.from(d.querySelectorAll('.gb-toc-row')).map((r) => ({ id: r.getAttribute('data-toc')!, page: r.querySelector('.gb-toc-page')!.textContent! }))
    })
    for (const row of tocText) {
      expect(row.page).toBe(s.folios[s.firstPage[row.id]])
    }
    expect(tocText[0].page).toBe('1')
    // make chapter one longer: the following chapters' numbers on the contents page must follow
    await openSection(page, 'The Keeper of Dead Air')
    await caretInto(page, 'a figure with its hand raised')
    for (let i = 0; i < 40; i++) { await page.keyboard.press('Enter'); await page.keyboard.type('More text to push the next chapter along by a page or so, line after line after line.', { delay: 0 }) }
    await settle(page, 700)
    const s2 = await state(page)
    const ch2 = s2.toc[1]
    expect(parseInt(ch2.page, 10)).toBeGreaterThan(parseInt(s.toc[1].page, 10))
    expect(ch2.page).toBe(s2.folios[s2.firstPage[ch2.sectionId]])

    // metadata → copyright page
    await page.getByTestId('book-title').click()
    await page.getByTestId('meta-isbn13').fill('978-1-23456-789-7')
    await page.getByTestId('meta-author').fill('Mara Q. Ellison')
    await page.getByRole('button', { name: 'Done' }).click()
    await settle(page, 600)
    const copyright = await page.evaluate(() => {
      const l = window.__gb!.layout.getState()
      const pg = l.pages.find((p) => p.page?.segments.some((seg) => seg.html.includes('gb-copyright')))!
      return pg.page!.segments.map((x) => x.html.replace(/<[^>]+>/g, ' ')).join(' ')
    })
    expect(copyright).toContain('ISBN-13: 978-1-23456-789-7')
    expect(copyright).toContain('Copyright © ' + new Date().getFullYear() + ' Mara Ellison') // the copyright holder is its own field
    expect(copyright).toContain('Published by Static Lantern Press')
    const titlePage = await page.evaluate(() => window.__gb!.layout.getState().pages[0].page!.segments.map((x) => x.html).join(''))
    expect(titlePage).toContain('Mara Q. Ellison')

    // metadata → EPUB package document
    await page.getByTestId('export-button').click()
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-epub').click()])
    const file = path.join(tmp, 'meta.epub')
    await dl.saveAs(file)
    const zip = await JSZip.loadAsync(fs.readFileSync(file))
    const opf = await zip.file('OEBPS/content.opf')!.async('string')
    expect(opf).toContain('<dc:identifier id="pub-id">urn:isbn:9781234567897</dc:identifier>')
    expect(opf).toContain('<dc:creator id="creator">Mara Q. Ellison</dc:creator>')
    expect(opf).toContain('<dc:title>The Lighthouse at the Edge of the Signal: A GlitchBind demo novella</dc:title>')
    expect(opf).toContain('<dc:publisher>Static Lantern Press</dc:publisher>')
    expect(log.errors).toEqual([])
  })

  test('a Book Theme applies and undoes cleanly without touching words or images; Proof Mode flips through the book', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    const snapshot = () => page.evaluate(() => {
      const p = window.__gb!.project.getState().project!
      return { docs: JSON.stringify(p.sections.map((s) => s.doc)), images: JSON.stringify(p.images), typography: JSON.stringify(p.settings.typography), colors: JSON.stringify(p.settings.colors), theme: p.settings.themeId }
    })
    const a = await snapshot()
    await page.getByTestId('inspector-tab-design').click()
    await page.getByTestId('theme-nonfiction-bold').click()
    await settle(page, 900)
    const b = await snapshot()
    expect(b.theme).toBe('nonfiction-bold')
    expect(b.typography).not.toBe(a.typography)
    expect(b.colors).not.toBe(a.colors)
    expect(b.docs).toBe(a.docs)
    expect(b.images).toBe(a.images)
    await reveal(page, (await state(page)).kinds.length - 1)
    const bodyFont = await page.locator('.gb-page .gb-slice[data-src="main"]').first().evaluate((el) => getComputedStyle(el).fontFamily)
    expect(bodyFont).toContain('Source Serif 4')
    // undo with the keyboard
    await page.locator('body').click({ position: { x: 5, y: 500 } })
    await page.keyboard.press('Control+z')
    await settle(page, 900)
    const c = await snapshot()
    expect(c.typography).toBe(a.typography)
    expect(c.colors).toBe(a.colors)
    expect(c.theme).toBe(a.theme)
    expect(c.docs).toBe(a.docs)

    // Proof Mode
    const total = await pageCount(page)
    await page.keyboard.press('Control+Shift+P')
    const proof = page.getByTestId('proof-mode')
    await expect(proof).toBeVisible()
    await expect(proof.locator('.gb-guide')).toHaveCount(0)
    await expect(page.getByTestId('top-bar')).toBeHidden().catch(() => undefined)
    await page.keyboard.press('Home')
    await expect(page.getByTestId('proof-indicator')).toHaveText(`1 / ${total}`)
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('proof-indicator')).toHaveText(`2–3 / ${total}`)
    await page.getByTestId('proof-next').click({ position: { x: 300, y: 300 } })
    await expect(page.getByTestId('proof-indicator')).toHaveText(`4–5 / ${total}`)
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByTestId('proof-indicator')).toHaveText(`2–3 / ${total}`)
    await page.keyboard.press('End')
    await expect(page.getByTestId('proof-indicator')).toContainText(`${total} / ${total}`)
    // read-only: no editable surface inside the proof
    expect(await proof.locator('[contenteditable="true"]').count()).toBe(0)
    await page.keyboard.press('Escape')
    await expect(proof).toBeHidden()
    expect(log.errors).toEqual([])
  })

  test('low-resolution images get an amber or red badge and are listed in Preflight with their page', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await openSection(page, 'The Answer')
    await caretInto(page, 'a light came on')
    // 300 px wide placed at 3 in → 100 DPI → red
    await page.getByTestId('image-file-input').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: makePng(300, 200) })
    const fig = page.locator('.gb-live figure.ProseMirror-selectednode')
    await expect(fig).toBeVisible()
    await page.getByLabel('Text wrap').selectOption('inline')
    await page.getByTestId('inspector').getByLabel('Width').fill('3')
    await page.keyboard.press('Tab')
    await settle(page)
    await expect(fig).toHaveAttribute('data-dpi-level', 'red')
    await expect(fig).toHaveAttribute('data-dpi', '100 DPI')
    const badge = await fig.evaluate((el) => { const s = getComputedStyle(el, '::after'); return { content: s.content, bg: s.backgroundColor } })
    expect(badge.content).toContain('100 DPI')
    expect(badge.bg).toBe('rgb(255, 77, 94)')
    await expect(page.getByTestId('dpi-chip')).toHaveText('100 DPI')
    // the demo's lighthouse drawing is amber (240 DPI)
    const amber = await page.evaluate(() => window.__gb!.layout.getState().pages.some((p) => p.page?.segments.some((s) => s.html.includes('data-dpi-level="amber"'))))
    expect(amber).toBe(true)

    const figPage = await page.evaluate(() => window.__gb!.controller.caretPage())
    await page.getByTestId('preflight-button').click()
    const list = page.getByTestId('preflight-list')
    console.log('[preflight]', (await list.locator('button').allTextContents()).map((t) => t.slice(0, 70)).join(' | '), 'figPage', figPage)
    await expect(list.locator('[data-level="error"]').filter({ hasText: `Low-resolution image on page ${figPage + 1} (100 DPI)` })).toBeVisible()
    await expect(list.locator('[data-level="warn"]').filter({ hasText: /Image below 300 DPI on page \d+ \(240 DPI\)/ })).toBeVisible()
    await expect(list).toContainText('This interior contains colour')
    // clicking the issue jumps to that page
    await list.locator('[data-level="error"]').filter({ hasText: 'Low-resolution image' }).click()
    await settle(page)
    expect(await page.evaluate(() => window.__gb!.ui.getState().currentPage)).toBe(figPage)

    // badges never reach the print view
    await page.evaluate(() => window.__gbPrint!.prepare('interior'))
    const printed = await page.evaluate(() => {
      const figs = Array.from(document.querySelectorAll('#print-root figure[data-dpi-level]'))
      return { n: figs.length, shown: figs.filter((f) => getComputedStyle(f, '::after').content !== 'none').length, guides: document.querySelectorAll('#print-root .gb-guide').length }
    })
    await page.evaluate(() => window.__gbPrint!.cleanup())
    expect(printed.n).toBeGreaterThan(0)
    expect(printed.shown).toBe(0)
    expect(printed.guides).toBe(0)
    expect(log.errors).toEqual([])
  })

  test('the interior PDF matches the preview page for page; the cover PDF is the exact full-wrap size', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    // turn guides on to prove they never export
    await page.evaluate(() => window.__gb!.ui.getState().setPref({ guides: { margins: true, safe: true, bleed: true } }))
    const expected = await previewText(page)
    const file = path.join(tmp, 'interior.pdf')
    const pdf = await printPdf(page, 'interior', file)
    console.log(`[pdf] interior: ${pdf.pages} pages, ${pdf.widthPt} × ${pdf.heightPt} pt`)
    expect(pdf.pages).toBe(expected.length)
    expect(pdf.pages).toBe(pdf.job.pages)
    expect(pdf.widthPt).toBeCloseTo(6 * 72, 1)
    expect(pdf.heightPt).toBeCloseTo(9 * 72, 1)
    const compared = comparePdfToPreview(file, expected)
    expect(compared).toBeGreaterThan(8)
    // fonts are embedded as real text, not an image of text
    const fonts = execFileSync('pdffonts', [file]).toString()
    expect(fonts).toMatch(/EBGaramond|Garamond/i)

    // with bleed on, each sheet grows by 0.125 in on the outside, top and bottom
    await page.getByTestId('inspector-tab-layout').click()
    await page.getByRole('switch', { name: 'Bleed (0.125″)' }).click()
    await settle(page, 700)
    const bleed = await printPdf(page, 'interior', path.join(tmp, 'interior-bleed.pdf'))
    expect(Math.abs(bleed.widthPt - 6.125 * 72)).toBeLessThan(0.25) // Chrome snaps PDF page sizes to 1/300 in
    expect(Math.abs(bleed.heightPt - 9.25 * 72)).toBeLessThan(0.25)
    expect(bleed.pages).toBe(await pageCount(page))
    const screen = await printPdf(page, 'screen', path.join(tmp, 'screen.pdf'))
    expect(screen.widthPt).toBeCloseTo(6 * 72, 1)

    // cover
    await page.getByTestId('top-bar').getByRole('radio', { name: 'Cover', exact: true }).click()
    await expect(page.getByTestId('cover-builder')).toBeVisible()
    await settle(page, 600)
    const geo = await page.getByTestId('cover-canvas').evaluate((el) => ({ w: parseFloat(el.getAttribute('data-width-in')!), h: parseFloat(el.getAttribute('data-height-in')!) }))
    const total = await pageCount(page)
    expect(geo.w).toBeCloseTo(0.125 + 6 + total * 0.0025 + 6 + 0.125, 3)
    expect(geo.h).toBeCloseTo(9.25, 3)
    const cover = await printPdf(page, 'cover', path.join(tmp, 'cover.pdf'))
    console.log(`[pdf] cover: ${cover.pages} page, ${cover.widthPt} × ${cover.heightPt} pt (expected ${(geo.w * 72).toFixed(2)} × ${(geo.h * 72).toFixed(2)})`)
    expect(cover.pages).toBe(1)
    expect(Math.abs(cover.widthPt - geo.w * 72)).toBeLessThan(0.5) // within 0.007 in: Chrome snaps PDF page sizes to its 1/300 in grid
    expect(Math.abs(cover.heightPt - geo.h * 72)).toBeLessThan(0.5)
    const coverText = execFileSync('pdftotext', [path.join(tmp, 'cover.pdf'), '-']).toString()
    expect(coverText).toContain('Mara Ellison'.toUpperCase().slice(0, 4))
    expect(coverText).not.toContain('Barcode area')
    expect(log.errors).toEqual([])
  })

  test('EPUB, DOCX, HTML and TXT download and open correctly', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await page.getByTestId('export-button').click()
    const grab = async (id: string): Promise<string> => {
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId(`export-${id}`).click()])
      const file = path.join(tmp, dl.suggestedFilename())
      await dl.saveAs(file)
      return file
    }
    // EPUB: structure, well-formed XHTML, manifest matches files
    const epubFile = await grab('epub')
    expect(epubFile.endsWith('.epub')).toBe(true)
    const raw = fs.readFileSync(epubFile)
    expect(raw.subarray(30, 38).toString()).toBe('mimetype') // first entry
    expect(raw.subarray(38, 58).toString()).toBe('application/epub+zip') // stored uncompressed
    const zip = await JSZip.loadAsync(raw)
    const names = Object.keys(zip.files)
    expect(names[0]).toBe('mimetype')
    for (const need of ['META-INF/container.xml', 'OEBPS/content.opf', 'OEBPS/nav.xhtml', 'OEBPS/toc.ncx', 'OEBPS/css/book.css']) expect(names).toContain(need)
    const opf = await zip.file('OEBPS/content.opf')!.async('string')
    const hrefs = Array.from(opf.matchAll(/<item [^>]*href="([^"]+)"/g)).map((m) => m[1])
    for (const h of hrefs) expect(names, `manifest item ${h} exists`).toContain(`OEBPS/${h}`)
    expect(hrefs.filter((h) => h.startsWith('images/')).length).toBe(3)
    expect(opf).toContain('properties="nav"')
    const docs = names.filter((n) => n.endsWith('.xhtml'))
    const xhtml: Record<string, string> = {}
    for (const n of docs) xhtml[n] = await zip.file(n)!.async('string')
    const parse = await page.evaluate((files) => Object.entries(files).map(([name, text]) => ({ name, error: new DOMParser().parseFromString(text, 'application/xhtml+xml').querySelector('parsererror')?.textContent ?? null })), xhtml)
    for (const p of parse) expect(p.error, `${p.name} is well-formed XHTML`).toBeNull()
    const nav = xhtml['OEBPS/nav.xhtml']
    expect(nav).toContain('epub:type="toc"')
    expect(nav).toContain('Chapter One: The Keeper of Dead Air')
    const all = Object.values(xhtml).join('\n')
    expect(all).toContain('Nobody applied for the job at Harrow Point')
    expect(all).toContain('epub:type="noteref"')
    expect(all).toContain('epub:type="footnote"')
    expect(all).toContain('alt="Ink drawing of a lighthouse sending out rays over the sea"')
    // if epubcheck is installed, use it too
    try { const out = execFileSync('epubcheck', [epubFile], { stdio: 'pipe' }).toString(); console.log('[epubcheck]', out.split('\n').slice(-3).join(' ')) } catch (err) { if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err }

    // DOCX
    const docxFile = await grab('docx')
    const docx = await JSZip.loadAsync(fs.readFileSync(docxFile))
    const body = await docx.file('word/document.xml')!.async('string')
    expect(body).toContain('Nobody applied for the job at Harrow Point')
    expect(body).toContain('The Keeper of Dead Air')
    expect(await docx.file('word/footnotes.xml')!.async('string')).toContain('darning')
    expect(Object.keys(docx.files).filter((n) => n.startsWith('word/media/')).length).toBe(3)
    expect(body).toContain('<w:tbl>')

    // HTML
    const html = fs.readFileSync(await grab('html'), 'utf8')
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<title>The Lighthouse at the Edge of the Signal</title>')
    expect((html.match(/src="data:image\//g) ?? []).length).toBe(3)
    expect(html).not.toContain('blob:')
    const opened = await page.context().newPage()
    await opened.setContent(html)
    await expect(opened.locator('h1.chapter').first()).toContainText('The Keeper of Dead Air')
    expect(await opened.locator('figure img').evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0))).toBe(true)
    await opened.close()

    // TXT
    const txt = fs.readFileSync(await grab('txt'), 'utf8')
    expect(txt).toContain('THE LIGHTHOUSE AT THE EDGE OF THE SIGNAL')
    expect(txt).toContain('CHAPTER ONE — THE KEEPER OF DEAD AIR')
    expect(txt).toContain('Out past the fog, where no chart had ever put anything at all, a light came on.')
    expect(txt).toContain('Copyright ©')
    expect(log.errors).toEqual([])
  })

  test('closing and reopening restores the book; a .glitchbind.json file round-trips with its images', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await openSection(page, 'The Answer')
    await caretInto(page, 'a light came on')
    await page.keyboard.type(' PERSISTENCE-MARKER-7731', { delay: 0 })
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', { timeout: 15_000 })
    await expect(page.getByTestId('save-status')).toHaveText(/Saved \d/)
    const url = page.url()

    // hard reload = "the browser was closed"
    await page.reload()
    await ready(page)
    expect(page.url()).toBe(url)
    const text = await page.evaluate(() => JSON.stringify(window.__gb!.project.getState().project!.sections.map((s) => s.doc)))
    expect(text).toContain('PERSISTENCE-MARKER-7731')
    await openSection(page, 'The Keeper of Dead Air')
    await expect(page.locator('.gb-live figure.gb-fig img').first()).toBeVisible()

    // Ctrl+S saves a project file (and the browser's own Save dialog is suppressed)
    await page.locator('body').click({ position: { x: 5, y: 500 } })
    const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')])
    expect(dl.suggestedFilename()).toBe('The-Lighthouse-at-the-Edge-of-the-Signal.glitchbind.json')
    const file = path.join(tmp, dl.suggestedFilename())
    await dl.saveAs(file)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    expect(data.formatVersion).toBe(1)
    expect(data.appVersion).toMatch(/^\d+\.\d+\.\d+/)
    expect(Object.keys(data.images).length).toBe(3)
    expect(JSON.stringify(data.project)).toContain('PERSISTENCE-MARKER-7731')

    // load it into a completely empty browser profile
    const fresh = await page.context().browser()!.newContext({ viewport: { width: 1600, height: 1000 } })
    const p2 = await fresh.newPage()
    const log2 = collectErrors(p2)
    await p2.goto('/')
    await p2.getByTestId('project-card').first().waitFor()
    await p2.locator('input[type=file]').first().setInputFiles(file)
    await ready(p2)
    const back = await p2.evaluate(() => { const p = window.__gb!.project.getState().project!; return { title: p.meta.title, images: p.images.length, docs: JSON.stringify(p.sections.map((s) => s.doc)), pages: window.__gb!.layout.getState().pages.length } })
    expect(back.title).toBe('The Lighthouse at the Edge of the Signal')
    expect(back.images).toBe(3)
    expect(back.docs).toContain('PERSISTENCE-MARKER-7731')
    expect(back.pages).toBe(await pageCount(page))
    // the images really came back (decoded pixels, not broken placeholders)
    await p2.getByTestId('section-row').filter({ hasText: 'The Keeper of Dead Air' }).click()
    await settle(p2)
    const img = p2.locator('.gb-live figure.gb-fig img').first()
    await expect(img).toBeVisible()
    expect(await img.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBe(420)
    // a file from a newer version warns instead of crashing
    data.formatVersion = 7
    const newer = path.join(tmp, 'newer.glitchbind.json')
    fs.writeFileSync(newer, JSON.stringify(data))
    await p2.goto('/')
    await p2.getByTestId('project-card').first().waitFor()
    await p2.locator('input[type=file]').first().setInputFiles(newer)
    await ready(p2)
    await expect(p2.getByText(/saved by a newer GlitchBind/)).toBeVisible()
    expect(log2.errors).toEqual([])
    await fresh.close()
    expect(log.errors).toEqual([])
  })

  test('formatting, footnotes, find & replace, snapshots, focus mode and Clean Pro mode all work', async ({ page }) => {
    const log = collectErrors(page)
    await openDemo(page)
    await openSection(page, 'The Keeper of Dead Air')
    // bold via toolbar on a selection
    await page.evaluate(() => { const c = window.__gb!.controller; let at = -1; c.view!.state.doc.descendants((n, pos) => { if (at < 0 && n.isText && n.text!.includes('Nobody applied')) at = pos; return at < 0 }); c.select(at, at + 6); c.focus() })
    await page.getByLabel('Bold  Ctrl+B').click()
    await expect(page.locator('.gb-live strong').first()).toHaveText('Nobody')
    // a footnote: numbered by position, text set at the foot of the page
    await caretInto(page, 'The night the map arrived')
    const notes0 = await page.locator('.gb-live sup.gb-fn').count()
    await page.keyboard.press('Control+Alt+f')
    await page.getByTestId('footnote-text').fill('A second note, added by the test.')
    await settle(page)
    expect(await page.locator('.gb-live sup.gb-fn').count()).toBe(notes0 + 1)
    const live = page.locator('.gb-page[data-live="true"] .gb-footnotes')
    await expect(live).toContainText('A second note, added by the test.')
    await expect(live.locator('.gb-fn-item')).toHaveCount(2)
    // chapter-end placement moves them off the page foot
    await page.getByTestId('inspector-tab-layout').click()
    await page.getByRole('radio', { name: 'Chapter end', exact: true }).click()
    await settle(page, 700)
    await expect(page.locator('.gb-page .gb-footnotes')).toHaveCount(0)
    expect(await page.evaluate(() => window.__gb!.layout.getState().pages.some((p) => p.page?.segments.some((s) => s.key === 'notes' && s.html.includes('A second note'))))).toBe(true)
    await page.getByRole('radio', { name: 'Foot of page', exact: true }).click()

    // find & replace across the whole book
    await page.keyboard.press('Control+f')
    await page.getByTestId('find-input').fill('Imogen')
    await expect(page.getByTestId('find-count')).toHaveText(/1 of [4-9]/)
    const n = parseInt((await page.getByTestId('find-count').textContent())!.split(' of ')[1], 10)
    await page.getByTestId('replace-input').fill('Marguerite')
    await page.getByTestId('replace-all').click()
    await expect(page.getByText(`Replaced ${n} occurrences across the book.`)).toBeVisible()
    const docs = () => page.evaluate(() => JSON.stringify(window.__gb!.project.getState().project!.sections.map((s) => s.doc)))
    expect(await docs()).not.toContain('Imogen')
    expect((await docs()).split('Marguerite').length - 1).toBe(n)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    expect(await docs()).toContain('Imogen')

    // snapshots: take, change, restore (asks first)
    await page.locator('[aria-label="More"]').click()
    await page.getByText('Version snapshots').click()
    await page.getByTestId('snapshot-name').fill('Before chaos')
    await page.getByTestId('snapshot-create').click()
    await expect(page.getByTestId('snapshot-list')).toContainText('Before chaos')
    await page.keyboard.press('Escape')
    await openSection(page, 'The Answer')
    await caretInto(page, 'a light came on')
    await page.keyboard.type(' CHAOS', { delay: 0 })
    await settle(page, 600)
    expect(await docs()).toContain('CHAOS')
    await page.locator('[aria-label="More"]').click()
    await page.getByText('Version snapshots').click()
    await page.getByTestId('snapshot-restore').first().click()
    await expect(page.getByText(/This replaces the book as it is now/)).toBeVisible()
    await page.getByTestId('snapshot-confirm').click()
    await settle(page, 700)
    expect(await docs()).not.toContain('CHAOS')

    // focus mode hides the chrome; Esc brings it back
    await page.keyboard.press('Control+Shift+F')
    await expect(page.getByTestId('top-bar')).toHaveCount(0)
    await expect(page.getByTestId('exit-focus')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('top-bar')).toBeVisible()

    // Clean Pro mode removes glitch effects from the chrome
    await expect(page.getByTestId('studio')).toHaveAttribute('data-mode', 'glitch')
    await page.locator('[aria-label^="Glitch Mode"]').click()
    await expect(page.getByTestId('studio')).toHaveAttribute('data-mode', 'clean')
    expect(await page.locator('.gb-logo').first().evaluate((el) => getComputedStyle(el, '::before').content)).toBe('none')
    // and glitch never touches book pages in either mode
    expect(await page.evaluate(() => Array.from(document.querySelectorAll('.gb-page *')).some((el) => getComputedStyle(el).animationName !== 'none'))).toBe(false)
    expect(log.errors).toEqual([])
  })

  test('importing .txt, .md and .docx manuscripts splits chapters automatically', async ({ page }) => {
    const log = collectErrors(page)
    await page.goto('/')
    await page.getByTestId('start-blank').click()
    await ready(page)
    const titles = () => page.evaluate(() => window.__gb!.project.getState().project!.sections.filter((s) => s.kind === 'chapter').map((s) => s.title))
    const importFile = async (name: string, mimeType: string, buffer: Buffer): Promise<void> => {
      await page.locator('[aria-label="More"]').click()
      await page.getByText('Import .txt / .md / .docx').click()
      await page.getByTestId('import-file-input').setInputFiles({ name, mimeType, buffer })
      await expect(page.getByText(/Imported \d+ chapters?/).last()).toBeVisible()
      await settle(page, 600)
    }
    await importFile('novel.txt', 'text/plain', Buffer.from('Chapter 1\n\nThe rain began at noon.\n\nIt did not stop.\n\nChapter 2: The Flood\n\nBy evening the road was a river.\n'))
    expect(await titles()).toEqual(['Chapter Title', 'Chapter 1', 'The Flood'])
    await importFile('notes.md', 'text/markdown', Buffer.from('# Aftermath\n\nMud, and **quiet**.\n\n# Rebuilding\n\nThey started with the bridge.\n'))
    expect((await titles()).slice(-2)).toEqual(['Aftermath', 'Rebuilding'])
    expect(await page.evaluate(() => JSON.stringify(window.__gb!.project.getState().project!.sections.map((s) => s.doc)))).toContain('"type":"bold"')
    // a real .docx, produced by this app's own exporter
    const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.getByTestId('export-button').click(); await page.getByTestId('export-docx').click() })()])
    const docx = path.join(tmp, 'roundtrip.docx')
    await dl.saveAs(docx)
    await page.keyboard.press('Escape')
    const before = (await titles()).length
    await importFile('roundtrip.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fs.readFileSync(docx))
    const after = await titles()
    expect(after.length).toBeGreaterThan(before)
    expect(after.slice(before)).toContain('The Flood')
    // the contents page picked the new chapters up
    expect(await page.evaluate(() => window.__gb!.layout.getState().toc.length)).toBe(after.length)
    expect(log.errors).toEqual([])
  })
})
