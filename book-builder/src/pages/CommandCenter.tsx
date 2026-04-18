import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/bookStore'
import { MainFrame } from '../components/layout/MainFrame'
import { HolographicCard } from '../components/ui/HolographicCard'
import { GlowButton } from '../components/ui/GlowButton'

function ChapterCard({ chapter, index, onEdit, onDelete }: {
  chapter: { id: string; title: string; order: number; wordCount: number; accentColor: string; content: string }
  index: number
  onEdit: () => void
  onDelete: () => void
}) {
  const [hovering, setHovering] = useState(false)
  const preview = chapter.content.replace(/<[^>]+>/g, '').slice(0, 80)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      onHoverStart={() => setHovering(true)}
      onHoverEnd={() => setHovering(false)}
    >
      <HolographicCard hover glowColor={chapter.accentColor} onClick={onEdit} padding="p-0">
        <div className="p-4">
          {/* Chapter number badge */}
          <div className="flex items-start justify-between mb-3">
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{
                background: `${chapter.accentColor}18`,
                border: `1px solid ${chapter.accentColor}33`,
                color: chapter.accentColor,
              }}
            >
              CH {String(chapter.order + 1).padStart(2, '0')}
            </span>
            <AnimatePresence>
              {hovering && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className="text-xs font-mono px-1.5 py-0.5 rounded transition-colors"
                  style={{ color: 'rgba(239,68,68,0.6)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  ✕
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <h3 className="font-mono font-semibold text-sm mb-2 leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {chapter.title}
          </h3>

          {preview ? (
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {preview}...
            </p>
          ) : (
            <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Blank page awaits...
            </p>
          )}
        </div>

        <div
          className="px-4 py-2 border-t flex items-center justify-between"
          style={{ borderColor: `${chapter.accentColor}15` }}
        >
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {chapter.wordCount.toLocaleString()} words
          </span>
          <span className="text-xs font-mono" style={{ color: chapter.accentColor, opacity: 0.5 }}>
            edit →
          </span>
        </div>
      </HolographicCard>
    </motion.div>
  )
}

function BookSettings() {
  const { book, updateBook, apiKey, setApiKey } = useStore()
  const [editing, setEditing] = useState(false)
  const [showKey, setShowKey] = useState(false)

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-mono transition-colors"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          ⚙ settings
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <HolographicCard className="w-full max-w-md mx-4" padding="p-6">
        <h2 className="font-mono font-bold text-sm mb-6" style={{ color: '#00e5ff' }}>
          ✦ CODEX SETTINGS
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Book Title</label>
            <input
              value={book.title}
              onChange={(e) => updateBook({ title: e.target.value })}
              className="w-full px-3 py-2 rounded text-sm font-sans outline-none"
              style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Author</label>
            <input
              value={book.author}
              onChange={(e) => updateBook({ author: e.target.value })}
              className="w-full px-3 py-2 rounded text-sm font-sans outline-none"
              style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Synopsis</label>
            <textarea
              value={book.synopsis}
              onChange={(e) => updateBook({ synopsis: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded text-sm font-sans outline-none resize-none"
              style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Book Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={book.coverColor}
                onChange={(e) => updateBook({ coverColor: e.target.value })}
                className="w-10 h-8 rounded cursor-pointer"
                style={{ background: 'none', border: '1px solid rgba(0,229,255,0.2)' }}
              />
              <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{book.coverColor}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(139,92,246,0.8)' }}>
              Anthropic API Key
              <span className="ml-1 text-xs" style={{ color: 'rgba(139,92,246,0.4)' }}>(powers Aria)</span>
            </label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 px-3 py-2 rounded text-sm font-mono outline-none"
                style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(233,213,255,0.9)' }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-2 text-xs font-mono"
                style={{ color: 'rgba(139,92,246,0.5)' }}
              >
                {showKey ? 'hide' : 'show'}
              </button>
            </div>
            <p className="mt-1 text-xs font-mono" style={{ color: 'rgba(139,92,246,0.35)' }}>
              Get yours free at console.anthropic.com
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <GlowButton onClick={() => setEditing(false)}>Save & Close</GlowButton>
        </div>
      </HolographicCard>
    </motion.div>
  )
}

export function CommandCenter() {
  const { book, addChapter, deleteChapter } = useStore()
  const navigate = useNavigate()

  const totalWords = book.chapters.reduce((s, c) => s + c.wordCount, 0)
  const sorted = [...book.chapters].sort((a, b) => a.order - b.order)

  const handleAddChapter = () => {
    const id = addChapter()
    navigate(`/chapter/${id}`)
  }

  return (
    <MainFrame ariaContext={`User is on the main dashboard. Book has ${book.chapters.length} chapters and ${totalWords} words.`}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Top header bar */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1
                className="text-2xl font-mono font-bold tracking-tight"
                style={{ color: '#ffd700', textShadow: '0 0 20px rgba(255,215,0,0.4)' }}
              >
                {book.title}
              </h1>
              <p className="text-sm font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                by {book.author}
              </p>
            </div>

            <div className="flex items-center gap-6">
              {/* Stats */}
              <div className="flex gap-4">
                {[
                  { label: 'CHAPTERS', value: book.chapters.length },
                  { label: 'WORDS', value: totalWords.toLocaleString() },
                  { label: 'CONCEPTS', value: book.concepts.length },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-lg font-mono font-bold" style={{ color: '#00e5ff' }}>{stat.value}</div>
                    <div className="text-xs font-mono tracking-widest" style={{ color: 'rgba(0,229,255,0.4)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <GlowButton onClick={handleAddChapter} icon={<span>+</span>}>
                  New Chapter
                </GlowButton>
                <BookSettings />
              </div>
            </div>
          </div>

          {book.synopsis && (
            <p className="mt-3 text-sm max-w-2xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {book.synopsis}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="flex-shrink-0 mx-6 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,229,255,0.3), transparent)' }} />

        {/* Chapter grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-6xl"
              >
                📖
              </motion.div>
              <div className="text-center">
                <p className="font-mono text-sm mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  The Record awaits your first words.
                </p>
                <p className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Create your first chapter to begin.
                </p>
              </div>
              <GlowButton size="lg" onClick={handleAddChapter} icon={<span>+</span>}>
                Begin Writing
              </GlowButton>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              <AnimatePresence>
                {sorted.map((chapter, i) => (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    index={i}
                    onEdit={() => navigate(`/chapter/${chapter.id}`)}
                    onDelete={() => deleteChapter(chapter.id)}
                  />
                ))}
              </AnimatePresence>

              {/* Add chapter card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sorted.length * 0.05 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddChapter}
                  className="w-full h-full min-h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-200"
                  style={{ borderColor: 'rgba(0,229,255,0.15)', color: 'rgba(0,229,255,0.3)' }}
                >
                  <span className="text-2xl">+</span>
                  <span className="text-xs font-mono">New Chapter</span>
                </motion.button>
              </motion.div>
            </div>
          )}
        </div>

        {/* Bottom status bar */}
        <div
          className="flex-shrink-0 px-6 py-2 border-t flex items-center justify-between"
          style={{ borderColor: 'rgba(0,229,255,0.08)' }}
        >
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
            ✦ AKASHIC CODEX
          </span>
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
            last saved {new Date(book.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </MainFrame>
  )
}
