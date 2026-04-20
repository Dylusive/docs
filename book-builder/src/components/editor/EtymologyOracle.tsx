import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeEtymology } from '../../api/aria'

interface Props {
  apiKey: string
  bookContext?: string
  accentColor?: string
}

export function EtymologyOracle({ apiKey, bookContext, accentColor = '#00e5ff' }: Props) {
  const [word, setWord] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    const w = word.trim()
    if (!w || !apiKey) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      const analysis = await analyzeEtymology(apiKey, w, bookContext)
      setResult(analysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Oracle unavailable')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: accentColor, opacity: 0.7 }}>◈</span>
        <span className="text-xs font-mono tracking-widest" style={{ color: accentColor, opacity: 0.6 }}>
          ETYMOLOGY ORACLE
        </span>
      </div>

      <div className="flex gap-2">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          placeholder="Enter a word..."
          className="flex-1 px-3 py-2 rounded text-sm font-mono outline-none"
          style={{
            background: `${accentColor}08`,
            border: `1px solid ${accentColor}22`,
            color: 'rgba(255,255,255,0.85)',
          }}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !word.trim() || !apiKey}
          className="px-3 py-2 rounded text-xs font-mono transition-all disabled:opacity-40"
          style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}33`, color: accentColor }}
        >
          {loading ? '...' : 'Reveal'}
        </button>
      </div>

      {!apiKey && (
        <p className="text-xs font-mono" style={{ color: 'rgba(139,92,246,0.5)' }}>
          Set API key to use Oracle
        </p>
      )}

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs font-mono text-center py-4" style={{ color: accentColor, opacity: 0.5 }}>
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
              consulting the archive...
            </motion.span>
          </motion.div>
        )}

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs font-mono" style={{ color: 'rgba(239,68,68,0.6)' }}>
            ⚠ {error}
          </motion.p>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 rounded text-xs leading-relaxed overflow-y-auto"
            style={{
              background: `${accentColor}06`,
              border: `1px solid ${accentColor}18`,
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'Georgia, serif',
              maxHeight: '280px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {result.split('\n').map((line, i) => {
              const isSecret = line.startsWith('SECRET MEANING:')
              return (
                <p key={i} className={`mb-1 ${isSecret ? 'mt-3 font-mono font-bold' : ''}`}
                  style={isSecret ? { color: accentColor, fontStyle: 'normal', fontFamily: 'monospace' } : undefined}>
                  {line}
                </p>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
