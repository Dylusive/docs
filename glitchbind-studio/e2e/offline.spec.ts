import { expect, test } from '@playwright/test'
import { collectErrors, ready } from './helpers'

const APP = 'http://localhost:4173'

test('production build is an installable PWA that works offline after first load and talks to no other server', async ({ page, context }) => {
  const log = collectErrors(page)
  const foreign: string[] = []
  page.on('request', (r) => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) foreign.push(r.url()) })

  await page.goto(APP)
  await page.getByTestId('project-card').first().waitFor()
  // installable: manifest + service worker
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifest = await (await page.request.get(new URL(manifestHref!, APP).toString())).json()
  expect(manifest.name).toBe('GlitchBind Studio')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThan(0)
  await page.evaluate(() => navigator.serviceWorker.ready)
  // wait for the precache to finish downloading
  await expect.poll(async () => page.evaluate(async () => { let n = 0; for (const k of await caches.keys()) n += (await (await caches.open(k)).keys()).length; return n }), { timeout: 90_000 }).toBeGreaterThan(300)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('projects-screen')).toBeVisible()
  await page.getByTestId('project-card').first().locator('button').first().click()
  await ready(page)
  expect(await page.evaluate(() => window.__gb!.layout.getState().pages.length)).toBeGreaterThan(10)
  // the book fonts come from the cache, not the network
  expect(await page.evaluate(() => document.fonts.check('16px "EB Garamond"') && document.fonts.check('16px "Cormorant Garamond"'))).toBe(true)
  // deep link + reload still works offline
  await page.reload()
  await ready(page)
  await page.goto(`${APP}/pagination-test`)
  await page.waitForFunction(() => window.__paginationProof)
  expect(await page.evaluate(() => window.__paginationProof!.pass)).toBe(true)

  expect(foreign, 'no request ever left this machine (no telemetry, analytics or CDN)').toEqual([])
  expect(log.errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED/.test(e))).toEqual([])
})
