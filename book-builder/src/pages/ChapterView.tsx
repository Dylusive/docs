import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/bookStore'
import { MainFrame } from '../components/layout/MainFrame'
import { HolographicCard } from '../components/ui/HolographicCard'
import { GlowButton } from '../components/ui/GlowButton'

const ACCENT_PRESETS = [
  '#00e5ff', '#8b5cf6', '#ffd700', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
]

function RichTextToolbar({ onFormat, accentColor }: { onFormat: (cmd: string, val?: string) => void; accentColor: string }) {
  const tools = [
    { label: 'B', cmd: 'bold', title: 'Bold' },
    { label: 'I', cmd: 'italic', title: 'Italic' },
    { label: 'U', cmd: 'underline', title: 'Underline' },
  ]
  const blocks = [
    { label: 'H1', cmd: 'formatBlock', val: 'H1' },
    { label: 'H2', cmd: 'formatBlock', val: 'H2' },
    { label: 'H3', cmd: 'formatBlock', val: 'H3' },
    { label: '¶', cmd: 'formatBlock', val: 'P', title: 'Paragraph' },
    { label: '❝', cmd: 'formatBlock', val: 'BLOCKQUOTE', title: 'Quote' },
  ]

  return (
    <div
      className="flex flex-wrap items-center gap-1 px-3 py-2 border-b"
      style={{ borderColor: `${accentColor}15`, background: 'rgba(0,0,0,0.3)' }}
    >
      {tools.map((t) => (
        <button
          key={t.cmd}
          title={t.title}
          onMouseDown={(e) => { e.preventDefault(); onFormat(t.cmd) }}
          className="w-7 h-7 rounded text-xs font-mono font-bold transition-all"
          style={{
            border: `1px solid ${accentColor}22`,
            color: `${accentColor}99`,
            background: 'transparent',
          }}
        >
          {t.label}
        </button>
      ))}

      <div className="w-px h-4 mx-1" style={{ background: `${accentColor}20` }} />

      {blocks.map((b) => (
        <button
          key={b.val}
          title={b.title || b.label}
          onMouseDown={(e) => { e.preventDefault(); onFormat(b.cmd, b.val) }}
          className="px-2 h-7 rounded text-xs font-mono transition-all"
          style={{
            border: `1px solid ${accentColor}22`,
            color: `${accentColor}99`,
            background: 'transparent',
          }}
        >
          {b.label}
        </button>
      ))}

      <div className="w-px h-4 mx-1" style={{ background: `${accentColor}20` }} />

      {/* Text align */}
      {(['left', 'center', 'right'] as const).map((align) => (
        <button
          key={align}
          title={`Align ${align}`}
          onMouseDown={(e) => { e.preventDefault(); onFormat(`justify${align.charAt(0).toUpperCase()}${align.slice(1)}`) }}
          className="w-7 h-7 rounded text-xs transition-all"
          style={{
            border: `1px solid ${accentColor}22`,
            color: `${accentColor}99`,
            background: 'transparent',
          }}
        >
          {align === 'left' ? '⫷' : align === 'center' ? '⫶' : '⫸'}
        </button>
      ))}
    </div>
  )
}

function PlacedImageBlock({ placedId, chapterId, accentColor }: { placedId: string; chapterId: string; accentColor: string }) {
  const { book, updatePlacedImage, removePlacedImage, getImage } = useStore()
  const chapter = book.chapters.find((c) => c.id === chapterId)
  const placed = chapter?.placedImages.find((p) => p.id === placedId)
  const image = placed ? getImage(placed.imageId) : undefined

  if (!placed || !image) return null

  return (
    <div
      className="my-4 group relative rounded overflow-hidden"
      style={{
        maxWidth: `${placed.widthPercent}%`,
        margin: placed.alignment === 'center' ? '16px auto' : placed.alignment === 'right' ? '16px 0 16px auto' : '16px auto 16px 0',
        border: `1px solid ${accentColor}22`,
      }}
    >
      <img src={image.dataUrl} alt={image.name} className="w-full h-auto block" />
      {placed.caption && (
        <p className="px-2 py-1 text-xs text-center font-mono" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.5)' }}>
          {placed.caption}
        </p>
      )}

      {/* Controls on hover */}
      <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex gap-1 flex-wrap"
        style={{ background: 'rgba(0,0,0,0.8)' }}>
        <select
          value={placed.alignment}
          onChange={(e) => updatePlacedImage(chapterId, placedId, { alignment: e.target.value as any })}
          className="text-xs font-mono px-1 py-0.5 rounded"
          style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff' }}
        >
          {['left', 'center', 'right', 'float-left', 'float-right'].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          type="range" min={20} max={100} value={placed.widthPercent}
          onChange={(e) => updatePlacedImage(chapterId, placedId, { widthPercent: +e.target.value })}
          className="flex-1 min-w-16"
        />
        <button onClick={() => removePlacedImage(chapterId, placedId)}
          className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          ✕
        </button>
      </div>
    </div>
  )
}

export function ChapterView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { book, updateChapter, addChapter, deleteChapter, addPlacedImage } = useStore()

  const chapter = book.chapters.find((c) => c.id === id)
  const sorted = [...book.chapters].sort((a, b) => a.order - b.order)

  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const [showImagePicker, setShowImagePicker] = useState(false)

  useEffect(() => {
    if (editorRef.current && chapter) {
      if (editorRef.current.innerHTML !== chapter.content) {
        editorRef.current.innerHTML = chapter.content
      }
    }
  }, [id])

  const handleInput = useCallback(() => {
    if (!editorRef.current || !id) return
    const html = editorRef.current.innerHTML
    const text = editorRef.current.innerText || ''
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateChapter(id, { content: html, wordCount })
    }, 500)
  }, [id, updateChapter])

  const handleFormat = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
    handleInput()
  }

  const handleAddImage = (imageId: string) => {
    if (!id) return
    addPlacedImage(id, imageId)
    setShowImagePicker(false)
  }

  if (!chapter) {
    return (
      <MainFrame>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="font-mono text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Chapter not found.</p>
            <GlowButton onClick={() => navigate('/')}>← Back</GlowButton>
          </div>
        </div>
      </MainFrame>
    )
  }

  return (
    <MainFrame ariaContext={`User is editing Chapter ${chapter.order + 1}: "${chapter.title}". Content preview: ${chapter.content.replace(/<[^>]+>/g, '').slice(0, 200)}`}>
      <div className="flex h-full overflow-hidden">
        {/* Chapter sidebar */}
        <div
          className="w-52 flex-shrink-0 flex flex-col border-r overflow-hidden"
          style={{ borderColor: 'rgba(0,229,255,0.08)', background: 'rgba(0,0,0,0.3)' }}
        >
          <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(0,229,255,0.08)' }}>
            <button
              onClick={() => navigate('/')}
              className="text-xs font-mono flex items-center gap-1 mb-3 transition-colors"
              style={{ color: 'rgba(0,229,255,0.5)' }}
            >
              ← Command Center
            </button>
            <GlowButton size="sm" onClick={() => { const newId = addChapter(); navigate(`/chapter/${newId}`) }} className="w-full justify-center">
              + Chapter
            </GlowButton>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sorted.map((ch) => (
              <motion.button
                key={ch.id}
                onClick={() => navigate(`/chapter/${ch.id}`)}
                whileHover={{ x: 2 }}
                className="w-full text-left px-2 py-2 rounded text-xs font-mono transition-all"
                style={{
                  background: ch.id === id ? `${ch.accentColor}14` : 'transparent',
                  border: `1px solid ${ch.id === id ? ch.accentColor + '33' : 'transparent'}`,
                  color: ch.id === id ? ch.accentColor : 'rgba(255,255,255,0.35)',
                }}
              >
                <span className="block text-xs mb-0.5" style={{ opacity: 0.5 }}>
                  CH {String(ch.order + 1).padStart(2, '0')}
                </span>
                <span className="block truncate">{ch.title}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chapter header */}
          <div className="flex-shrink-0 px-6 pt-4 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
                background: `${chapter.accentColor}15`,
                border: `1px solid ${chapter.accentColor}30`,
                color: chapter.accentColor,
              }}>
                CH {String(chapter.order + 1).padStart(2, '0')}
              </span>

              {/* Color picker */}
              <div className="flex items-center gap-1">
                {ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateChapter(chapter.id, { accentColor: color })}
                    className="w-4 h-4 rounded-full transition-transform"
                    style={{
                      background: color,
                      transform: chapter.accentColor === color ? 'scale(1.3)' : 'scale(1)',
                      boxShadow: chapter.accentColor === color ? `0 0 6px ${color}` : 'none',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={chapter.accentColor}
                  onChange={(e) => updateChapter(chapter.id, { accentColor: e.target.value })}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ border: 'none', background: 'none' }}
                  title="Custom color"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <GlowButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowImagePicker(true)}
                  icon={<span>🖼</span>}
                >
                  Add Image
                </GlowButton>
                <GlowButton
                  size="sm"
                  variant="ghost"
                  onClick={() => { deleteChapter(chapter.id); navigate('/') }}
                  className="!text-red-400"
                >
                  Delete
                </GlowButton>
              </div>
            </div>

            <input
              value={chapter.title}
              onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
              className="w-full bg-transparent text-xl font-mono font-bold outline-none"
              style={{ color: chapter.accentColor, textShadow: `0 0 20px ${chapter.accentColor}44` }}
              placeholder="Chapter title..."
            />
          </div>

          {/* Divider */}
          <div className="flex-shrink-0 mx-6 h-px" style={{ background: `linear-gradient(90deg, ${chapter.accentColor}44, transparent)` }} />

          {/* Editor */}
          <HolographicCard
            glowColor={chapter.accentColor}
            className="flex-1 mx-6 my-4 flex flex-col overflow-hidden"
            padding="p-0"
          >
            <RichTextToolbar onFormat={handleFormat} accentColor={chapter.accentColor} />

            <div className="flex-1 overflow-y-auto p-6">
              {/* Placed images at top */}
              {chapter.placedImages.length > 0 && (
                <div className="mb-4">
                  {chapter.placedImages.map((p) => (
                    <PlacedImageBlock key={p.id} placedId={p.id} chapterId={chapter.id} accentColor={chapter.accentColor} />
                  ))}
                </div>
              )}

              {/* Rich text area */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                className="min-h-full outline-none leading-relaxed text-sm"
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: 'Inter, sans-serif',
                  caretColor: chapter.accentColor,
                }}
                data-placeholder="Begin writing your chapter here..."
              />
            </div>
          </HolographicCard>

          {/* Word count */}
          <div className="flex-shrink-0 px-6 pb-2 flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {chapter.wordCount.toLocaleString()} words
            </span>
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
              auto-saving...
            </span>
          </div>
        </div>
      </div>

      {/* Image picker modal */}
      <AnimatePresence>
        {showImagePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowImagePicker(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <HolographicCard className="w-96 max-h-96 overflow-y-auto" padding="p-4">
                <h3 className="font-mono text-sm font-bold mb-3" style={{ color: '#00e5ff' }}>Select Image</h3>
                {book.imageFolders.every((f) => f.images.length === 0) ? (
                  <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    No images yet. Upload some in the Image Vault.
                  </p>
                ) : (
                  book.imageFolders.map((folder) =>
                    folder.images.length > 0 ? (
                      <div key={folder.id} className="mb-4">
                        <p className="text-xs font-mono mb-2" style={{ color: 'rgba(0,229,255,0.5)' }}>{folder.name}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {folder.images.map((img) => (
                            <button
                              key={img.id}
                              onClick={() => handleAddImage(img.id)}
                              className="aspect-square rounded overflow-hidden border transition-all hover:scale-105"
                              style={{ borderColor: 'rgba(0,229,255,0.2)' }}
                            >
                              <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )
                )}
              </HolographicCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: rgba(255,255,255,0.15);
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; color: ${chapter.accentColor}; }
        [contenteditable] h2 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; color: rgba(255,255,255,0.8); }
        [contenteditable] h3 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; color: rgba(255,255,255,0.7); }
        [contenteditable] blockquote { border-left: 3px solid ${chapter.accentColor}; padding-left: 1em; margin: 0.5em 0; color: rgba(255,255,255,0.5); font-style: italic; }
        [contenteditable] p { margin: 0.5em 0; }
        [contenteditable] b, [contenteditable] strong { color: rgba(255,255,255,0.95); }
      `}</style>
    </MainFrame>
  )
}
