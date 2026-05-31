import { motion, useMotionValue, useTransform } from 'framer-motion'
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
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(mouseY, [-100, 100], [1.5, -1.5])
  const rotateY = useTransform(mouseX, [-100, 100], [-1.5, 1.5])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hover) return
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }
  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={hover ? { scale: 1.015, y: -3 } : undefined}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      style={hover ? { rotateX, rotateY, transformPerspective: 800 } : undefined}
      className={clsx(
        'relative rounded-lg border overflow-hidden',
        onClick && 'cursor-pointer',
        padding,
        className
      )}
    >
      {/* Background layers */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: 'rgba(10,8,18,0.85)',
          backdropFilter: 'blur(16px)',
        }}
      />

      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          border: `1px solid ${glowColor}`,
          opacity: 0,
        }}
        whileHover={hover ? { opacity: 0.25 } : undefined}
        transition={{ duration: 0.2 }}
      />
      <div
        className="absolute inset-0 rounded-lg"
        style={{ border: `1px solid ${glowColor}1a` }}
      />

      {/* Outer shadow glow */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{ boxShadow: `0 0 0 1px ${glowColor}0d, inset 0 1px 0 ${glowColor}15, 0 8px 32px rgba(0,0,0,0.5)` }}
      />

      {/* Top shimmer — animated sweep */}
      <motion.div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${glowColor}66 50%, transparent 100%)` }}
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Hover shimmer sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 40%, ${glowColor}06 50%, transparent 60%)`,
          backgroundSize: '200% 200%',
        }}
        animate={{ backgroundPosition: ['200% 200%', '-200% -200%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />

      {/* Corner accents — animated */}
      {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute w-4 h-4 ${pos}`}
          style={{ borderColor: glowColor }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
        />
      ))}

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
