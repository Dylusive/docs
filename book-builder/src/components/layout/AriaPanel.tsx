import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/bookStore'
import { streamAriaResponse } from '../../api/aria'
import { AriaChat } from '../aria/AriaChat'
import { AriaInput } from '../aria/AriaInput'
import { AriaAvatar } from '../aria/AriaAvatar'

interface Props {
  contextNote?: string
}

export function AriaPanel({ contextNote }: Props) {
  const { book, ariaMessages, ariaOpen, apiKey, addAriaMessage, updateAriaMessage, clearAriaMessages } = useStore()
  const [streaming, setStreaming] = useState(false)

  const isStreaming = ariaMessages.some((m) => m.isStreaming)

  const handleSend = async (text: string) => {
    if (streaming || !apiKey) return

    addAriaMessage({ role: 'user', content: text })
    const ariaId = addAriaMessage({ role: 'aria', content: '', isStreaming: true })

    setStreaming(true)
    let accumulated = ''

    try {
      await streamAriaResponse(
        apiKey,
        book,
        [...ariaMessages, { id: '', role: 'user' as const, content: text, timestamp: '' }],
        (chunk) => {
          accumulated += chunk
          updateAriaMessage(ariaId, accumulated, true)
        },
        contextNote
      )
      updateAriaMessage(ariaId, accumulated, false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'The Record is unavailable right now.'
      updateAriaMessage(ariaId, `⚠ ${msg}`, false)
    } finally {
      setStreaming(false)
    }
  }

  return (
    <AnimatePresence>
      {ariaOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex-shrink-0 flex flex-col border-l overflow-hidden"
          style={{
            borderColor: 'rgba(139,92,246,0.2)',
            background: 'rgba(8,8,22,0.95)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
            style={{ borderColor: 'rgba(139,92,246,0.15)' }}
          >
            <div className="flex items-center gap-2">
              <AriaAvatar size={24} speaking={isStreaming} />
              <span className="text-xs font-mono font-semibold tracking-widest" style={{ color: '#a78bfa' }}>
                ARIA
              </span>
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-xs font-mono"
                  style={{ color: 'rgba(139,92,246,0.6)' }}
                >
                  channeling...
                </motion.span>
              )}
            </div>
            <button
              onClick={clearAriaMessages}
              className="text-xs font-mono transition-colors"
              style={{ color: 'rgba(139,92,246,0.3)' }}
              title="Clear conversation"
            >
              ⊘ clear
            </button>
          </div>

          {/* No API key notice */}
          {!apiKey && (
            <div className="p-3 m-3 rounded border text-xs font-mono" style={{ borderColor: 'rgba(139,92,246,0.2)', color: 'rgba(139,92,246,0.6)', background: 'rgba(139,92,246,0.05)' }}>
              No API key set. Go to{' '}
              <span style={{ color: '#a78bfa' }}>⚙ Settings</span>{' '}
              to connect Aria.
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <AriaChat messages={ariaMessages} />
          </div>

          {/* Input */}
          <AriaInput onSend={handleSend} disabled={streaming || !apiKey} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
