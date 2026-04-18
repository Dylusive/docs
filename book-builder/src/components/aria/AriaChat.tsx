import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AriaAvatar } from './AriaAvatar'
import type { AriaMessage } from '../../types'

interface Props {
  messages: AriaMessage[]
}

export function AriaChat({ messages }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
        <AriaAvatar size={64} />
        <p className="text-center text-sm font-mono" style={{ color: 'rgba(139,92,246,0.7)' }}>
          I am Aria. The Record stirs.<br />Ask me anything about your work.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto h-full">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.role === 'aria' && <AriaAvatar size={28} speaking={msg.isStreaming} />}

            <div
              className="max-w-[85%] rounded-lg px-3 py-2 text-sm font-sans leading-relaxed"
              style={
                msg.role === 'user'
                  ? {
                      background: 'rgba(0,229,255,0.08)',
                      border: '1px solid rgba(0,229,255,0.2)',
                      color: 'rgba(224,240,255,0.9)',
                    }
                  : {
                      background: 'rgba(139,92,246,0.08)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      color: 'rgba(233,213,255,0.9)',
                    }
              }
            >
              {msg.content || (msg.isStreaming ? '' : '')}
              {msg.isStreaming && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ color: '#8b5cf6' }}
                >
                  ▌
                </motion.span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  )
}
