import { memo, type CSSProperties } from 'react'
import type { BookPageData } from '@/store/layout'
import type { PageGeometry } from '@/lib/bookCss'
import type { FolioPosition } from '@/types'

export interface PageGuides { margins: boolean; safe: boolean; bleed: boolean }
interface Props {
  data: BookPageData
  geo: PageGeometry
  /** 'screen' = editor canvas (guides, badges, click targets). 'clean' = Proof Mode and print: the page and nothing else. */
  mode: 'screen' | 'clean'
  paper: string
  folio: FolioPosition
  mirrored: boolean
  guides?: PageGuides
  live?: boolean
  style?: CSSProperties
}
const SAFE = 24 // 0.25in
const BLEED_GUIDE = 12 // 0.125in

/**
 * THE page. The editor canvas, Proof Mode and the print view all render this exact component
 * from the same page data, which is what makes the preview and the PDF match.
 */
export const BookPage = memo(function BookPage({ data, geo, mode, paper, folio, mirrored, guides, live, style }: Props) {
  const left = data.side === 'left'
  const mLeft = mirrored ? (left ? geo.outside : geo.inside) : (geo.inside + geo.outside) / 2
  const page = data.page
  const b = geo.bleed
  const paperStyle: CSSProperties = { top: -b, bottom: -b, left: left || !mirrored ? -b : 0, right: !left || !mirrored ? -b : 0, ['--gb-paper-bg' as string]: paper }
  const plate = page && (data.kind === 'float' || data.kind === 'spread-left' || data.kind === 'spread-right') ? page.figureHtml : undefined
  const half = data.kind === 'spread-left' ? 'left' : data.kind === 'spread-right' ? 'right' : 'full'
  const gutter = plate ? parseFloat(/data-gutter="([\d.]+)"/.exec(plate)?.[1] ?? '0') * 96 : 0
  const outerAlign: CSSProperties = left ? { left: mLeft } : { right: geo.trimW - mLeft - geo.contentW }
  const folioStyle: CSSProperties =
    folio === 'bottom-center' ? { left: mLeft, width: geo.contentW, textAlign: 'center', bottom: geo.bottom * 0.46 - 5 }
    : folio === 'bottom-outer' ? { ...outerAlign, bottom: geo.bottom * 0.46 - 5 }
    : { ...outerAlign, top: geo.top * 0.5 - 5 }
  return (
    <div className="gb-page" data-page-index={data.index} data-side={data.side} data-kind={data.kind} data-live={live ? 'true' : undefined}
      data-clickable={mode === 'screen' && data.editable ? 'true' : undefined} style={{ width: geo.trimW, height: geo.trimH, ...style }}>
      <div className="gb-paper" style={paperStyle}>
        {plate !== undefined && <div className="gb-plate gb-content" data-half={half} style={{ ['--gc' as string]: `${gutter}px` }} dangerouslySetInnerHTML={{ __html: plate }} />}
      </div>
      {page && !plate && (
        <div className="gb-page-content" style={{ left: mLeft, top: geo.top, width: geo.contentW, height: geo.contentH }}>
          {page.behind.length > 0 && <div className="gb-floats gb-content" dangerouslySetInnerHTML={{ __html: page.behind.join('') }} />}
          <div className="gb-flow" style={page.offsetY ? { paddingTop: page.offsetY } : undefined}>
            {page.segments.map((seg, i) => (
              <div key={seg.key + i} className={`gb-content gb-slice ${seg.cls}`} data-src={seg.key}
                style={{ height: seg.y1 - seg.y0, counterReset: `gbfn ${seg.fnStart} gbfig ${seg.figStart}`, visibility: live && seg.key === 'main' ? 'hidden' : undefined }}
                dangerouslySetInnerHTML={{ __html: seg.html }} />
            ))}
          </div>
          {page.notes.length > 0 && (
            <div className="gb-footnotes">
              {page.notes.map((n) => <div key={n.id} className="gb-fn-item" data-note-id={n.id}><span className="gb-fn-n">{n.n}</span>{n.text || ' '}</div>)}
            </div>
          )}
        </div>
      )}
      {data.showHeader && data.header && <div className="gb-header" style={{ left: mLeft, width: geo.contentW, top: geo.top * 0.5 - 5 }}>{data.header}</div>}
      {data.showFolio && <div className="gb-folio" style={folioStyle}>{data.folio}</div>}
      {mode === 'screen' && guides && (
        <>
          {guides.margins && <div className="gb-guide gb-guide-margin" style={{ left: mLeft, top: geo.top, width: geo.contentW, height: geo.contentH }} />}
          {guides.safe && <div className="gb-guide gb-guide-safe" style={{ inset: SAFE }} />}
          {guides.bleed && <div className="gb-guide gb-guide-bleed" style={{ top: -BLEED_GUIDE, bottom: -BLEED_GUIDE, left: left ? -BLEED_GUIDE : 0, right: left ? 0 : -BLEED_GUIDE }} />}
          {page?.overflow && <div className="gb-overflow-flag" title="Content is taller than the page" />}
        </>
      )}
    </div>
  )
})
