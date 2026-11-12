// Captures the five review screenshots. Usage: node scripts/screenshots.mjs <before|after> [baseUrl]
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const label = process.argv[2] ?? 'after'
const base = process.argv[3] ?? 'http://localhost:5173'
const out = path.resolve(import.meta.dirname, '../screenshots')
fs.mkdirSync(out, { recursive: true })
const shot = (page, name) => page.screenshot({ path: path.join(out, `${label}-${name}.png`) })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
await page.goto(base)
await page.getByTestId('project-card').first().waitFor()
// a second book on the shelf so the grid is visible
await page.getByTestId('start-blank').click()
await page.getByTestId('studio').waitFor()
await page.waitForFunction(() => window.__gb?.layout.getState().ready)
await page.locator('[aria-label="Back to your books"]').click()
await page.getByTestId('project-card').nth(1).waitFor()
await page.waitForTimeout(500)
await shot(page, '1-projects')

await page.getByTestId('project-card').filter({ hasText: 'Lighthouse' }).locator('button').first().click()
await page.waitForFunction(() => window.__gb?.layout.getState().ready && window.__gb.layout.getState().pages.length > 5)
await page.waitForTimeout(900)
await shot(page, '2-editor-page1')

await page.locator('[data-tip="Two-page spread"]').click()
await page.mouse.move(800, 600)
await page.evaluate(() => window.__gb.reveal(7))
await page.waitForTimeout(700)
await shot(page, '3-editor-spread')

await page.getByTestId('top-bar').getByRole('radio', { name: 'Cover', exact: true }).click()
await page.getByTestId('cover-builder').waitFor()
await page.waitForTimeout(900)
await shot(page, '4-cover-builder')

await page.getByTestId('top-bar').getByRole('radio', { name: 'Interior', exact: true }).click()
await page.getByTestId('export-button').click()
await page.getByTestId('export-list').waitFor()
await page.waitForTimeout(400)
await shot(page, '5-export-dialog')
await browser.close()
console.log('saved', label, 'screenshots to', out)
