import { useState, useRef, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function AriaInput({ onSend, disabled, placeholder = 'Ask Aria anything...' }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    ref.current?.focus()
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex gap-2 p-3 border-t" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded px-3 py-2 text-sm font-sans outline-none transition-all"
        style={{
          background: 'rgba(139,92,246,0.06)',
          border: '1px solid rgba(139,92,246,0.2)',
          color: 'rgba(233,213,255,0.9)',
          maxHeight: 120,
        }}
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = Math.min(el.scrollHeight, 120) + 'px'
        }}
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center self-end transition-all"
        style={{
          background: disabled || !value.trim() ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.25)',
          border: '1px solid rgba(139,92,246,0.4)',
          color: disabled || !value.trim() ? 'rgba(139,92,246,0.4)' : '#a78bfa',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
        </svg>
      </motion.button>
    </div>
  )
}
