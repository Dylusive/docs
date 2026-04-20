import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, useActiveBook } from '../store/bookStore'
import { MainFrame } from '../components/layout/MainFrame'
import { HolographicCard } from '../components/ui/HolographicCard'
import { GlowButton } from '../components/ui/GlowButton'
import type { Character } from '../types'

const TRAIT_COLORS = ['#00e5ff', '#8b5cf6', '#ffd700', '#dc143c', '#22c55e', '#f97316']

function CharacterCard({
  character,
  onEdit,
  onDelete,
}: {
  character: Character
  onEdit: () => void
  onDelete: () => void
}) {
  const [hovering, setHovering] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onHoverStart={() => setHovering(true)}
      onHoverEnd={() => setHovering(false)}
    >
      <HolographicCard hover glowColor={character.color} onClick={onEdit} padding="p-0">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: character.color, boxShadow: `0 0 8px ${character.color}66` }}
              />
              <span className="font-mono font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {character.name}
              </span>
            </div>
            <AnimatePresence>
              {hovering && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ color: 'rgba(239,68,68,0.6)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  ✕
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {character.role && (
            <p className="text-xs font-mono mb-2" style={{ color: character.color, opacity: 0.7 }}>
              {character.role}
            </p>
          )}

          {character.description && (
            <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {character.description}
            </p>
          )}

          {character.traits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {character.traits.map((t, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{ background: `${character.color}15`, border: `1px solid ${character.color}25`, color: character.color, opacity: 0.7 }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </HolographicCard>
    </motion.div>
  )
}

function CharacterEditor({
  character,
  onSave,
  onCancel,
}: {
  character: Partial<Character>
  onSave: (fields: Partial<Character>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<Character>>({
    name: '',
    role: '',
    description: '',
    traits: [],
    color: '#00e5ff',
    notes: '',
    ...character,
  })
  const [traitInput, setTraitInput] = useState('')

  const addTrait = () => {
    const t = traitInput.trim()
    if (!t) return
    setForm((f) => ({ ...f, traits: [...(f.traits ?? []), t] }))
    setTraitInput('')
  }

  const removeTrait = (i: number) =>
    setForm((f) => ({ ...f, traits: (f.traits ?? []).filter((_, idx) => idx !== i) }))

  const inputStyle = {
    background: 'rgba(0,229,255,0.05)',
    border: '1px solid rgba(0,229,255,0.2)',
    color: 'rgba(255,255,255,0.9)',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(8px)' }}
    >
      <HolographicCard className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" padding="p-6">
        <h2 className="font-mono font-bold text-sm mb-6" style={{ color: form.color ?? '#00e5ff' }}>
          ✦ {character.id ? 'EDIT' : 'NEW'} CHARACTER
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Name *</label>
              <input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded text-sm outline-none" style={inputStyle} placeholder="Character name" />
            </div>
            <div>
              <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Role</label>
              <input value={form.role ?? ''} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 rounded text-sm outline-none" style={inputStyle} placeholder="Protagonist / Mentor..." />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.color ?? '#00e5ff'} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-10 h-8 rounded cursor-pointer" />
              <div className="flex gap-2">
                {TRAIT_COLORS.map((c) => (
                  <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, boxShadow: form.color === c ? `0 0 8px ${c}` : 'none' }} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Description</label>
            <textarea value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full px-3 py-2 rounded text-sm outline-none resize-none" style={inputStyle}
              placeholder="Who is this character? What drives them?" />
          </div>

          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Traits</label>
            <div className="flex gap-2 mb-2">
              <input value={traitInput} onChange={(e) => setTraitInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTrait()}
                className="flex-1 px-3 py-2 rounded text-sm outline-none" style={inputStyle}
                placeholder="Add a trait (press Enter)" />
              <button onClick={addTrait} className="px-3 py-2 rounded text-xs font-mono"
                style={{ background: `${form.color ?? '#00e5ff'}15`, border: `1px solid ${form.color ?? '#00e5ff'}33`, color: form.color ?? '#00e5ff' }}>
                +
              </button>
            </div>
            {(form.traits ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(form.traits ?? []).map((t, i) => (
                  <button key={i} onClick={() => removeTrait(i)}
                    className="text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1 hover:opacity-70"
                    style={{ background: `${form.color ?? '#00e5ff'}15`, border: `1px solid ${form.color ?? '#00e5ff'}25`, color: form.color ?? '#00e5ff' }}>
                    {t} <span>✕</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono mb-1" style={{ color: 'rgba(0,229,255,0.6)' }}>Notes</label>
            <textarea value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3} className="w-full px-3 py-2 rounded text-sm outline-none resize-none" style={inputStyle}
              placeholder="Arc, secrets, symbolic role, connections..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <GlowButton variant="ghost" onClick={onCancel}>Cancel</GlowButton>
          <GlowButton onClick={() => onSave(form)} disabled={!form.name?.trim()}>Save Character</GlowButton>
        </div>
      </HolographicCard>
    </motion.div>
  )
}

export function CharacterBible() {
  const book = useActiveBook()
  const { addCharacter, updateCharacter, deleteCharacter } = useStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const handleCreate = (fields: Partial<Character>) => {
    addCharacter(fields)
    setCreating(false)
  }

  const handleUpdate = (id: string, fields: Partial<Character>) => {
    updateCharacter(id, fields)
    setEditingId(null)
  }

  const editingCharacter = editingId ? book.characters.find((c) => c.id === editingId) : null

  return (
    <MainFrame ariaContext={`User is in the Character Bible. ${book.characters.length} characters defined.`}>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-mono font-bold" style={{ color: '#ffd700', textShadow: '0 0 20px rgba(255,215,0,0.4)' }}>
                Character Bible
              </h1>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {book.characters.length} character{book.characters.length !== 1 ? 's' : ''} · {book.title}
              </p>
            </div>
            <GlowButton onClick={() => setCreating(true)} icon={<span>+</span>}>
              New Character
            </GlowButton>
          </div>
        </div>

        <div className="flex-shrink-0 mx-6 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,215,0,0.3), transparent)' }} />

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {book.characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl">
                👤
              </motion.div>
              <p className="font-mono text-sm text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                No characters defined yet.<br />
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
                  Aria will use your character bible when writing and suggesting.
                </span>
              </p>
              <GlowButton onClick={() => setCreating(true)} icon={<span>+</span>}>Add First Character</GlowButton>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              <AnimatePresence>
                {book.characters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onEdit={() => setEditingId(character.id)}
                    onDelete={() => deleteCharacter(character.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {creating && (
        <CharacterEditor character={{}} onSave={handleCreate} onCancel={() => setCreating(false)} />
      )}
      {editingCharacter && (
        <CharacterEditor
          character={editingCharacter}
          onSave={(fields) => handleUpdate(editingCharacter.id, fields)}
          onCancel={() => setEditingId(null)}
        />
      )}
    </MainFrame>
  )
}
