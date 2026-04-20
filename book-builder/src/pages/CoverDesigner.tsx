import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, useActiveBook } from '../store/bookStore'
import { generateBookCover } from '../api/aria'
import { MainFrame } from '../components/layout/MainFrame'
import { HolographicCard } from '../components/ui/HolographicCard'
import { GlowButton } from '../components/ui/GlowButton'

const STYLE_OPTIONS = [
  { id: '', label: 'Auto', desc: 'Aria chooses the perfect aesthetic' },
  { id: 'dark luxury literary', label: 'Dark Luxury', desc: 'Opulent darkness, gold and void' },
  { id: 'blood moon occult', label: 'Blood Moon', desc: 'Crimson, mystical, sacred-profane' },
  { id: 'minimalist typographic', label: 'Minimalist', desc: 'Pure type, pure impact, pure silence' },
  { id: 'editorial magazine high-fashion', label: 'Editorial', desc: 'Fashion-forward, bold, contemporary' },
  { id: 'vintage occult grimoire', label: 'Grimoire', desc: 'Ancient manuscript, wax seals, ink' },
  { id: 'surrealist dreamscape', label: 'Surrealist', desc: 'Reality-bending, dreamlike, strange' },
  { id: 'terminal arcane glitch', label: 'Terminal', desc: 'Digital-meets-occult, code as spell' },
]

export function CoverDesigner() {
  const book = useActiveBook()
  const { apiKey, setCover } = useStore()
  const [selectedStyle, setSelectedStyle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!apiKey) { setError('No API key set. Go to Settings.'); return }
    setGenerating(true)
    setError('')
    try {
      const result = await generateBookCover(apiKey, book, selectedStyle)
      setCover({ ...result, generatedAt: new Date().toISOString() })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleExportSVG = () => {
    if (!book.cover?.svg) return
    const blob = new Blob([book.cover.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${book.title.replace(/\s+/g, '-')}-cover.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrintCover = () => {
    if (!book.cover?.svg) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>${book.title} — Cover</title>
      <style>
        body { margin: 0; background: #080810; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        svg { max-width: 100vmin; max-height: 100vmin; }
        @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
      </style></head>
      <body>${book.cover.svg}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 600)
  }

  return (
    <MainFrame ariaContext={`User is in the Cover Designer for "${book.title}".`}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-mono font-bold" style={{ color: '#ffd700', textShadow: '0 0 20px rgba(255,215,0,0.4)' }}>
                Cover Designer
              </h1>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                AI-generated book covers · {book.title}
              </p>
            </div>
            {book.cover && (
              <div className="flex gap-2">
                <GlowButton variant="ghost" size="sm" onClick={handleExportSVG}>↓ SVG</GlowButton>
                <GlowButton variant="ghost" size="sm" onClick={handlePrintCover}>⎙ Print</GlowButton>
                <GlowButton onClick={handleGenerate} disabled={generating} size="sm">
                  {generating ? 'Designing...' : '✦ Redesign'}
                </GlowButton>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 mx-6 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,215,0,0.3), transparent)' }} />

        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-6 p-6 h-full">
            {/* Controls panel */}
            <div className="w-64 flex-shrink-0 space-y-4">
              <HolographicCard padding="p-4">
                <h3 className="text-xs font-mono tracking-widest mb-3" style={{ color: 'rgba(0,229,255,0.6)' }}>STYLE PRESET</h3>
                <div className="space-y-2">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedStyle(opt.id)}
                      className="w-full text-left px-3 py-2 rounded transition-all"
                      style={{
                        background: selectedStyle === opt.id ? 'rgba(0,229,255,0.12)' : 'rgba(0,229,255,0.03)',
                        border: `1px solid ${selectedStyle === opt.id ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.1)'}`,
                        color: selectedStyle === opt.id ? '#00e5ff' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <div className="text-xs font-mono font-semibold">{opt.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </HolographicCard>

              <GlowButton onClick={handleGenerate} disabled={generating || !apiKey} className="w-full justify-center">
                {generating ? (
                  <span className="flex items-center gap-2">
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>✦</motion.span>
                    Designing...
                  </span>
                ) : book.cover ? '✦ Generate New Cover' : '✦ Generate Cover'}
              </GlowButton>

              {!apiKey && (
                <p className="text-xs font-mono text-center" style={{ color: 'rgba(139,92,246,0.5)' }}>
                  Set API key in Settings to generate covers
                </p>
              )}

              {error && (
                <p className="text-xs font-mono" style={{ color: 'rgba(239,68,68,0.7)' }}>⚠ {error}</p>
              )}

              {book.cover && (
                <HolographicCard padding="p-3">
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    {book.cover.paletteNotes}
                  </p>
                  <p className="text-xs font-mono mt-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    {new Date(book.cover.generatedAt).toLocaleDateString()}
                  </p>
                </HolographicCard>
              )}
            </div>

            {/* Cover preview */}
            <div className="flex-1 flex items-start justify-center">
              <AnimatePresence mode="wait">
                {generating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-6 mt-20"
                  >
                    <motion.div
                      animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className="text-5xl"
                      style={{ color: '#ffd700' }}
                    >
                      ✦
                    </motion.div>
                    <div className="text-center">
                      <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Aria is designing your cover...
                      </p>
                      <p className="font-mono text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        This may take 30-60 seconds
                      </p>
                    </div>
                  </motion.div>
                ) : book.cover?.svg ? (
                  <motion.div
                    key="cover"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center"
                    style={{ maxWidth: '400px' }}
                  >
                    <div
                      className="rounded-lg overflow-hidden"
                      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)' }}
                      dangerouslySetInnerHTML={{ __html: book.cover.svg }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center gap-4 mt-20"
                  >
                    <div className="text-5xl opacity-30">📖</div>
                    <p className="font-mono text-sm text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      No cover generated yet.<br />
                      Choose a style and click Generate.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </MainFrame>
  )
}
