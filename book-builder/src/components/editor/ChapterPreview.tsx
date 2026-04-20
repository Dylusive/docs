import { motion } from 'framer-motion'
import type { GeneratedLayout, LayoutSection } from '../../api/ariaLayout'

interface Props {
  layout: GeneratedLayout
  chapterNumber: number
}

function DropCapText({ content, accentColor }: { content: string; accentColor: string }) {
  const first = content.charAt(0)
  const rest = content.slice(1)
  return (
    <p className="text-base leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'Georgia, serif' }}>
      <span
        className="float-left font-bold mr-2 leading-none"
        style={{
          fontSize: '4.5rem',
          color: accentColor,
          textShadow: `0 0 30px ${accentColor}66`,
          lineHeight: 0.85,
          marginTop: '0.1em',
        }}
      >
        {first}
      </span>
      {rest}
    </p>
  )
}

function PullQuote({ content, accentColor }: { content: string; accentColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-10 mx-auto max-w-lg text-center relative px-8 py-6"
      style={{
        borderTop: `2px solid ${accentColor}`,
        borderBottom: `2px solid ${accentColor}`,
      }}
    >
      <div
        className="absolute -top-4 left-1/2 -translate-x-1/2 text-5xl leading-none font-serif"
        style={{ color: accentColor, opacity: 0.4 }}
      >
        "
      </div>
      <p
        className="text-xl font-light italic leading-relaxed"
        style={{
          color: accentColor,
          textShadow: `0 0 20px ${accentColor}44`,
          fontFamily: 'Georgia, serif',
        }}
      >
        {content}
      </p>
    </motion.div>
  )
}

function ImageBlock({ section }: { section: LayoutSection }) {
  if (!section.imageUrl) return null

  const alignClass =
    section.alignment === 'left' ? 'mr-6 mb-4 float-left clear-left' :
    section.alignment === 'right' ? 'ml-6 mb-4 float-right clear-right' :
    section.alignment === 'full' ? 'w-full mb-6' :
    'mx-auto mb-6 block'

  const width = section.alignment === 'full' ? '100%' : `${section.widthPercent ?? 70}%`

  return (
    <motion.figure
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={alignClass}
      style={{ width: section.alignment === 'left' || section.alignment === 'right' ? width : undefined, maxWidth: section.alignment === 'full' ? '100%' : width }}
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
      >
        <img src={section.imageUrl} alt={section.caption ?? ''} className="w-full h-auto block" />
      </div>
      {section.caption && (
        <figcaption
          className="mt-2 text-xs text-center italic"
          style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Georgia, serif' }}
        >
          {section.caption}
        </figcaption>
      )}
    </motion.figure>
  )
}

function Divider({ style, accentColor }: { style?: string; accentColor: string }) {
  if (style === 'stars') {
    return (
      <div className="text-center my-8" style={{ color: accentColor, opacity: 0.5, letterSpacing: '1em' }}>
        ✦ ✦ ✦
      </div>
    )
  }
  if (style === 'ornamental') {
    return (
      <div className="flex items-center gap-3 my-8 mx-auto max-w-xs">
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentColor}66)` }} />
        <span style={{ color: accentColor, opacity: 0.6 }}>◆</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${accentColor}66)` }} />
      </div>
    )
  }
  return (
    <div className="my-8 mx-auto max-w-xs h-px" style={{ background: `linear-gradient(to right, transparent, ${accentColor}44, transparent)` }} />
  )
}

function renderSection(section: LayoutSection, accentColor: string, index: number) {
  switch (section.type) {
    case 'title':
      return (
        <motion.h1
          key={index}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-2 text-center"
          style={{
            color: accentColor,
            textShadow: `0 0 40px ${accentColor}66`,
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.02em',
          }}
        >
          {section.content}
        </motion.h1>
      )

    case 'dropcap':
      return (
        <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <DropCapText content={section.content ?? ''} accentColor={accentColor} />
        </motion.div>
      )

    case 'body':
      return (
        <motion.p
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.04 }}
          className="text-base leading-relaxed mb-5"
          style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'Georgia, serif' }}
        >
          {section.content}
        </motion.p>
      )

    case 'pullquote':
      return <PullQuote key={index} content={section.content ?? ''} accentColor={accentColor} />

    case 'subheading':
      return (
        <motion.h2
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-semibold mt-10 mb-4"
          style={{
            color: accentColor,
            fontFamily: 'Georgia, serif',
            borderBottom: `1px solid ${accentColor}33`,
            paddingBottom: '0.4em',
          }}
        >
          {section.content}
        </motion.h2>
      )

    case 'image':
      return <ImageBlock key={index} section={section} />

    case 'divider':
      return <Divider key={index} style={section.style} accentColor={accentColor} />

    default:
      return null
  }
}

export function ChapterPreview({ layout, chapterNumber }: Props) {
  return (
    <div
      className="min-h-full w-full overflow-y-auto"
      style={{ background: layout.backgroundStyle }}
    >
      {/* Page */}
      <div className="max-w-2xl mx-auto px-8 py-16">
        {/* Chapter number */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-8"
        >
          <span
            className="text-xs font-mono tracking-widest uppercase"
            style={{ color: layout.accentColor, opacity: 0.5 }}
          >
            Chapter {String(chapterNumber).padStart(2, '0')}
          </span>
        </motion.div>

        {/* Design style badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-10"
        >
          <span
            className="text-xs font-mono px-3 py-1 rounded-full border tracking-widest uppercase"
            style={{ borderColor: `${layout.accentColor}33`, color: layout.accentColor }}
          >
            {layout.style}
          </span>
        </motion.div>

        {/* Rendered sections */}
        <div className="overflow-hidden">
          {layout.sections.map((section, i) => renderSection(section, layout.accentColor, i))}
        </div>

        {/* Design notes footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 pt-6 border-t text-center"
          style={{ borderColor: `${layout.accentColor}15` }}
        >
          <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Georgia, serif' }}>
            {layout.designNotes}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
