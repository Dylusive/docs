import type { BookPageData } from '@/store/layout'
import type { PageGeometry } from '@/lib/bookCss'
import type { BookSettings } from '@/types'
import { BookPage } from './BookPage'

/**
 * The print view: every page of the book, each on its own sheet, built from the SAME page data and the
 * SAME <BookPage> component the editor shows. No guides, no badges, no chrome.
 * With bleed, each sheet is trim + 0.125″ on the top, bottom and outside edge (none at the spine).
 */
export function PrintView({ pages, geo, settings, withBleed, screen }: { pages: BookPageData[]; geo: PageGeometry; settings: BookSettings; withBleed: boolean; screen: boolean }) {
  const b = withBleed ? geo.bleed : 0
  const g: PageGeometry = withBleed ? geo : { ...geo, bleed: 0 }
  const mirrored = settings.preset !== 'screen'
  const paper = screen || settings.printPageColor ? settings.colors.page : '#FFFFFF'
  const sheetW = (geo.trimW + b) / 96
  const sheetH = (geo.trimH + b * 2) / 96
  return (
    <div className="gb-book gb-print" lang="en">
      {pages.map((p) => (
        <div key={p.index} className="gb-sheet" style={{ width: `${sheetW}in`, height: `${sheetH}in` }}>
          <BookPage data={p} geo={g} mode="clean" paper={paper} folio={settings.headers.folio} mirrored={mirrored}
            style={{ left: p.side === 'left' && mirrored ? b : 0, top: b }} />
        </div>
      ))}
    </div>
  )
}
