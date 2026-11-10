import { expect, type Page } from '@playwright/test'
import zlib from 'node:zlib'

/** A real PNG of the given size (gradient), built without any image library. */
export function makePng(width: number, height: number, colour = true): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0
    for (let x = 0; x < width; x++) {
      const o = y * (width * 3 + 1) + 1 + x * 3
      const v = Math.round((x / width) * 200) + 30
      raw[o] = v
      raw[o + 1] = colour ? Math.round((y / height) * 200) + 30 : v
      raw[o + 2] = colour ? 160 : v
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (buf: Buffer): number => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

export interface Collected { errors: string[] }
export function collectErrors(page: Page): Collected {
  const c: Collected = { errors: [] }
  page.on('console', (m) => { if (m.type() === 'error') c.errors.push(m.text()) })
  page.on('pageerror', (e) => c.errors.push(String(e)))
  return c
}

export async function openDemo(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByTestId('project-card').first().waitFor()
  await page.getByTestId('project-card').first().locator('button').first().click()
  await ready(page)
}
export async function ready(page: Page): Promise<void> {
  await page.getByTestId('studio').waitFor()
  await page.waitForFunction(() => window.__gb?.layout.getState().ready && (window.__gb?.layout.getState().pages.length ?? 0) > 0)
  await page.waitForTimeout(350)
}
export const pageCount = (page: Page): Promise<number> => page.evaluate(() => window.__gb!.layout.getState().pages.length)
export async function settle(page: Page, ms = 450): Promise<void> { await page.waitForTimeout(ms) }

/** Click a section in the structure tree by its visible title. */
export async function openSection(page: Page, title: string): Promise<void> {
  if (!(await page.getByTestId('structure-tree').count())) await page.getByRole('button', { name: 'Structure', exact: true }).click()
  await page.getByTestId('section-row').filter({ hasText: title }).first().click()
  await settle(page)
}

/** Put the caret at the end of the first paragraph that contains `text` (in the live editor). */
export async function caretInto(page: Page, text: string): Promise<void> {
  const ok = await page.evaluate((needle) => {
    const c = window.__gb!.controller
    const view = c.view
    if (!view) return false
    let found = -1
    view.state.doc.descendants((node, pos) => { if (found < 0 && node.isTextblock && node.textContent.includes(needle)) found = pos + node.nodeSize - 1; return found < 0 })
    if (found < 0) return false
    c.select(found)
    c.focus()
    return true
  }, text)
  expect(ok).toBe(true)
  await settle(page, 250)
}

export const lettersOnly = (s: string): string => s.normalize('NFKD').replace(/[^\p{L}]/gu, '').toLowerCase()
export function histogram(s: string): Record<string, number> {
  const h: Record<string, number> = {}
  for (const ch of lettersOnly(s)) h[ch] = (h[ch] ?? 0) + 1
  return h
}

/** Scroll a physical page (0-based) into view and wait until it is mounted. */
export async function reveal(page: Page, index: number): Promise<void> {
  await page.evaluate((i) => window.__gb!.reveal(i), index)
  await page.locator(`.gb-page[data-page-index="${index}"]`).waitFor()
  await page.waitForTimeout(150)
}
