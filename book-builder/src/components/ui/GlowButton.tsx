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
    bg: 'rgba(0,229,255,0.1)',
    border: '#00e5ff',
    text: '#00e5ff',
    glow: 'rgba(0,229,255,0.3)',
    hover: 'rgba(0,229,255,0.2)',
  },
  purple: {
    bg: 'rgba(139,92,246,0.1)',
    border: '#8b5cf6',
    text: '#a78bfa',
    glow: 'rgba(139,92,246,0.3)',
    hover: 'rgba(139,92,246,0.2)',
  },
  gold: {
    bg: 'rgba(255,215,0,0.08)',
    border: '#ffd700',
    text: '#ffd700',
    glow: 'rgba(255,215,0,0.3)',
    hover: 'rgba(255,215,0,0.15)',
  },
  ghost: {
    bg: 'transparent',
    border: 'rgba(255,255,255,0.1)',
    text: 'rgba(255,255,255,0.6)',
    glow: 'transparent',
    hover: 'rgba(255,255,255,0.05)',
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
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={clsx(
        'relative inline-flex items-center gap-2 rounded font-mono font-medium transition-all duration-200 select-none',
        SIZES[size],
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}44`,
        color: v.text,
        boxShadow: disabled ? 'none' : `0 0 12px ${v.glow}`,
      }}
      disabled={disabled}
      {...(rest as any)}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.button>
  )
}
