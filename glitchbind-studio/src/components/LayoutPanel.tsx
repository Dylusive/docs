import { useState } from 'react'
import { useProject, mutateSettings } from '@/store/project'
import { useLayout } from '@/store/layout'
import { PRESETS, TRIM_SIZES, KDP_GUTTER_TABLE, gutterBand, spineWidth } from '@/lib/kdp'
import { applyPreset, setCustomTrim, setTrim } from '@/lib/actions'
import { inToMm, mmToIn, round } from '@/lib/units'
import type { BookSettings, FolioPosition, PresetId, RunningHead } from '@/types'
import { Field, NumField, Panel, Seg, Select, Toggle } from './ui'

const HEADS: { value: RunningHead; label: string }[] = [
  { value: 'author', label: 'Author name' }, { value: 'title', label: 'Book title' }, { value: 'chapter', label: 'Chapter title' }, { value: 'none', label: 'Nothing' },
]

export function LayoutPanel() {
  const project = useProject((s) => s.project)
  const pageCount = useLayout((s) => s.pages.length)
  const insideIn = useLayout((s) => s.geo.insideIn)
  const [unit, setUnit] = useState<'in' | 'mm'>('in')
  if (!project) return null
  const s = project.settings
  const preset = PRESETS.find((p) => p.id === s.preset)
  const margin = (k: keyof BookSettings['margins'], v: number): void => mutateSettings((x) => ({ ...x, preset: x.preset, margins: { ...x.margins, [k]: v } }), `${k} margin`)
  const headers = (patch: Partial<BookSettings['headers']>): void => mutateSettings((x) => ({ ...x, headers: { ...x.headers, ...patch } }), 'running heads')
  const band = gutterBand(pageCount)
  const show = (inches: number): number => (unit === 'in' ? round(inches, 3) : round(inToMm(inches), 1))
  const read = (v: number): number => (unit === 'in' ? v : mmToIn(v))
  return (
    <>
      <Panel title="Publishing preset">
        <Select label="Publishing preset" className="w-full" value={s.preset} onChange={(v) => { if (v !== 'custom') applyPreset(v as PresetId) }}
          options={[...PRESETS.map((p) => ({ value: p.id as string, label: p.name })), ...(s.preset === 'custom' ? [{ value: 'custom', label: 'Custom' }] : [])]} />
        {preset && <p className="text-[11px] text-fog-400 leading-snug">{preset.blurb}</p>}
      </Panel>

      <Panel title="Trim size">
        <Select label="Trim size" className="w-full" value={s.trimId} onChange={(v) => (v === 'custom' ? setCustomTrim(s.trim.w, s.trim.h) : setTrim(v))}
          options={[...TRIM_SIZES.map((t) => ({ value: t.id, label: t.label })), { value: 'custom', label: 'Custom…' }]} />
        {s.trimId === 'custom' && (
          <>
            <Field label="Units" row><Seg value={unit} onChange={setUnit} options={[{ value: 'in', label: 'Inches' }, { value: 'mm', label: 'Millimetres' }]} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Width"><NumField width={128} value={show(s.trim.w)} min={unit === 'in' ? 4 : 101.6} max={unit === 'in' ? 8.5 : 216} step={unit === 'in' ? 0.01 : 1} unit={unit} onChange={(n) => setCustomTrim(read(n), s.trim.h)} /></Field>
              <Field label="Height"><NumField width={128} value={show(s.trim.h)} min={unit === 'in' ? 6 : 152.4} max={unit === 'in' ? 11.69 : 297} step={unit === 'in' ? 0.01 : 1} unit={unit} onChange={(n) => setCustomTrim(s.trim.w, read(n))} /></Field>
            </div>
          </>
        )}
        <Field label="Paper" row hint="Decides spine width for the cover.">
          <Seg value={s.paper} onChange={(v) => mutateSettings((x) => ({ ...x, paper: v }), 'paper type')} options={[{ value: 'white', label: 'White' }, { value: 'cream', label: 'Cream' }]} />
        </Field>
        <div className="text-[11px] text-fog-400">Spine at {pageCount} pages: {spineWidth(pageCount, s.paper).toFixed(3)}″</div>
      </Panel>

      <Panel title="Margins">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Top"><NumField width={128} value={s.margins.top} min={0.25} max={2} step={0.025} unit="in" onChange={(n) => margin('top', n)} /></Field>
          <Field label="Bottom"><NumField width={128} value={s.margins.bottom} min={0.25} max={2} step={0.025} unit="in" onChange={(n) => margin('bottom', n)} /></Field>
          <Field label="Outside"><NumField width={128} value={s.margins.outside} min={0.25} max={2} step={0.025} unit="in" onChange={(n) => margin('outside', n)} /></Field>
          <Field label={s.autoGutter ? 'Inside (auto)' : 'Inside (gutter)'}>
            <NumField width={128} value={round(insideIn, 3)} min={0.375} max={2} step={0.025} unit="in" disabled={s.autoGutter} onChange={(n) => margin('inside', n)} />
          </Field>
        </div>
        <Toggle label="Automatic KDP gutter" hint="The inside margin follows Amazon's page-count table and updates itself when the book grows."
          checked={s.autoGutter} onChange={(v) => mutateSettings((x) => ({ ...x, autoGutter: v, margins: { ...x.margins, inside: round(insideIn, 3) } }), 'automatic gutter')} />
        {s.autoGutter && (
          <>
            <Field label="Extra comfort beyond KDP's minimum"><NumField width={128} value={s.gutterComfort} min={0} max={0.75} step={0.025} unit="in" onChange={(n) => mutateSettings((x) => ({ ...x, gutterComfort: n }), 'gutter comfort')} /></Field>
            <div className="rounded-md bg-ink-900 border border-ink-600 overflow-hidden" data-testid="gutter-table">
              {KDP_GUTTER_TABLE.map((b) => (
                <div key={b.min} className={`flex justify-between px-3 h-7 items-center text-[11px] tabular-nums ${b === band ? 'bg-cyan/10 text-cyan' : 'text-fog-400'}`}>
                  <span>{b.min}–{b.max} pages</span><span>{b.inside}″ minimum</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-fog-400 leading-snug">Now: {pageCount} pages → {band.inside}″ + {s.gutterComfort}″ = <span className="text-fog-100" data-testid="inside-margin">{round(insideIn, 3)}″</span>. Outside, top and bottom must stay at 0.25″ or more (0.375″ recommended).</p>
          </>
        )}
        <Toggle label="Bleed (0.125″)" hint="Needed when images run to the paper's edge. The PDF grows by the bleed on the three outer sides." checked={s.bleed} onChange={(v) => mutateSettings((x) => ({ ...x, bleed: v }), 'bleed')} />
        <Toggle label="Chapters start on a right-hand page" hint="Adds a blank left page when needed." checked={s.chaptersStartRight} onChange={(v) => mutateSettings((x) => ({ ...x, chaptersStartRight: v }), 'chapter start side')} />
      </Panel>

      <Panel title="Headers & page numbers">
        <Toggle label="Running heads" hint="Hidden on the title page, front-matter display pages and every chapter opening." checked={s.headers.enabled} onChange={(v) => headers({ enabled: v })} />
        {s.headers.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Left pages"><Select label="Left page header" className="w-full" value={s.headers.left} onChange={(v) => headers({ left: v })} options={HEADS} /></Field>
            <Field label="Right pages"><Select label="Right page header" className="w-full" value={s.headers.right} onChange={(v) => headers({ right: v })} options={HEADS} /></Field>
          </div>
        )}
        <Field label="Page numbers">
          <Select label="Page number position" className="w-full" value={s.headers.folio} onChange={(v) => headers({ folio: v as FolioPosition })}
            options={[{ value: 'bottom-center', label: 'Bottom centre' }, { value: 'bottom-outer', label: 'Bottom outer corner' }, { value: 'top-outer', label: 'Top outer corner' }, { value: 'none', label: 'No page numbers' }]} />
        </Field>
        <p className="text-[11px] text-fog-400 leading-snug">Front matter is numbered in roman numerals (i, ii, iii). Arabic numbering starts at 1 on the first chapter.</p>
      </Panel>

      <Panel title="Notes & figures">
        <Field label="Footnotes appear" row>
          <Seg value={s.footnotes} onChange={(v) => mutateSettings((x) => ({ ...x, footnotes: v }), 'footnote placement')} options={[{ value: 'page', label: 'Foot of page' }, { value: 'chapter', label: 'Chapter end' }]} />
        </Field>
        <Toggle label="Number every captioned figure" hint="“Figure 1.” before each caption, restarting per chapter." checked={s.figureNumbers} onChange={(v) => mutateSettings((x) => ({ ...x, figureNumbers: v }), 'figure numbers')} />
        <p className="text-[11px] text-fog-400 leading-snug">Widow and orphan control is always on: a paragraph never leaves fewer than two lines at the top or bottom of a page, and headings stay with the text that follows.</p>
      </Panel>

      <Panel title="Print colour">
        <Toggle label="Print the page colour" hint="Off (recommended): page colour is an on-screen preview and the PDF has white pages. On: every page prints a full-colour background, which needs bleed and costs more."
          checked={s.printPageColor} onChange={(v) => mutateSettings((x) => ({ ...x, printPageColor: v }), 'print page colour')} />
      </Panel>
    </>
  )
}
