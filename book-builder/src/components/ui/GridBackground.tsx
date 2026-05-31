import { motion } from 'framer-motion'
import { useMemo } from 'react'

const SIGILS = ['✦', '◈', '∴', '⚡', '🌕', '⬡', '✧', '⊹']

export function GridBackground() {
  const particles = useMemo(() =>
    Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      color: i % 5 === 0 ? '#ffd700' : i % 5 === 1 ? '#dc143c' : i % 5 === 2 ? '#8b5cf6' : i % 5 === 3 ? '#00e5ff' : '#c084fc',
      duration: 5 + Math.random() * 10,
      delay: Math.random() * 8,
      drift: (Math.random() - 0.5) * 60,
    })), [])

  const sigils = useMemo(() =>
    Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      glyph: SIGILS[i % SIGILS.length],
      duration: 12 + Math.random() * 16,
      delay: Math.random() * 8,
    })), [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>

      {/* Void base */}
      <div className="absolute inset-0" style={{ background: '#050508' }} />

      {/* Deep nebula layers */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 15% 10%, rgba(139,0,0,0.12) 0%, transparent 60%)' }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.04, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 85% 80%, rgba(76,0,80,0.14) 0%, transparent 55%)' }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.06, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,0,40,0.4) 0%, transparent 65%)' }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Fine grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(rgba(220,20,60,0.025) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(220,20,60,0.025) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '48px 48px',
        }}
      />

      {/* Coarser accent grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '192px 192px',
        }}
      />

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-64" style={{ background: 'linear-gradient(to top, #050508 0%, transparent 100%)' }} />
      {/* Top vignette */}
      <div className="absolute inset-x-0 top-0 h-32" style={{ background: 'linear-gradient(to bottom, rgba(5,5,8,0.6) 0%, transparent 100%)' }} />
      {/* Side vignettes */}
      <div className="absolute inset-y-0 left-0 w-32" style={{ background: 'linear-gradient(to right, rgba(5,5,8,0.5) 0%, transparent 100%)' }} />
      <div className="absolute inset-y-0 right-0 w-32" style={{ background: 'linear-gradient(to left, rgba(5,5,8,0.5) 0%, transparent 100%)' }} />

      {/* Breath glow — central pulse */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '60vw', height: '60vw',
          left: '20vw', top: '20vh',
          background: 'radial-gradient(circle, rgba(139,0,0,0.04) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Accent glow — upper left */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '40vw', height: '40vw',
          left: '-10vw', top: '-10vh',
          background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Accent glow — lower right */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '35vw', height: '35vw',
          right: '-5vw', bottom: '-5vh',
          background: 'radial-gradient(circle, rgba(200,169,81,0.05) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{
            y: [0, p.drift, 0],
            x: [0, (Math.random() - 0.5) * 20, 0],
            opacity: [0, 0.7, 0.4, 0.7, 0],
          }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Drifting sigils */}
      {sigils.map((s) => (
        <motion.div
          key={s.id}
          className="absolute text-xs select-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            color: 'rgba(220,20,60,0.12)',
            fontFamily: 'monospace',
            fontSize: '10px',
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0, 0.3, 0],
            rotate: [0, 15, 0],
          }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        >
          {s.glyph}
        </motion.div>
      ))}

      {/* Primary scanline */}
      <motion.div
        className="absolute inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(220,20,60,0.15) 20%, rgba(139,92,246,0.3) 50%, rgba(220,20,60,0.15) 80%, transparent 100%)' }}
        animate={{ y: ['-2px', '100vh'] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />

      {/* Secondary scanline — faster, dimmer */}
      <motion.div
        className="absolute inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.08) 40%, rgba(0,229,255,0.15) 50%, rgba(0,229,255,0.08) 60%, transparent 100%)' }}
        animate={{ y: ['-2px', '100vh'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'linear', delay: 4 }}
      />

    </div>
  )
}
