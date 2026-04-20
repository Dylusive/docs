import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { rewriteText, type RewriteMode } from '../../api/aria'
import type { Book } from '../../types'

interface Props {
  apiKey: string
  book: Book
  selectedText: string
  chapterContext?: string
  onInsert: (text: string) => void
  onClose: () => void
  accentColor?: string
}

const MODES: { id: RewriteMode; label: string; icon: string; desc: string }[] = [
  { id: 'polish', label: 'Polish', icon: '✧', desc: 'Refine & sharpen' },
  { id: 'intensify', label: 'Intensify', icon: '⚡', desc: 'Make it electric' },
  { id: 'poeticize', label: 'Poeticize', icon: '🌙', desc: 'Lyrical & fragmented' },
  { id: 'shorten', label: 'Distill', icon: '◈', desc: 'Cut to essence' },
  { id: 'expand', label: 'Expand', icon: '🌊', desc: 'Breathe & extend' },
  { id: 'bloom-hour', label: 'Bloom Hour', icon: '🩸', desc: 'Sacred-profane mode' },
]

export function AriaRewrite({ apiKey, book, selectedText, chapterContext, onInsert, onClose, accentColor = '#8b5cf6' }: Props) {
  const [mode, setMode] = useState<RewriteMode>('polish')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRewrite = async () => {
    if (!apiKey || !selectedText.trim()) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      const rewritten = await rewriteText(apiKey, book, selectedText, mode, chapterContext)
      setResult(rewritten)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rewrite failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-lg overflow-hidden"
        style={{
          background: 'rgba(14,14,28,0.98)',
          border: `1px solid ${accentColor}33`,
          boxShadow: `0 0 40px ${accentColor}22`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${accentColor}18` }}>
          <div className="flex items-center gap-2">
            <span style={{ color: accentColor }}>✦</span>
            <span className="text-xs font-mono tracking-widest" style={{ color: accentColor }}>ARIA REWRITE</span>
          </div>
          <button onClick={onClose} className="text-xs font-mono opacity-40 hover:opacity-70 transition-opacity" style={{ color: 'rgba(255,255,255,0.6)' }}>
            ✕ close
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Selected text preview */}
          <div className="p-3 rounded text-xs leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontFamily: 'Georgia, serif', maxHeight: '80px', overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>
            {selectedText}
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className="p-2 rounded text-left transition-all"
                style={{
                  background: mode === m.id ? `${accentColor}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${mode === m.id ? `${accentColor}44` : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className="text-sm mb-0.5">{m.icon}</div>
                <div className="text-xs font-mono font-semibold" style={{ color: mode === m.id ? accentColor : 'rgba(255,255,255,0.6)' }}>
                  {m.label}
                </div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem' }}>{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleRewrite}
              disabled={loading || !apiKey}
              className="flex-1 py-2 rounded text-sm font-mono transition-all disabled:opacity-40"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}33`, color: accentColor }}
            >
              {loading ? (
                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
                  Aria is rewriting...
                </motion.span>
              ) : 'Rewrite'}
            </button>
          </div>

          {error && <p className="text-xs font-mono" style={{ color: 'rgba(239,68,68,0.6)' }}>⚠ {error}</p>}

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="p-4 rounded text-sm leading-relaxed mb-3"
                  style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}22`, color: 'rgba(255,255,255,0.85)', fontFamily: 'Georgia, serif', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                  {result}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onInsert(result); onClose() }}
                    className="flex-1 py-2 rounded text-sm font-mono transition-all"
                    style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}44`, color: accentColor }}
                  >
                    ↩ Insert into chapter
                  </button>
                  <button
                    onClick={() => { setResult(''); handleRewrite() }}
                    className="px-4 py-2 rounded text-sm font-mono transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                  >
                    ↺ Again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
