import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  glowColor?: string
  onClick?: () => void
  hover?: boolean
  padding?: string
}

export function HolographicCard({ children, className, glowColor = '#00e5ff', onClick, hover = false, padding = 'p-4' }: Props) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={clsx(
        'relative rounded-lg border overflow-hidden',
        onClick && 'cursor-pointer',
        padding,
        className
      )}
      style={{
        background: 'rgba(13,13,26,0.8)',
        borderColor: `${glowColor}22`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 0 1px ${glowColor}11, inset 0 1px 0 ${glowColor}18`,
      }}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: glowColor, opacity: 0.6 }} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: glowColor, opacity: 0.6 }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: glowColor, opacity: 0.6 }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: glowColor, opacity: 0.6 }} />

      {/* Top shimmer line */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${glowColor}44, transparent)` }} />

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
