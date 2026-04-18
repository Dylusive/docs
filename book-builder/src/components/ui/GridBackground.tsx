import { motion } from 'framer-motion'

export function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Base dark gradient */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d0d2a 0%, #080810 60%)' }} />

      {/* Grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Perspective fade at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: 'linear-gradient(to top, #080810, transparent)' }} />

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? '#00e5ff' : i % 3 === 1 ? '#8b5cf6' : '#ffd700',
            opacity: 0.3 + Math.random() * 0.4,
          }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 4 + Math.random() * 6, repeat: Infinity, delay: Math.random() * 4 }}
        />
      ))}

      {/* Radial glow spots */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)' }} />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />

      {/* Scanline */}
      <motion.div
        className="absolute inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.3), transparent)' }}
        animate={{ y: ['-2px', '100vh'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}
