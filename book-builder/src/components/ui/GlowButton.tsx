import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'cyan' | 'purple' | 'gold' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

const VARIANTS = {
  cyan: {
    bg: 'rgba(0,229,255,0.08)',
    bgHover: 'rgba(0,229,255,0.16)',
    border: 'rgba(0,229,255,0.35)',
    borderHover: 'rgba(0,229,255,0.6)',
    text: '#00e5ff',
    glow: 'rgba(0,229,255,0.25)',
    glowHover: 'rgba(0,229,255,0.5)',
    shimmer: '#00e5ff',
  },
  purple: {
    bg: 'rgba(139,92,246,0.1)',
    bgHover: 'rgba(139,92,246,0.2)',
    border: 'rgba(139,92,246,0.35)',
    borderHover: 'rgba(139,92,246,0.6)',
    text: '#a78bfa',
    glow: 'rgba(139,92,246,0.25)',
    glowHover: 'rgba(139,92,246,0.5)',
    shimmer: '#a78bfa',
  },
  gold: {
    bg: 'rgba(255,215,0,0.07)',
    bgHover: 'rgba(255,215,0,0.14)',
    border: 'rgba(255,215,0,0.3)',
    borderHover: 'rgba(255,215,0,0.55)',
    text: '#ffd700',
    glow: 'rgba(255,215,0,0.2)',
    glowHover: 'rgba(255,215,0,0.45)',
    shimmer: '#ffd700',
  },
  ghost: {
    bg: 'rgba(255,255,255,0.03)',
    bgHover: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.1)',
    borderHover: 'rgba(255,255,255,0.2)',
    text: 'rgba(255,255,255,0.55)',
    glow: 'transparent',
    glowHover: 'rgba(255,255,255,0.08)',
    shimmer: 'rgba(255,255,255,0.4)',
  },
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function GlowButton({ children, variant = 'cyan', size = 'md', icon, className, disabled, ...rest }: Props) {
  const v = VARIANTS[variant]

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.96, y: 0 }}
      className={clsx(
        'relative inline-flex items-center gap-2 rounded font-mono font-medium transition-colors duration-200 select-none overflow-hidden',
        SIZES[size],
        disabled && 'opacity-35 cursor-not-allowed',
        className
      )}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.text,
        boxShadow: disabled ? 'none' : `0 0 16px ${v.glow}, inset 0 1px 0 ${v.shimmer}18`,
      }}
      disabled={disabled}
      {...(rest as any)}
    >
      {/* Animated shimmer sweep across button */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 40%, ${v.shimmer}18 50%, transparent 60%)`,
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        />
      )}

      {/* Top edge gleam */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${v.shimmer}44, transparent)` }}
      />

      {icon && <span className="relative flex-shrink-0 z-10">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
