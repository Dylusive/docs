import { expect, test } from '@playwright/test'
import { collectErrors, makePng, openDemo, pageCount, settle } from './helpers'

test('smoke: app loads, demo book opens, an image can be added, export dialog opens', async ({ page }) => {
  const log = collectErrors(page)
  await page.goto('/')
  await expect(page.getByTestId('projects-screen')).toBeVisible()
  await expect(page.getByTestId('project-card')).toHaveCount(1) // the demo book is preloaded on first launch
  await expect(page.getByTestId('start-blank')).toBeVisible()

  await openDemo(page)
  await expect(page.getByTestId('book-title')).toContainText('The Lighthouse at the Edge of the Signal')
  expect(await pageCount(page)).toBeGreaterThan(10)
  await expect(page.locator('.gb-page').first()).toBeVisible()

  // add an image through the Insert menu's file picker
  await page.getByTestId('section-row').filter({ hasText: 'The Keeper of Dead Air' }).click()
  await settle(page)
  const before = await page.locator('.gb-live figure.gb-fig').count()
  await page.getByTestId('image-file-input').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: makePng(900, 600) })
  await expect(page.locator('.gb-live figure.gb-fig')).toHaveCount(before + 1)
  await expect(page.getByTestId('figure-overlay')).toBeVisible()
  await expect(page.getByTestId('inspector')).toContainText('photo.png')

  await page.getByTestId('export-button').click()
  await expect(page.getByRole('dialog', { name: 'Export' })).toBeVisible()
  await expect(page.getByTestId('export-list')).toContainText('KDP-Ready Print PDF (RGB)')
  await expect(page.getByTestId('pdf-honesty')).toContainText('cannot produce PDF/X-1a or CMYK')
  expect(log.errors).toEqual([])
})
