import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { ChevronDown, X, type LucideIcon } from 'lucide-react'
import { useUI } from '@/store/ui'

export function IconBtn({ icon: Icon, label, active, onClick, disabled, side, size = 16, className = '' }: {
  icon: LucideIcon; label: string; active?: boolean; onClick?: () => void; disabled?: boolean; side?: 'right' | 'top' | 'left'; size?: number; className?: string
}) {
  return (
    <button type="button" className={`gb-icon-btn ${className}`} data-active={active ? 'true' : 'false'} data-tip={label} data-tip-side={side}
      aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      <Icon size={size} strokeWidth={1.75} />
    </button>
  )
}

export function Panel({ title, children, defaultOpen = true, action }: { title: string; children: ReactNode; defaultOpen?: boolean; action?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-ink-600/70">
      <div className="flex items-center h-10 px-4">
        <button type="button" className="flex items-center gap-2 flex-1 text-left gb-label hover:text-fog-200 transition-colors" onClick={() => setOpen(!open)} aria-expanded={open}>
          <ChevronDown size={12} className={`transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
          {title}
        </button>
        {action}
      </div>
      {open && <div className="px-4 pb-5 pt-1 space-y-3">{children}</div>}
    </section>
  )
}

/** The visible label of the enclosing Field, so inputs inside it get an accessible name. */
const FieldLabel = createContext<string | undefined>(undefined)

export function Field({ label, children, hint, row }: { label: string; children: ReactNode; hint?: string; row?: boolean }) {
  return (
    <FieldLabel.Provider value={label}>
      <div className={row ? 'flex items-center justify-between gap-3' : 'block'}>
        <span className={`block text-[11.5px] text-fog-300 ${row ? '' : 'mb-1.5'}`}>{label}</span>
        {children}
        {hint && <span className="block text-[11px] text-fog-400 mt-1.5 leading-snug">{hint}</span>}
      </div>
    </FieldLabel.Provider>
  )
}

export function NumField({ value, onChange, min, max, step = 1, unit, width = 76, disabled }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; unit?: string; width?: number; disabled?: boolean
}) {
  const [text, setText] = useState(String(value))
  const label = useContext(FieldLabel)
  /** true only while the author is typing in this field — a field that merely has focus still follows its value */
  const editing = useRef(false)
  useEffect(() => { if (!editing.current) setText(String(value)) }, [value])
  const commit = (raw: string): void => {
    if (!editing.current) return
    editing.current = false
    let n = parseFloat(raw)
    if (Number.isNaN(n)) { setText(String(value)); return }
    if (min !== undefined) n = Math.max(min, n)
    if (max !== undefined) n = Math.min(max, n)
    n = Math.round(n * 10000) / 10000
    setText(String(n))
    if (n !== value) onChange(n)
  }
  return (
    <span className="relative inline-flex items-center" style={{ width }}>
      <input className="gb-input pr-6 tabular-nums" type="number" aria-label={label} value={text} min={min} max={max} step={step} disabled={disabled}
        onChange={(e) => { editing.current = true; setText(e.target.value); const n = parseFloat(e.target.value); if (!Number.isNaN(n) && (min === undefined || n >= min) && (max === undefined || n <= max)) onChange(n) }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
      {unit && <span className="absolute right-2 text-[10.5px] text-fog-400 pointer-events-none">{unit}</span>}
    </span>
  )
}

export function Slider({ value, onChange, min, max, step = 1, format }: { value: number; onChange: (n: number) => void; min: number; max: number; step?: number; format?: (n: number) => string }) {
  const label = useContext(FieldLabel)
  return (
    <span className="flex items-center gap-3">
      <input type="range" aria-label={label} className="flex-1 accent-cyan h-1 cursor-pointer" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="w-12 text-right text-[11.5px] tabular-nums text-fog-200">{format ? format(value) : value}</span>
    </span>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer group">
      <span>
        <span className="block text-[12.5px] text-fog-200 group-hover:text-white transition-colors">{label}</span>
        {hint && <span className="block text-[11px] text-fog-400 mt-0.5 leading-snug">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-0.5 w-8 h-[18px] rounded-full transition-colors duration-150 ${checked ? 'bg-cyan' : 'bg-ink-500'}`}>
        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-ink-950 transition-transform duration-150 ease-out ${checked ? 'translate-x-[14px]' : ''}`} />
      </button>
    </label>
  )
}

export function Seg<T extends string>({ value, onChange, options, full }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; tip?: string }[]; full?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 p-0.5 rounded-md bg-ink-900 border border-ink-600 ${full ? 'w-full' : ''}`} role="radiogroup" aria-label={useContext(FieldLabel)}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} aria-label={o.tip} data-tip={o.tip} onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(o.value)}
          className={`h-7 px-2.5 rounded text-[11.5px] font-medium whitespace-nowrap transition-all duration-150 inline-flex items-center justify-center gap-1.5 ${full ? 'flex-1' : ''} ${value === o.value ? 'bg-ink-600 text-white' : 'text-fog-400 hover:text-fog-100'}`}>
          {o.label}
        </button>
      ))}
    </span>
  )
}

export function Select<T extends string>({ value, onChange, options, className = '', label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; group?: string }[]; className?: string; label?: string }) {
  const groups = Array.from(new Set(options.map((o) => o.group ?? '')))
  return (
    <span className={`relative inline-block ${className}`}>
      <select aria-label={label} className="gb-input appearance-none pr-7 cursor-pointer" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {groups.map((g) => g
          ? <optgroup key={g} label={g}>{options.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
          : options.filter((o) => !o.group).map((o) => <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-fog-400 pointer-events-none" />
    </span>
  )
}

export function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const valid = (s: string): boolean => /^#[0-9a-fA-F]{6}$/.test(s)
  return (
    <span className="flex items-center gap-2">
      <span className="relative w-8 h-8 rounded-md border border-ink-500 overflow-hidden shrink-0" style={{ background: value }}>
        <input type="color" aria-label={label} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={valid(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
      </span>
      <input className="gb-input font-mono text-[11.5px] uppercase" aria-label={`${label} hex`} value={text} maxLength={7}
        onChange={(e) => { const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value; setText(v); if (valid(v)) onChange(v.toUpperCase()) }}
        onBlur={() => setText(value)} />
    </span>
  )
}

export function Dialog({ title, onClose, children, width = 640, footer, subtitle }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; width?: number; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 gb-fade-in" style={{ background: 'rgba(5,5,9,.72)', backdropFilter: 'blur(3px)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="gb-pop-in bg-ink-800 border border-ink-600 rounded-xl shadow-pop flex flex-col max-h-full outline-none" style={{ width, maxWidth: '100%' }}>
        <header className="flex items-start justify-between px-6 pt-5 pb-4 shrink-0">
          <div>
            <h2 className="font-display text-[17px] font-semibold text-white tracking-tight">{title}</h2>
            {subtitle && <p className="text-[12px] text-fog-400 mt-1">{subtitle}</p>}
          </div>
          <button type="button" className="gb-icon-btn -mr-2 -mt-1" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </header>
        <div className="px-6 pb-6 overflow-y-auto min-h-0">{children}</div>
        {footer && <footer className="px-6 py-4 border-t border-ink-600 flex items-center justify-end gap-2 shrink-0">{footer}</footer>}
      </div>
    </div>
  )
}

export function Popover({ trigger, children, align = 'left', width = 240 }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown, true); window.removeEventListener('keydown', onKey) }
  }, [open])
  const style: CSSProperties = { width, [align]: 0 }
  return (
    <span ref={ref} className="relative inline-flex">
      {trigger(open, () => setOpen((o) => !o))}
      {open && <div className="absolute top-[calc(100%+6px)] z-40 bg-ink-800 border border-ink-600 rounded-lg shadow-pop p-1.5 gb-pop-in" style={style}>{children(() => setOpen(false))}</div>}
    </span>
  )
}

export function MenuItem({ icon: Icon, label, hint, onClick, active, danger, disabled }: { icon?: LucideIcon; label: string; hint?: string; onClick: () => void; active?: boolean; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-left text-[12.5px] transition-colors duration-150 disabled:opacity-35 ${danger ? 'text-danger hover:bg-danger/10' : active ? 'text-cyan bg-cyan/10' : 'text-fog-200 hover:bg-ink-600 hover:text-white'}`}>
      {Icon && <Icon size={14} strokeWidth={1.75} className="shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-[10.5px] text-fog-400 font-mono">{hint}</span>}
    </button>
  )
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismiss)
  const tone = { info: 'border-ink-500', ok: 'border-ok/50', warn: 'border-amber/60', error: 'border-danger/60' } as const
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`gb-slide-up pointer-events-auto flex items-center gap-4 max-w-[560px] bg-ink-800 border ${tone[t.tone]} rounded-lg shadow-pop pl-4 pr-2 py-2.5 text-[12.5px] text-fog-100`}>
          <span className="leading-snug">{t.text}</span>
          {t.action && <button type="button" className="gb-btn-ghost text-cyan h-7 px-2" onClick={() => { t.action?.run(); dismiss(t.id) }}>{t.action.label}</button>}
          <button type="button" className="gb-icon-btn h-7 w-7" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={13} /></button>
        </div>
      ))}
    </div>
  )
}

export function Logo({ size = 15 }: { size?: number }) {
  return <span className="gb-logo" data-text="GLITCHBIND" style={{ fontSize: size }}>GLITCH<span className="gb-logo-accent">BIND</span></span>
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 gb-fade-in">
      <div className="w-11 h-11 rounded-xl bg-ink-700 border border-ink-600 flex items-center justify-center text-cyan mb-4"><Icon size={18} strokeWidth={1.5} /></div>
      <div className="text-[13px] font-medium text-fog-100">{title}</div>
      {children && <div className="text-[12px] text-fog-400 mt-2 leading-relaxed max-w-[220px]">{children}</div>}
    </div>
  )
}
