import { useRef, useState } from 'react'
import { Check, Plus, Trash2, Upload } from 'lucide-react'
import type { CustomFont, Palette } from '@/types'
import { useProject, mutateSettings, mutateTypography } from '@/store/project'
import { toast } from '@/store/ui'
import { PALETTES, THEMES, paletteById } from '@/lib/themes'
import { applyPaletteById, applyThemeById } from '@/lib/actions'
import { fontStack, registerCustomFonts } from '@/lib/fonts'
import { delFont, getFont, putFont } from '@/lib/storage'
import { uid } from '@/lib/units'
import { ColorField, Field, IconBtn, NumField, Panel, Seg, Select, Slider, Toggle } from './ui'
import { FontPicker } from './FontPicker'

const ORNAMENTS = ['✦', '❧', '⁂', '❦', '◆']
const SCENE_BREAKS = ['* * *', '✦ ✦ ✦', '⁂', '———']

function Glyphs({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  const custom = value !== '' && !options.includes(value)
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      <button type="button" role="radio" aria-checked={value === ''} onClick={() => onChange('')} className={`h-8 px-2.5 rounded-md border text-[11.5px] transition-colors duration-150 ${value === '' ? 'border-cyan text-cyan' : 'border-ink-600 text-fog-300 hover:border-ink-400'}`}>None</button>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={`h-8 min-w-8 px-2 rounded-md border text-[14px] transition-colors duration-150 ${value === o ? 'border-cyan text-cyan' : 'border-ink-600 text-fog-200 hover:border-ink-400'}`}>{o}</button>
      ))}
      <input className={`gb-input w-[72px] text-center ${custom ? 'border-cyan' : ''}`} aria-label={`${label} — custom`} placeholder="Custom" maxLength={12} value={custom ? value : ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function DesignPanel() {
  const project = useProject((s) => s.project)
  const fontFile = useRef<HTMLInputElement>(null)
  const [paletteName, setPaletteName] = useState('')
  if (!project) return null
  const s = project.settings
  const t = s.typography
  const setColor = (k: keyof typeof s.colors, v: string): void => mutateSettings((x) => ({ ...x, paletteId: 'custom', colors: { ...x.colors, [k]: v } }), `${k} colour`)

  const uploadFont = async (file: File | undefined): Promise<void> => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['ttf', 'otf', 'woff2'].includes(ext)) { toast('Custom fonts must be .ttf, .otf or .woff2 files.', 'warn'); return }
    const family = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+(regular|book)$/i, '').trim() || 'Custom Font'
    const font: CustomFont = { id: uid('font_'), family, fileName: file.name, format: ext, licenceConfirmed: false }
    try {
      const face = new FontFace(family, await file.arrayBuffer())
      await face.load()
    } catch { toast(`“${file.name}” could not be read as a font.`, 'error'); return }
    await putFont(font.id, file)
    const next = [...project.customFonts, font]
    await registerCustomFonts(next, getFont)
    useProject.getState().mutate((p) => ({ ...p, customFonts: next }), { undoable: false })
    toast(`“${family}” added. You are responsible for this font’s print and commercial licence.`, 'warn')
  }
  const removeFont = async (f: CustomFont): Promise<void> => {
    const inUse = [t.bodyFont, t.headingFont, t.chapterFont, t.captionFont].includes(f.family)
    if (inUse) { toast(`“${f.family}” is used by a font slot. Choose another font there first.`, 'warn'); return }
    await delFont(f.id)
    const next = project.customFonts.filter((x) => x.id !== f.id)
    useProject.getState().mutate((p) => ({ ...p, customFonts: next }), { undoable: false })
    await registerCustomFonts(next, getFont)
  }

  return (
    <>
      <Panel title="Book themes">
        <p className="text-[11px] text-fog-400 leading-snug -mt-1">One click sets fonts, chapter style, ornament, drop cap, scene break and palette. Your words and images never change, and it is undoable.</p>
        <div className="grid grid-cols-2 gap-2.5" data-testid="themes">
          {THEMES.map((th) => {
            const pal = paletteById(th.paletteId) ?? PALETTES[0]
            const active = s.themeId === th.id
            return (
              <button key={th.id} type="button" title={th.blurb} data-testid={`theme-${th.id}`} aria-pressed={active} onClick={() => applyThemeById(th.id)}
                className={`group relative text-left rounded-lg border overflow-hidden transition-all duration-150 ${active ? 'border-cyan' : 'border-ink-600 hover:border-ink-400'}`}>
                <div className="h-[72px] px-3 flex flex-col items-center justify-center text-center" style={{ background: pal.page, color: pal.text }}>
                  <div className="text-[15px] leading-tight" style={{ fontFamily: fontStack(th.typography.chapterFont ?? 'EB Garamond'), textTransform: th.typography.chapterUppercase ? 'uppercase' : 'none' }}>Chapter</div>
                  <div className="text-[9px] mt-1 leading-snug opacity-80" style={{ fontFamily: fontStack(th.typography.bodyFont ?? 'EB Garamond') }}>The quick brown fox</div>
                  {th.typography.ornament && <div className="text-[9px] mt-0.5" style={{ color: pal.accent }}>{th.typography.ornament}</div>}
                </div>
                <div className="px-2.5 h-8 flex items-center justify-between bg-ink-900 text-[11px] text-fog-200">
                  <span className="truncate">{th.name}</span>
                  {active && <Check size={12} className="text-cyan shrink-0" />}
                </div>
              </button>
            )
          })}
        </div>
      </Panel>

      <Panel title="Fonts">
        <Field label="Body"><FontPicker label="Body font" value={t.bodyFont} onChange={(f) => f && mutateTypography({ bodyFont: f }, 'body font')} /></Field>
        <Field label="Headings"><FontPicker label="Heading font" value={t.headingFont} onChange={(f) => f && mutateTypography({ headingFont: f }, 'heading font')} /></Field>
        <Field label="Chapter titles"><FontPicker label="Chapter title font" value={t.chapterFont} onChange={(f) => f && mutateTypography({ chapterFont: f }, 'chapter font')} /></Field>
        <Field label="Captions"><FontPicker label="Caption font" value={t.captionFont} onChange={(f) => f && mutateTypography({ captionFont: f }, 'caption font')} /></Field>
        <input ref={fontFile} type="file" accept=".ttf,.otf,.woff2" className="hidden" onChange={(e) => { void uploadFont(e.target.files?.[0]); e.target.value = '' }} />
        <button type="button" className="gb-btn-outline w-full" onClick={() => fontFile.current?.click()}><Upload size={13} /> Upload a font (.ttf .otf .woff2)</button>
        <p className="text-[11px] text-fog-400 leading-snug">Bundled fonts are all SIL Open Font License. For fonts you upload, you are responsible for the print and commercial licence.</p>
        {project.customFonts.map((f) => (
          <div key={f.id} className="rounded-md border border-ink-600 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-fog-100 truncate" style={{ fontFamily: fontStack(f.family) }}>{f.family}</span>
              <IconBtn icon={Trash2} label="Remove font" side="left" className="h-7 w-7" onClick={() => void removeFont(f)} />
            </div>
            <label className="flex items-start gap-2 mt-1.5 text-[11px] text-fog-300 cursor-pointer leading-snug">
              <input type="checkbox" className="mt-0.5 accent-cyan" checked={f.licenceConfirmed}
                onChange={(e) => useProject.getState().mutate((p) => ({ ...p, customFonts: p.customFonts.map((x) => (x.id === f.id ? { ...x, licenceConfirmed: e.target.checked } : x)) }), { undoable: false })} />
              My licence allows embedding this font in e-books
            </label>
          </div>
        ))}
      </Panel>

      <Panel title="Body text">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Size"><NumField width={128} value={t.bodySize} min={7} max={18} step={0.25} unit="pt" onChange={(n) => mutateTypography({ bodySize: n }, 'body size')} /></Field>
          <Field label="Line spacing"><NumField width={128} value={t.lineHeight} min={1} max={2.2} step={0.02} unit="×" onChange={(n) => mutateTypography({ lineHeight: n }, 'line spacing')} /></Field>
          <Field label="First-line indent"><NumField width={128} value={t.indent} min={0} max={4} step={0.1} unit="em" onChange={(n) => mutateTypography({ indent: n }, 'indent')} /></Field>
          <Field label="Paragraph space"><NumField width={128} value={t.paraSpacing} min={0} max={2} step={0.1} unit="em" onChange={(n) => mutateTypography({ paraSpacing: n }, 'paragraph spacing')} /></Field>
          <Field label="Weight"><NumField width={128} value={t.bodyWeight} min={300} max={700} step={100} onChange={(n) => mutateTypography({ bodyWeight: n }, 'body weight')} /></Field>
          <Field label="Letter-spacing"><NumField width={128} value={t.letterSpacing} min={-0.05} max={0.2} step={0.005} unit="em" onChange={(n) => mutateTypography({ letterSpacing: n }, 'letter-spacing')} /></Field>
        </div>
        <Field label="Alignment" row>
          <Seg value={t.align} onChange={(v) => mutateTypography({ align: v }, 'alignment')} options={[{ value: 'justify', label: 'Justified' }, { value: 'left', label: 'Ragged right' }]} />
        </Field>
        <Toggle label="Hyphenation" hint="Lets the browser break long words at line ends (English)." checked={t.hyphenate} onChange={(v) => mutateTypography({ hyphenate: v }, 'hyphenation')} />
      </Panel>

      <Panel title="Chapter openings">
        <Toggle label="Drop cap" hint="A large first letter on each chapter's opening paragraph." checked={t.dropCap} onChange={(v) => mutateTypography({ dropCap: v }, 'drop cap')} />
        {t.dropCap && <Field label="Drop cap height"><Slider value={t.dropCapLines} min={2} max={5} step={1} onChange={(n) => mutateTypography({ dropCapLines: n }, 'drop cap size')} format={(n) => `${n} lines`} /></Field>}
        <Field label="Chapter number">
          <Select label="Chapter number style" className="w-full" value={t.chapterNumber} onChange={(v) => mutateTypography({ chapterNumber: v }, 'chapter number style')}
            options={[{ value: 'word', label: 'Chapter One' }, { value: 'numeral', label: 'Chapter 1' }, { value: 'roman', label: 'I, II, III' }, { value: 'none', label: 'No number' }]} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title size"><NumField width={128} value={t.chapterSize} min={12} max={72} step={1} unit="pt" onChange={(n) => mutateTypography({ chapterSize: n }, 'chapter title size')} /></Field>
          <Field label="Title alignment"><Seg full value={t.chapterAlign} onChange={(v) => mutateTypography({ chapterAlign: v }, 'chapter alignment')} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }]} /></Field>
        </div>
        <Field label="Space above title"><Slider value={Math.round(t.chapterSink * 100)} min={0} max={40} onChange={(n) => mutateTypography({ chapterSink: n / 100 }, 'chapter sink')} format={(n) => `${n}%`} /></Field>
        <Toggle label="Uppercase titles" checked={t.chapterUppercase} onChange={(v) => mutateTypography({ chapterUppercase: v }, 'chapter case')} />
        <Field label="Chapter ornament"><Glyphs label="Chapter ornament" value={t.ornament} options={ORNAMENTS} onChange={(v) => mutateTypography({ ornament: v }, 'ornament')} /></Field>
        <Field label="Scene break"><Glyphs label="Scene break" value={t.sceneBreak} options={SCENE_BREAKS} onChange={(v) => mutateTypography({ sceneBreak: v || '* * *' }, 'scene break')} /></Field>
      </Panel>

      <Panel title="Colour">
        <div className="flex flex-wrap gap-2" data-testid="palettes">
          {[...PALETTES, ...project.customPalettes].map((p: Palette) => (
            <button key={p.id} type="button" title={p.name} aria-label={`Palette: ${p.name}`} aria-pressed={s.paletteId === p.id} onClick={() => applyPaletteById(p.id)}
              className={`relative w-[60px] rounded-md overflow-hidden border transition-colors duration-150 ${s.paletteId === p.id ? 'border-cyan' : 'border-ink-600 hover:border-ink-400'}`}>
              <span className="flex h-8 items-center justify-center text-[13px] font-serif" style={{ background: p.page, color: p.text }}>A<span style={{ color: p.accent }}>a</span></span>
              <span className="block h-5 leading-5 text-[9px] text-fog-300 bg-ink-900 truncate px-1">{p.name}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Field label="Text"><ColorField label="Text colour" value={s.colors.text} onChange={(c) => setColor('text', c)} /></Field>
          <Field label="Chapter accent"><ColorField label="Accent colour" value={s.colors.accent} onChange={(c) => setColor('accent', c)} /></Field>
          <Field label="Highlight"><ColorField label="Highlight colour" value={s.colors.highlight} onChange={(c) => setColor('highlight', c)} /></Field>
          <Field label="Page"><ColorField label="Page colour" value={s.colors.page} onChange={(c) => setColor('page', c)} /></Field>
        </div>
        <div className="flex gap-2">
          <input className="gb-input" placeholder="Name this palette" aria-label="Palette name" value={paletteName} onChange={(e) => setPaletteName(e.target.value)} />
          <button type="button" className="gb-btn-outline shrink-0" disabled={!paletteName.trim()} onClick={() => {
            const pal: Palette = { id: uid('pal_'), name: paletteName.trim(), ...s.colors }
            useProject.getState().mutate((p) => ({ ...p, customPalettes: [...p.customPalettes, pal], settings: { ...p.settings, paletteId: pal.id } }), { label: 'save palette' })
            setPaletteName('')
          }}><Plus size={13} /> Save</button>
        </div>
        <p className="text-[11px] text-fog-400 leading-snug">Screens show RGB; printers convert to CMYK, so colours shift slightly on paper. Body text defaults to pure black (#000000), which prints sharpest. Page colour is a preview only unless you enable it under Layout.</p>
      </Panel>
    </>
  )
}
