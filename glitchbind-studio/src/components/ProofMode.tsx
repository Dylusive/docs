import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, File as FileIcon, X } from 'lucide-react'
import { useLayout } from '@/store/layout'
import { useProject } from '@/store/project'
import { useUI } from '@/store/ui'
import { BookPage } from './BookPage'

/**
 * Proof Mode: a read-only flip-through of the finished book exactly as a reader will see it.
 * No guides, no badges, no editing chrome. Arrow keys, space, or a click on either half turns the page.
 */
export function ProofMode() {
  const pages = useLayout((s) => s.pages)
  const geoFull = useLayout((s) => s.geo)
  const settings = useProject((s) => s.project?.settings)
  const start = useUI((s) => s.currentPage)
  const [spread, setSpread] = useState(() => window.innerWidth > 900)
  const [at, setAt] = useState(start)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const geo = useMemo(() => ({ ...geoFull, bleed: 0 }), [geoFull])
  const close = useCallback(() => useUI.setState({ proof: false }), [])

  // spreads: [0], [1,2], [3,4] …  (page index 0 is a right-hand page)
  const group = useMemo(() => {
    if (!spread) return [at]
    if (at === 0) return [0]
    const left = at % 2 === 1 ? at : at - 1
    return [left, left + 1].filter((i) => i < pages.length)
  }, [at, spread, pages.length])
  const next = useCallback(() => setAt((a) => Math.min(pages.length - 1, spread ? (a === 0 ? 1 : (a % 2 === 1 ? a : a - 1) + 2) : a + 1)), [pages.length, spread])
  const prev = useCallback(() => setAt((a) => Math.max(0, spread ? (a <= 2 ? 0 : (a % 2 === 1 ? a : a - 1) - 2) : a - 1)), [spread])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.stopPropagation(); close() }
      else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev() }
      else if (e.key === 'Home') setAt(0)
      else if (e.key === 'End') setAt(pages.length - 1)
    }
    const onResize = (): void => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize) }
  }, [close, next, prev, pages.length])

  if (!settings || !pages.length) return null
  const cols = spread ? 2 : 1
  const scale = Math.min((size.w - 120) / (geo.trimW * cols), (size.h - 120) / geo.trimH)
  const mirrored = settings.preset !== 'screen'
  const single = spread && group.length === 1
  const label = group.map((i) => i + 1).join('–')
  const atEnd = group[group.length - 1] >= pages.length - 1
  return (
    <div className="fixed inset-0 z-[60] gb-fade-in select-none" style={{ background: '#050508' }} data-testid="proof-mode" role="dialog" aria-label="Proof Mode">
      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ width: geo.trimW * cols * scale, height: geo.trimH * scale }} className="relative">
          <div key={group[0]} className="gb-book gb-proof absolute left-0 top-0 origin-top-left gb-fade-in" lang="en" style={{ width: geo.trimW * cols, height: geo.trimH, transform: `scale(${scale})` }}>
            {group.map((i) => (
              <BookPage key={i} data={pages[i]} geo={geo} mode="clean" paper={settings.colors.page} folio={settings.headers.folio} mirrored={mirrored}
                style={{ left: spread ? (pages[i].side === 'right' ? geo.trimW : 0) : 0, top: 0, boxShadow: '0 20px 60px rgba(0,0,0,.6)' }} />
            ))}
            {spread && !single && <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: geo.trimW - 18, width: 36, background: 'linear-gradient(90deg, transparent, rgba(0,0,0,.10) 48%, rgba(0,0,0,.16) 50%, rgba(0,0,0,.10) 52%, transparent)' }} />}
          </div>
        </div>
      </div>
      <button type="button" aria-label="Previous page" data-testid="proof-prev" className="absolute left-0 top-0 bottom-0 w-1/2 cursor-w-resize group" onClick={prev} disabled={at === 0}>
        <ChevronLeft size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-fog-400 opacity-0 group-hover:opacity-100 group-disabled:!opacity-0 transition-opacity duration-150" />
      </button>
      <button type="button" aria-label="Next page" data-testid="proof-next" className="absolute right-0 top-0 bottom-0 w-1/2 cursor-e-resize group" onClick={next} disabled={atEnd}>
        <ChevronRight size={22} className="absolute right-5 top-1/2 -translate-y-1/2 text-fog-400 opacity-0 group-hover:opacity-100 group-disabled:!opacity-0 transition-opacity duration-150" />
      </button>
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-40 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        <button type="button" className="gb-icon-btn" aria-label={spread ? 'Show single pages' : 'Show spreads'} onClick={() => setSpread(!spread)}>{spread ? <FileIcon size={15} /> : <BookOpen size={15} />}</button>
        <button type="button" className="gb-icon-btn" aria-label="Exit Proof Mode" data-testid="proof-exit" onClick={close}><X size={16} /></button>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-fog-400 tabular-nums tracking-wide" data-testid="proof-indicator">{label} / {pages.length}</div>
    </div>
  )
}
