/**
 * PDF export. The browser's own print engine writes the PDF from the print view, so text stays
 * real vector text in the embedded fonts (never a screenshot). @page is set to the exact sheet
 * size with zero margin; the author turns off "Headers and footers" in the print dialog.
 */
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { useProject } from '@/store/project'
import { useLayout } from '@/store/layout'
import { useUI } from '@/store/ui'
import { controller } from '@/lib/editor/controller'
import { runLayout } from '@/lib/layoutManager'
import { PrintView } from '@/components/PrintView'
import { CoverCanvas } from '@/components/CoverBuilder'
import { coverGeometry } from '@/lib/kdp'
import { round } from '@/lib/units'

export type PrintKind = 'interior' | 'screen' | 'cover'
export interface PrintJob { kind: PrintKind; widthIn: number; heightIn: number; pages: number }

let root: Root | null = null
let pageStyle: HTMLStyleElement | null = null

export function cleanupPrint(): void {
  root?.unmount()
  root = null
  pageStyle?.remove()
  pageStyle = null
}

/** Sheet size of each export, in inches. */
export function printSize(kind: PrintKind): { widthIn: number; heightIn: number } {
  const p = useProject.getState().project
  const { geo, pages } = useLayout.getState()
  if (!p) return { widthIn: 0, heightIn: 0 }
  if (kind === 'cover') {
    const c = coverGeometry(p.settings.trim.w, p.settings.trim.h, pages.length, p.settings.paper)
    return { widthIn: c.width, heightIn: c.height }
  }
  const b = kind === 'interior' ? geo.bleed / 96 : 0
  return { widthIn: round(p.settings.trim.w + b, 4), heightIn: round(p.settings.trim.h + b * 2, 4) }
}

/** Mount the print view and wait until fonts and images are ready. */
export async function preparePrint(kind: PrintKind): Promise<PrintJob | null> {
  controller.flush()
  runLayout()
  const p = useProject.getState().project
  const { pages, geo } = useLayout.getState()
  const host = document.getElementById('print-root')
  if (!p || !host) return null
  cleanupPrint()
  const { widthIn, heightIn } = printSize(kind)
  pageStyle = document.createElement('style')
  pageStyle.textContent = `@page { size: ${widthIn}in ${heightIn}in; margin: 0; } @media print { html, body { margin: 0 !important; padding: 0 !important; width: ${widthIn}in; } }`
  document.head.appendChild(pageStyle)
  root = createRoot(host)
  flushSync(() => {
    root?.render(kind === 'cover'
      ? createElement(CoverCanvas, { project: p, pageCount: pages.length, mode: 'print' })
      : createElement(PrintView, { pages, geo, settings: p.settings, withBleed: kind === 'interior', screen: kind === 'screen' }))
  })
  await document.fonts.ready
  const imgs = Array.from(host.querySelectorAll('img'))
  await Promise.all(imgs.map((img) => (img.complete ? img.decode().catch(() => undefined) : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res() }))))
  return { kind, widthIn, heightIn, pages: kind === 'cover' ? 1 : pages.length }
}

export async function printBook(kind: PrintKind): Promise<void> {
  const job = await preparePrint(kind)
  if (!job) return
  const done = (): void => { window.removeEventListener('afterprint', done); cleanupPrint() }
  window.addEventListener('afterprint', done)
  const p = useProject.getState().project
  const prevTitle = document.title
  // the browser suggests the document title as the PDF file name
  document.title = `${p?.meta.title ?? 'book'} — ${kind === 'cover' ? 'COVER' : kind === 'screen' ? 'screen' : 'INTERIOR'} ${job.widthIn}x${job.heightIn}in`
  useUI.getState().toast(kind === 'cover' ? 'Cover print view ready — choose “Save as PDF”.' : `Print view ready: ${job.pages} pages at ${job.widthIn} × ${job.heightIn} in. Choose “Save as PDF”, margins “None”, and untick “Headers and footers”.`, 'info')
  await new Promise((r) => setTimeout(r, 60))
  window.print()
  document.title = prevTitle
  // browsers without afterprint (or that fire it early) still get cleaned up
  setTimeout(() => { if (root) done() }, 120_000)
}

declare global {
  interface Window {
    __gbPrint?: { prepare: (kind: PrintKind) => Promise<PrintJob | null>; cleanup: () => void }
  }
}
if (typeof window !== 'undefined') window.__gbPrint = { prepare: preparePrint, cleanup: cleanupPrint }
