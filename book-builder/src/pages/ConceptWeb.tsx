import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, useActiveBook } from '../store/bookStore'
import { MainFrame } from '../components/layout/MainFrame'
import { HolographicCard } from '../components/ui/HolographicCard'
import { GlowButton } from '../components/ui/GlowButton'
import type { Concept } from '../types'

const CONCEPT_COLORS = ['#8b5cf6', '#00e5ff', '#ffd700', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

interface NodeProps {
  concept: Concept
  selected: boolean
  linking: boolean
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
  onDoubleClick: () => void
}

function ConceptNodeEl({ concept, selected, linking, onSelect, onDragEnd, onDoubleClick }: NodeProps) {
  const dragStart = useRef<{ mx: number; my: number; cx: number; cy: number } | null>(null)
  const isDragging = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragStart.current = { mx: e.clientX, my: e.clientY, cx: concept.x, cy: concept.y }
    isDragging.current = false

    const handleMove = (me: MouseEvent) => {
      if (!dragStart.current) return
      const dx = me.clientX - dragStart.current.mx
      const dy = me.clientY - dragStart.current.my
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true
      if (isDragging.current) onDragEnd(dragStart.current.cx + dx, dragStart.current.cy + dy)
    }
    const handleUp = () => {
      if (!isDragging.current) onSelect()
      dragStart.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute select-none cursor-pointer"
      style={{ left: concept.x - 60, top: concept.y - 30, width: 120, zIndex: selected ? 20 : 10 }}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="rounded-lg px-3 py-2 text-center transition-all duration-200"
        style={{
          background: `${concept.color}15`,
          border: `${selected || linking ? 2 : 1}px solid ${concept.color}${selected ? 'cc' : '44'}`,
          boxShadow: selected || linking ? `0 0 16px ${concept.color}55` : 'none',
          color: 'rgba(255,255,255,0.9)',
        }}
      >
        <div className="text-xs font-mono font-semibold leading-tight truncate">{concept.title}</div>
        {concept.description && (
          <div className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
            {concept.description}
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface EditPanelProps {
  concept: Concept
  onClose: () => void
}

function EditPanel({ concept, onClose }: EditPanelProps) {
  const book = useActiveBook()
  const { updateConcept, deleteConcept, linkConceptToChapter } = useStore()
  const [title, setTitle] = useState(concept.title)
  const [desc, setDesc] = useState(concept.description)

  const save = () => {
    updateConcept(concept.id, { title, description: desc })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-64 z-50"
    >
      <HolographicCard glowColor={concept.color} padding="p-4">
        <h3 className="font-mono text-xs font-bold mb-3" style={{ color: concept.color }}>
          ◈ EDIT CONCEPT
        </h3>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-2 py-1.5 rounded text-sm font-mono outline-none mb-2"
          style={{ background: `${concept.color}10`, border: `1px solid ${concept.color}30`, color: 'rgba(255,255,255,0.9)' }}
          placeholder="Concept title..."
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          className="w-full px-2 py-1.5 rounded text-xs font-sans outline-none resize-none mb-3"
          style={{ background: `${concept.color}10`, border: `1px solid ${concept.color}20`, color: 'rgba(255,255,255,0.6)' }}
          placeholder="Description..."
        />

        {/* Color */}
        <div className="flex gap-1 mb-3">
          {CONCEPT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateConcept(concept.id, { color: c })}
              className="w-5 h-5 rounded-full transition-transform"
              style={{
                background: c,
                transform: concept.color === c ? 'scale(1.3)' : 'scale(1)',
                boxShadow: concept.color === c ? `0 0 6px ${c}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Link to chapter */}
        {book.chapters.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-mono mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Link to chapter:</p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {book.chapters.sort((a, b) => a.order - b.order).map((ch) => {
                const linked = concept.linkedChapterIds.includes(ch.id)
                return (
                  <button
                    key={ch.id}
                    onClick={() => !linked && linkConceptToChapter(concept.id, ch.id)}
                    className="w-full text-left text-xs px-2 py-1 rounded font-mono truncate transition-all"
                    style={{
                      background: linked ? `${concept.color}20` : 'transparent',
                      border: `1px solid ${linked ? concept.color + '40' : 'rgba(255,255,255,0.08)'}`,
                      color: linked ? concept.color : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {linked ? '✓ ' : '+ '}{ch.title}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <GlowButton size="sm" variant="cyan" onClick={save} className="flex-1 justify-center">Save</GlowButton>
          <GlowButton size="sm" variant="ghost" onClick={onClose}>✕</GlowButton>
          <button
            onClick={() => { deleteConcept(concept.id); onClose() }}
            className="text-xs px-2 rounded font-mono transition-colors"
            style={{ color: 'rgba(239,68,68,0.5)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            del
          </button>
        </div>
      </HolographicCard>
    </motion.div>
  )
}

export function ConceptWeb() {
  const book = useActiveBook()
  const { addConcept, updateConcept, linkConcepts, unlinkConcepts } = useStore()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const selected = book.concepts.find((c) => c.id === selectedId)
  const editing = book.concepts.find((c) => c.id === editingId)

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== canvasRef.current) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (linkingFromId) {
      setLinkingFromId(null)
    } else {
      addConcept(x, y)
    }
    setSelectedId(null)
  }

  const handleNodeSelect = (id: string) => {
    if (linkingFromId && linkingFromId !== id) {
      const isLinked = book.concepts.find((c) => c.id === linkingFromId)?.linkedConceptIds.includes(id)
      if (isLinked) unlinkConcepts(linkingFromId, id)
      else linkConcepts(linkingFromId, id)
      setLinkingFromId(null)
    } else {
      setSelectedId(id === selectedId ? null : id)
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  // Compute link lines
  const renderedLinks = new Set<string>()
  const links: { x1: number; y1: number; x2: number; y2: number; color: string; key: string }[] = []
  for (const c of book.concepts) {
    for (const tid of c.linkedConceptIds) {
      const key = [c.id, tid].sort().join('--')
      if (renderedLinks.has(key)) continue
      renderedLinks.add(key)
      const target = book.concepts.find((x) => x.id === tid)
      if (!target) continue
      links.push({ x1: c.x, y1: c.y, x2: target.x, y2: target.y, color: c.color, key })
    }
  }

  const totalWords = book.chapters.reduce((s, c) => s + c.wordCount, 0)

  return (
    <MainFrame ariaContext={`User is on the Concept Web. ${book.concepts.length} concepts mapped. Book: "${book.title}" with ${book.chapters.length} chapters.`}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="flex-shrink-0 px-4 py-2 border-b flex items-center gap-3" style={{ borderColor: 'rgba(139,92,246,0.12)' }}>
          <span className="text-xs font-mono font-bold tracking-widest" style={{ color: '#8b5cf6' }}>◈ CONCEPT WEB</span>
          <div className="flex-1" />
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {book.concepts.length} nodes · click canvas to add · click node to select · link mode connects nodes
          </span>
          {selected && !linkingFromId && (
            <GlowButton
              size="sm"
              variant="purple"
              onClick={() => { setLinkingFromId(selectedId); setSelectedId(null) }}
            >
              ⇢ Link Mode
            </GlowButton>
          )}
          {linkingFromId && (
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-xs font-mono px-2 py-1 rounded"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}
            >
              linking... click a node · ESC to cancel
            </motion.div>
          )}
          {selected && (
            <GlowButton size="sm" variant="ghost" onClick={() => setEditingId(selectedId)}>✎ Edit</GlowButton>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="absolute inset-0 cursor-crosshair"
            onClick={handleCanvasClick}
            onKeyDown={(e) => { if (e.key === 'Escape') { setLinkingFromId(null); setSelectedId(null) } }}
            tabIndex={0}
          >
            {/* SVG link lines */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
              {links.map((l) => (
                <line
                  key={l.key}
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                  strokeDasharray="6 3"
                />
              ))}
              {/* Active link preview line */}
              {linkingFromId && (() => {
                const from = book.concepts.find((c) => c.id === linkingFromId)
                return from ? (
                  <line
                    x1={from.x} y1={from.y} x2={mousePos.x} y2={mousePos.y}
                    stroke="#8b5cf6" strokeWidth={1.5} strokeOpacity={0.6} strokeDasharray="4 2"
                  />
                ) : null
              })()}
            </svg>

            {/* Nodes */}
            {book.concepts.map((concept) => (
              <ConceptNodeEl
                key={concept.id}
                concept={concept}
                selected={concept.id === selectedId}
                linking={concept.id === linkingFromId}
                onSelect={() => handleNodeSelect(concept.id)}
                onDragEnd={(x, y) => updateConcept(concept.id, { x, y })}
                onDoubleClick={() => setEditingId(concept.id)}
              />
            ))}

            {/* Empty state */}
            {book.concepts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 pointer-events-none">
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-5xl"
                >
                  ◈
                </motion.div>
                <p className="font-mono text-sm" style={{ color: 'rgba(139,92,246,0.5)' }}>
                  Click anywhere to add a concept node
                </p>
              </div>
            )}
          </div>

          {/* Edit panel */}
          <AnimatePresence>
            {editing && (
              <EditPanel
                key={editing.id}
                concept={editing}
                onClose={() => { setEditingId(null); setSelectedId(null) }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Stats bar */}
        <div className="flex-shrink-0 px-4 py-2 border-t flex items-center gap-4" style={{ borderColor: 'rgba(139,92,246,0.08)' }}>
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
            {book.concepts.length} concepts · {links.length} connections · {book.chapters.length} chapters · {totalWords.toLocaleString()} words
          </span>
        </div>
      </div>
    </MainFrame>
  )
}
