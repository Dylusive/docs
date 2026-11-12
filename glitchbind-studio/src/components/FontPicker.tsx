import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { FONT_GROUPS, allFonts, fontStack } from '@/lib/fonts'
import { Popover } from './ui'

/** Font menu with every family previewed in its own face. */
export function FontPicker({ value, onChange, label, allowDefault }: { value: string | null; onChange: (family: string | null) => void; label: string; allowDefault?: string }) {
  const [q, setQ] = useState('')
  // not memoised: the list must include fonts the author uploads while the app is open
  const fonts = allFonts().filter((f) => f.family.toLowerCase().includes(q.toLowerCase()))
  return (
    <Popover width={264} trigger={(_open, toggle) => (
      <button type="button" className="gb-input flex items-center justify-between text-left" aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={toggle}>
        <span className="truncate text-[13.5px]" style={{ fontFamily: value ? fontStack(value) : undefined }}>{value ?? allowDefault ?? 'Default'}</span>
        <ChevronDown size={13} className="text-fog-400 shrink-0" />
      </button>
    )}>
      {(close) => (
        <div>
          <div className="relative mb-1.5">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fog-400" />
            <input autoFocus className="gb-input pl-8" placeholder="Search fonts" aria-label="Search fonts" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="max-h-[320px] overflow-y-auto pr-0.5" role="listbox" aria-label={label}>
            {allowDefault && !q && (
              <button type="button" className={`w-full text-left px-2.5 h-8 rounded-md text-[12.5px] transition-colors ${value === null ? 'bg-cyan/10 text-cyan' : 'text-fog-300 hover:bg-ink-600'}`} onClick={() => { onChange(null); close() }}>{allowDefault}</button>
            )}
            {FONT_GROUPS.map((g) => {
              const list = fonts.filter((f) => f.group === g)
              if (!list.length) return null
              return (
                <div key={g}>
                  <div className="gb-label px-2.5 pt-3 pb-1.5">{g}</div>
                  {list.map((f) => (
                    <button key={f.family} type="button" role="option" aria-selected={value === f.family}
                      className={`w-full text-left px-2.5 h-9 rounded-md text-[16px] leading-none truncate transition-colors duration-150 ${value === f.family ? 'bg-cyan/10 text-cyan' : 'text-fog-100 hover:bg-ink-600'}`}
                      style={{ fontFamily: fontStack(f.family) }} onClick={() => { onChange(f.family); close() }}>
                      {f.family}
                    </button>
                  ))}
                </div>
              )
            })}
            {!fonts.length && <div className="px-2.5 py-6 text-center text-fog-400 text-[12px]">No font matches “{q}”.</div>}
          </div>
        </div>
      )}
    </Popover>
  )
}
