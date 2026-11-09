import { useEffect, useState } from 'react'
import { FIXTURE, FIXTURE_WORDS } from '@/lib/pagination/fixture'
import { layoutSection, measureHost, type SectionLayout, type SectionPage } from '@/lib/pagination/section'
import { escapeHtml } from '@/lib/pagination/section'
import { defaultSettings } from '@/lib/defaults'
import { applyBookVars, bookVarsCss, pageGeometry, type PageGeometry } from '@/lib/bookCss'
import { ensureFonts } from '@/lib/fonts'
import { openerHtml } from '@/lib/generated'
import { trimById } from '@/lib/kdp'
import type { BookSettings } from '@/types'

interface TrimResult {
  trim: string; contentIn: string; pages: number; perChapter: number[]; lines: number; ms: number
  forced: number; overflow: number; maxDrift: number; geo: PageGeometry; sample: SectionPage[]; charsOnPages: number; charsExpected: number
}
export interface PaginationProof { words: number; results: Omit<TrimResult, 'sample' | 'geo'>[]; pass: boolean }

function fixtureChapters(): { title: string; html: string }[] {
  const chapters: { title: string; html: string }[] = []
  for (const b of FIXTURE) {
    if (b.h) chapters.push({ title: b.h, html: '' })
    else if (b.p && chapters.length) chapters[chapters.length - 1].html += `<p>${escapeHtml(b.p)}</p>`
  }
  return chapters
}

/** Re-render every page slice on its own and compare its height with what the engine planned. */
function drift(layout: SectionLayout, contentW: number): number {
  const host = measureHost(contentW)
  let max = 0
  for (const page of layout.pages) for (const seg of page.segments) {
    const el = document.createElement('div')
    el.className = `gb-content gb-slice ${seg.cls}`
    el.style.counterReset = `gbfn ${seg.fnStart} gbfig ${seg.figStart}`
    el.innerHTML = seg.html
    host.appendChild(el)
    const d = Math.abs(el.getBoundingClientRect().height - (seg.y1 - seg.y0))
    if (d > 1 && (window as unknown as { __dbgDrift?: boolean }).__dbgDrift) console.log('DBG drift', d.toFixed(2), 'page', layout.pages.indexOf(page), seg.key, 'planned', (seg.y1 - seg.y0).toFixed(2), 'START', seg.html.slice(0, 160), 'END', seg.html.slice(-260))
    max = Math.max(max, d)
    el.remove()
  }
  return max
}

async function run(trimId: string): Promise<TrimResult> {
  const t = trimById(trimId)!
  const s: BookSettings = { ...defaultSettings(), trimId, trim: { w: t.w, h: t.h } }
  const geo = pageGeometry(s, 40)
  applyBookVars(bookVarsCss(s, geo, []))
  await ensureFonts([s.typography.bodyFont, s.typography.headingFont, s.typography.chapterFont])
  const perChapter: number[] = []
  const sample: SectionPage[] = []
  let ms = 0, lines = 0, forced = 0, overflow = 0, maxDrift = 0, charsOnPages = 0
  const probe = document.createElement('div')
  fixtureChapters().forEach((c, i) => {
    const layout = layoutSection([
      { key: 'opener', cls: 'gb-src-opener', html: openerHtml({ title: c.title, numbered: true, showTitle: true }, i + 1, s.typography) },
      { key: 'main', cls: 'gb-src-main gb-sec-chapter', html: c.html.replace('<p>', '<p class="gb-dropcap">') },
    ], { contentW: geo.contentW, contentH: geo.contentH, orphans: 2, widows: 2, footnotes: 'page', firstPageRecto: true, vAlign: 'top' })
    perChapter.push(layout.pages.length)
    ms += layout.ms
    lines += layout.lines
    forced += layout.pages.filter((p) => p.forced).length
    overflow += layout.pages.filter((p) => p.overflow).length
    for (const p of layout.pages) for (const seg of p.segments) {
      if (seg.key !== 'main') continue
      probe.innerHTML = seg.html
      probe.querySelectorAll('.gb-hy-rest').forEach((el) => el.remove())
      charsOnPages += (probe.textContent ?? '').replace(/\s+/g, '').length
    }
    maxDrift = Math.max(maxDrift, drift(layout, geo.contentW))
    if (i === 0) sample.push(...layout.pages.slice(0, 4))
  })
  return {
    trim: t.label, contentIn: `${(geo.contentW / 96).toFixed(3)} × ${(geo.contentH / 96).toFixed(3)} in`,
    pages: perChapter.reduce((a, b) => a + b, 0), perChapter, lines, ms: Math.round(ms), forced, overflow,
    maxDrift: Math.round(maxDrift * 100) / 100, geo, sample, charsOnPages,
    charsExpected: FIXTURE.reduce((n, b) => n + (b.p ? b.p.replace(/\s+/g, '').length : 0), 0),
  }
}

declare global { interface Window { __paginationProof?: PaginationProof } }

export default function PaginationTest() {
  const [results, setResults] = useState<TrimResult[] | null>(null)
  useEffect(() => {
    let live = true
    ;(async () => {
      const a = await run('6x9')
      const b = await run('5.5x8.5')
      if (!live) return
      const pass = a.pages !== b.pages && b.pages > a.pages && [a, b].every((r) => r.overflow === 0 && r.maxDrift < 1 && r.charsOnPages === r.charsExpected)
      const proof: PaginationProof = { words: FIXTURE_WORDS, pass, results: [a, b].map(({ sample: _s, geo: _g, ...r }) => r) }
      window.__paginationProof = proof
      console.log('[GlitchBind pagination proof]', JSON.stringify(proof, null, 2))
      setResults([a, b])
    })()
    return () => { live = false }
  }, [])

  return (
    <div className="h-full overflow-auto bg-ink-900 text-fog-100 font-ui">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <a href="/" className="text-xs uppercase tracking-[0.2em] text-fog-400 hover:text-cyan transition-colors">← GlitchBind Studio</a>
        <h1 className="font-display text-3xl mt-4">Pagination proof</h1>
        <p className="text-fog-300 mt-3 max-w-2xl leading-relaxed">
          {FIXTURE_WORDS.toLocaleString()} words of real prose (<em>The Wind in the Willows</em>, public domain) are laid out by the browser,
          measured line by line, and split into real pages at two trim sizes. Counts must differ, every word must land on exactly one page,
          no page may overflow, and each static page slice must match the height the engine planned for it.
        </p>
        {!results && <div className="mt-12 text-cyan font-mono text-sm" data-testid="proof-running">Measuring…</div>}
        {results && (
          <>
            <table className="mt-10 w-full text-sm" data-testid="proof-table">
              <thead>
                <tr className="text-left text-fog-400 text-xs uppercase tracking-wider">
                  {['Trim', 'Text block', 'Pages', 'Per chapter', 'Lines', 'Characters placed', 'Rule breaks', 'Overflow', 'Slice drift', 'Time'].map((h) => <th key={h} className="py-3 pr-6 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.trim} className="border-t border-ink-600">
                    <td className="py-4 pr-6 font-display text-base">{r.trim}</td>
                    <td className="pr-6 text-fog-300">{r.contentIn}</td>
                    <td className="pr-6 font-mono text-2xl text-cyan" data-testid={`pages-${r.trim.split(' ')[0]}x${r.trim.split(' ')[2]}`}>{r.pages}</td>
                    <td className="pr-6 text-fog-300">{r.perChapter.join(' + ')}</td>
                    <td className="pr-6 text-fog-300">{r.lines.toLocaleString()}</td>
                    <td className="pr-6 text-fog-300">{r.charsOnPages.toLocaleString()} / {r.charsExpected.toLocaleString()}</td>
                    <td className="pr-6">{r.forced}</td>
                    <td className="pr-6">{r.overflow}</td>
                    <td className="pr-6">{r.maxDrift}px</td>
                    <td className="pr-6 text-fog-300">{r.ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={`mt-6 inline-block px-4 py-2 rounded font-mono text-sm ${window.__paginationProof?.pass ? 'bg-ok/15 text-ok' : 'bg-danger/15 text-danger'}`} data-testid="proof-verdict">
              {window.__paginationProof?.pass ? 'PASS — page counts differ correctly between trim sizes' : 'FAIL — see console'}
            </div>
            {results.map((r) => (
              <div key={r.trim} className="mt-12">
                <div className="text-xs uppercase tracking-[0.2em] text-fog-400 mb-4">{r.trim} — first pages of chapter one</div>
                <div className="flex gap-6 flex-wrap">
                  {r.sample.map((p, i) => (
                    <div key={i} style={{ width: r.geo.trimW * 0.5, height: r.geo.trimH * 0.5 }}>
                      <div className="gb-book bg-white shadow-page relative origin-top-left" lang="en"
                        style={{ width: r.geo.trimW, height: r.geo.trimH, transform: 'scale(0.5)', ['--gb-sink' as string]: `${r.geo.contentH * 0.16}px` }}>
                        <div className="absolute" style={{ left: i % 2 === 0 ? r.geo.inside : r.geo.outside, top: r.geo.top, width: r.geo.contentW, height: r.geo.contentH }}>
                          {p.segments.map((seg, k) => (
                            <div key={k} className={`gb-content gb-slice ${seg.cls}`} style={{ height: seg.y1 - seg.y0, counterReset: `gbfn ${seg.fnStart}` }} dangerouslySetInnerHTML={{ __html: seg.html }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
