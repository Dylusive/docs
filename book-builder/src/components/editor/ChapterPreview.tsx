import { useRef } from 'react'
import { motion } from 'framer-motion'
import type { GeneratedLayout, LayoutSection } from '../../api/ariaLayout'

interface Props {
  layout: GeneratedLayout
  chapterNumber: number
  onExportPDF?: () => void
}

function DropCapText({ content, accentColor }: { content: string; accentColor: string }) {
  const first = content.charAt(0)
  const rest = content.slice(1)
  return (
    <p className="text-base leading-relaxed mb-6 overflow-hidden" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'Georgia, serif' }}>
      <span className="float-left font-bold mr-2 leading-none select-none"
        style={{ fontSize: '5rem', color: accentColor, textShadow: `0 0 40px ${accentColor}66`, lineHeight: 0.82, marginTop: '0.08em' }}>
        {first}
      </span>
      {rest}
    </p>
  )
}

function PullQuote({ content, accentColor }: { content: string; accentColor: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="my-12 mx-auto max-w-lg text-center relative px-8 py-6"
      style={{ borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}` }}>
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-6xl leading-none font-serif" style={{ color: accentColor, opacity: 0.35 }}>"</div>
      <p className="text-xl font-light italic leading-relaxed"
        style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}44`, fontFamily: 'Georgia, serif' }}>
        {content}
      </p>
    </motion.div>
  )
}

function ImageBlock({ section }: { section: LayoutSection }) {
  if (!section.imageUrl) return null
  const alignClass = section.alignment === 'left' ? 'mr-6 mb-4 float-left clear-left' :
    section.alignment === 'right' ? 'ml-6 mb-4 float-right clear-right' :
    section.alignment === 'full' ? 'w-full mb-6' : 'mx-auto mb-6 block'
  const width = section.alignment === 'full' ? '100%' : `${section.widthPercent ?? 70}%`
  return (
    <motion.figure initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={alignClass}
      style={{ width: (section.alignment === 'left' || section.alignment === 'right') ? width : undefined, maxWidth: section.alignment === 'full' ? '100%' : width }}>
      <div className="rounded-lg overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>
        <img src={section.imageUrl} alt={section.caption ?? ''} className="w-full h-auto block" />
      </div>
      {section.caption && (
        <figcaption className="mt-2 text-xs text-center italic" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Georgia, serif' }}>
          {section.caption}
        </figcaption>
      )}
    </motion.figure>
  )
}

function Divider({ style, accentColor }: { style?: string; accentColor: string }) {
  if (style === 'stars') return <div className="text-center my-10" style={{ color: accentColor, opacity: 0.5, letterSpacing: '1em' }}>✦ ✦ ✦</div>
  if (style === 'ornamental') return (
    <div className="flex items-center gap-3 my-10 mx-auto max-w-xs">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentColor}66)` }} />
      <span style={{ color: accentColor, opacity: 0.6 }}>◆</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${accentColor}66)` }} />
    </div>
  )
  if (style === 'blood') return (
    <div className="flex items-center gap-2 my-10 mx-auto max-w-sm">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentColor})` }} />
      <span style={{ color: accentColor }}>🩸</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${accentColor})` }} />
    </div>
  )
  if (style === 'void') return <div className="my-16" />
  return <div className="my-10 mx-auto max-w-xs h-px" style={{ background: `linear-gradient(to right, transparent, ${accentColor}44, transparent)` }} />
}

function PoetryBlock({ content, accentColor }: { content: string; accentColor: string }) {
  const lines = content.split('\n')
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-8 mx-auto max-w-sm text-center">
      {lines.map((line, i) => (
        <p key={i} className="leading-loose text-sm italic"
          style={{ color: line.trim() === '' ? 'transparent' : 'rgba(255,255,255,0.75)', fontFamily: 'Georgia, serif', minHeight: line.trim() === '' ? '1.5em' : undefined }}>
          {line || '\u00a0'}
        </p>
      ))}
    </motion.div>
  )
}

function Fragment({ content, accentColor, emphasis }: { content: string; accentColor: string; emphasis?: string }) {
  const sizes: Record<string, string> = { low: '1.1rem', medium: '1.4rem', high: '1.8rem', extreme: '2.4rem' }
  const opacities: Record<string, number> = { low: 0.65, medium: 0.8, high: 0.92, extreme: 1 }
  const size = sizes[emphasis ?? 'medium'] ?? '1.4rem'
  const opacity = opacities[emphasis ?? 'medium'] ?? 0.8
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="my-10 text-center px-4">
      <p style={{ fontSize: size, color: accentColor, opacity, fontFamily: 'Georgia, serif', fontStyle: 'italic',
        textShadow: emphasis === 'extreme' ? `0 0 30px ${accentColor}88` : `0 0 15px ${accentColor}33`, letterSpacing: '0.02em' }}>
        {content}
      </p>
    </motion.div>
  )
}

function Scream({ content, accentColor }: { content: string; accentColor: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="my-14 text-center px-2">
      <p style={{ fontSize: '2.6rem', fontWeight: 900, fontFamily: 'Georgia, serif', color: accentColor,
        textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: `0 0 40px ${accentColor}, 0 0 80px ${accentColor}44`, lineHeight: 1.1 }}>
        {content}
      </p>
    </motion.div>
  )
}

function Whisper({ content }: { content: string }) {
  return (
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="text-xs italic text-center my-6 px-8"
      style={{ color: 'rgba(255,255,255,0.22)', fontFamily: 'Georgia, serif', letterSpacing: '0.03em' }}>
      {content}
    </motion.p>
  )
}

function Dialogue({ content, speaker, accentColor }: { content: string; speaker?: string; accentColor: string }) {
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="my-4 pl-5 border-l-2" style={{ borderColor: `${accentColor}44` }}>
      {speaker && <p className="text-xs font-mono mb-1 tracking-widest" style={{ color: accentColor, opacity: 0.6 }}>{speaker}</p>}
      <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
        "{content}"
      </p>
    </motion.div>
  )
}

function AriaData({ content, accentColor }: { content: string; accentColor: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="my-8 p-4 rounded font-mono text-xs leading-relaxed"
      style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${accentColor}22`, color: `${accentColor}cc`, boxShadow: `inset 0 0 20px ${accentColor}08` }}>
      <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${accentColor}18` }}>
        <span style={{ color: accentColor, opacity: 0.5 }}>◈</span>
        <span className="tracking-widest text-xs" style={{ color: accentColor, opacity: 0.4 }}>ARIA ANALYSIS</span>
      </div>
      {content.split('\n').map((line, i) => (
        <p key={i} className="mb-0.5" style={{ color: line.startsWith('//') ? `${accentColor}55` : `${accentColor}bb` }}>{line}</p>
      ))}
    </motion.div>
  )
}

function WordSplit({ word, content, roots, accentColor }: { word?: string; content?: string; roots?: string; accentColor: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="my-10 text-center">
      {word && <p className="text-xs font-mono tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>WORD DISSECTION</p>}
      <p className="text-3xl font-bold tracking-widest mb-3" style={{ color: accentColor, fontFamily: 'Georgia, serif', textShadow: `0 0 30px ${accentColor}55` }}>
        {content ?? word}
      </p>
      {roots && <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Georgia, serif', maxWidth: '32rem', margin: '0 auto' }}>{roots}</p>}
    </motion.div>
  )
}

function SigilRow({ glyphs, accentColor }: { glyphs?: string[]; accentColor: string }) {
  const symbols = glyphs?.length ? glyphs : ['✦', '◈', '◆', '◈', '✦']
  return (
    <div className="flex items-center justify-center gap-3 my-10">
      {symbols.map((g, i) => (
        <motion.span key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.5, scale: 1 }}
          transition={{ delay: i * 0.08 }} style={{ color: accentColor, fontSize: '1.1rem' }}>
          {g}
        </motion.span>
      ))}
    </div>
  )
}

function Letter({ content }: { content: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-10 p-6 rounded"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.08)`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontFamily: 'Georgia, serif',
        color: 'rgba(255,255,255,0.7)', lineHeight: 1.9, fontSize: '0.9rem', fontStyle: 'italic' }}>
      {content.split('\n').map((line, i) => (
        <p key={i} className={line.trim() === '' ? 'h-4' : 'mb-2'}>{line}</p>
      ))}
    </motion.div>
  )
}

function Spell({ content, accentColor }: { content: string; accentColor: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-10 text-center px-6 py-6 mx-auto max-w-lg"
      style={{ background: `radial-gradient(ellipse at center, ${accentColor}08, transparent)`, border: `1px solid ${accentColor}22`, borderRadius: '2px' }}>
      <p className="text-sm tracking-widest uppercase leading-loose"
        style={{ color: accentColor, opacity: 0.85, fontFamily: 'Georgia, serif', letterSpacing: '0.15em' }}>
        {content}
      </p>
    </motion.div>
  )
}

function EtymologyBlock({ word, content, roots, accentColor }: { word?: string; content?: string; roots?: string; accentColor: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="my-8 p-4 rounded-sm"
      style={{ background: `${accentColor}08`, borderLeft: `3px solid ${accentColor}44` }}>
      {word && <p className="text-lg font-bold mb-1" style={{ color: accentColor, fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>{word}</p>}
      {content && <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{content}</p>}
      {roots && <p className="text-xs font-mono" style={{ color: `${accentColor}88` }}>{roots}</p>}
    </motion.div>
  )
}

function Epigraph({ content }: { content: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12 text-center px-8">
      <p className="text-sm italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Georgia, serif' }}>
        "{content}"
      </p>
    </motion.div>
  )
}

function Subtitle({ content, accentColor, style }: { content: string; accentColor: string; style?: string }) {
  const isOrnate = style === 'ornate'
  return (
    <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center my-8"
      style={{ color: isOrnate ? accentColor : 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, serif',
        fontSize: isOrnate ? '1rem' : '1.1rem', letterSpacing: isOrnate ? '0.2em' : '0.05em',
        textTransform: isOrnate ? 'uppercase' : undefined, textShadow: isOrnate ? `0 0 20px ${accentColor}44` : 'none', fontWeight: 600 }}>
      {content}
    </motion.h2>
  )
}

function renderSection(section: LayoutSection, accentColor: string, index: number) {
  const delay = Math.min(index * 0.03, 0.5)
  switch (section.type) {
    case 'title': return (
      <motion.h1 key={index} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
        className="text-4xl font-bold mb-4 text-center"
        style={{ color: accentColor, textShadow: `0 0 40px ${accentColor}66`, fontFamily: 'Georgia, serif', letterSpacing: '0.02em' }}>
        {section.content}
      </motion.h1>
    )
    case 'subtitle': return <Subtitle key={index} content={section.content ?? ''} accentColor={accentColor} style={section.style} />
    case 'epigraph': return <Epigraph key={index} content={section.content ?? ''} />
    case 'dropcap': return (
      <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}>
        <DropCapText content={section.content ?? ''} accentColor={accentColor} />
      </motion.div>
    )
    case 'body': return (
      <motion.p key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
        className="text-base leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'Georgia, serif' }}>
        {section.content}
      </motion.p>
    )
    case 'pullquote': return <PullQuote key={index} content={section.content ?? ''} accentColor={accentColor} />
    case 'subheading': return (
      <motion.h2 key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
        className="text-xl font-semibold mt-10 mb-4"
        style={{ color: accentColor, fontFamily: 'Georgia, serif', borderBottom: `1px solid ${accentColor}33`, paddingBottom: '0.4em' }}>
        {section.content}
      </motion.h2>
    )
    case 'poetry': return <PoetryBlock key={index} content={section.content ?? ''} accentColor={accentColor} />
    case 'fragment': return <Fragment key={index} content={section.content ?? ''} accentColor={accentColor} emphasis={section.emphasis} />
    case 'scream': return <Scream key={index} content={section.content ?? ''} accentColor={accentColor} />
    case 'whisper': return <Whisper key={index} content={section.content ?? ''} />
    case 'dialogue': return <Dialogue key={index} content={section.content ?? ''} speaker={section.speaker} accentColor={accentColor} />
    case 'aria_data': return <AriaData key={index} content={section.content ?? ''} accentColor={accentColor} />
    case 'wordsplit': return <WordSplit key={index} word={section.word} content={section.content} roots={section.roots} accentColor={accentColor} />
    case 'sigil_row': return <SigilRow key={index} glyphs={section.glyphs} accentColor={accentColor} />
    case 'letter': return <Letter key={index} content={section.content ?? ''} />
    case 'spell': return <Spell key={index} content={section.content ?? ''} accentColor={accentColor} />
    case 'etymology': return <EtymologyBlock key={index} word={section.word} content={section.content} roots={section.roots} accentColor={accentColor} />
    case 'image': return <ImageBlock key={index} section={section} />
    case 'divider': return <Divider key={index} style={section.style} accentColor={accentColor} />
    default: return null
  }
}

export function exportChapterToPrint(title: string) {
  const el = document.getElementById('chapter-preview-content')
  if (!el) return
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { margin: 0; background: #080810; color: white; font-family: Georgia, serif; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      @page { margin: 0.75in; }
    </style></head><body>${el.innerHTML}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 800)
}

export function ChapterPreview({ layout, chapterNumber, onExportPDF }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-full w-full overflow-y-auto" style={{ background: layout.backgroundStyle }}>
      <div id="chapter-preview-content" ref={ref} className="max-w-2xl mx-auto px-8 py-16">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-8">
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: layout.accentColor, opacity: 0.45 }}>
            Chapter {String(chapterNumber).padStart(2, '0')}
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.6, scale: 1 }} transition={{ delay: 0.15 }} className="text-center mb-10">
          <span className="text-xs font-mono px-3 py-1 rounded-full border tracking-widest uppercase"
            style={{ borderColor: `${layout.accentColor}33`, color: layout.accentColor }}>
            {layout.style}
          </span>
        </motion.div>

        <div className="overflow-hidden">
          {layout.sections.map((section, i) => renderSection(section, layout.accentColor, i))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="mt-16 pt-6 border-t" style={{ borderColor: `${layout.accentColor}15` }}>
          <p className="text-xs italic text-center" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'Georgia, serif' }}>
            {layout.designNotes}
          </p>
          <div className="flex justify-center mt-6">
            <button
              onClick={() => onExportPDF ? onExportPDF() : exportChapterToPrint(`Chapter ${chapterNumber}`)}
              className="text-xs font-mono px-4 py-2 rounded transition-all hover:opacity-80"
              style={{ border: `1px solid ${layout.accentColor}33`, color: layout.accentColor, background: `${layout.accentColor}08` }}>
              ↓ Export / Print PDF
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
