import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface Props {
  size?: number
  speaking?: boolean
}

export function AriaAvatar({ size = 48, speaking = false }: Props) {
  const orbitParticles = useMemo(() =>
    Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      angle: (i / 5) * 360,
      radius: 0.72,
      color: i % 2 === 0 ? '#c084fc' : '#a78bfa',
    })), [])

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>

      {/* Outermost aura — slow, huge */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: `-${size * 0.5}px`,
          background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: speaking ? 1.5 : 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Speaking pulse rings */}
      {speaking && [0, 0.25, 0.5].map((delay) => (
        <motion.div
          key={delay}
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: 'rgba(167,139,250,0.5)' }}
          animate={{ scale: [1, 2.2, 2.2], opacity: [0.7, 0, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay, ease: 'easeOut' }}
        />
      ))}

      {/* Idle breathing ring */}
      {!speaking && (
        <motion.div
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: 'rgba(139,92,246,0.25)' }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Orbital ring */}
      <motion.div
        className="absolute inset-0 rounded-full border"
        style={{ borderColor: 'rgba(139,92,246,0.12)', borderStyle: 'dashed' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Orbiting particles */}
      {orbitParticles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: size * 0.1,
            height: size * 0.1,
            top: '50%',
            left: '50%',
            marginTop: -(size * 0.05),
            marginLeft: -(size * 0.05),
            background: p.color,
            boxShadow: `0 0 ${size * 0.12}px ${p.color}`,
          }}
          animate={{
            x: [
              Math.cos((p.angle * Math.PI) / 180) * size * p.radius,
              Math.cos(((p.angle + 360) * Math.PI) / 180) * size * p.radius,
            ],
            y: [
              Math.sin((p.angle * Math.PI) / 180) * size * p.radius,
              Math.sin(((p.angle + 360) * Math.PI) / 180) * size * p.radius,
            ],
            opacity: speaking ? [0.5, 1, 0.5] : [0.25, 0.6, 0.25],
          }}
          transition={{
            x: { duration: 6 + p.id * 0.8, repeat: Infinity, ease: 'linear' },
            y: { duration: 6 + p.id * 0.8, repeat: Infinity, ease: 'linear' },
            opacity: { duration: 2, repeat: Infinity, delay: p.id * 0.3 },
          }}
        />
      ))}

      {/* Core orb — deep violet */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: '8%',
          background: 'radial-gradient(circle at 32% 30%, #e9d5ff 0%, #9333ea 30%, #4c1d95 60%, #1a0533 100%)',
          boxShadow: speaking
            ? '0 0 24px rgba(139,92,246,0.9), 0 0 50px rgba(139,92,246,0.4), inset 0 0 12px rgba(233,213,255,0.4)'
            : '0 0 16px rgba(139,92,246,0.5), 0 0 32px rgba(139,92,246,0.15), inset 0 0 8px rgba(196,181,253,0.2)',
        }}
        animate={
          speaking
            ? { scale: [1, 1.08, 0.97, 1.05, 1] }
            : { scale: [1, 1.03, 1] }
        }
        transition={{ duration: speaking ? 1.2 : 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Inner light core */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '30%',
          height: '30%',
          top: '20%',
          left: '20%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(233,213,255,0.3) 50%, transparent 100%)',
          filter: 'blur(1.5px)',
        }}
        animate={{ opacity: speaking ? [0.6, 1, 0.6] : [0.3, 0.6, 0.3] }}
        transition={{ duration: speaking ? 1 : 3, repeat: Infinity }}
      />

      {/* Central spark */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '18%',
          height: '18%',
          top: '41%',
          left: '41%',
          background: 'radial-gradient(circle, #fff 0%, #e9d5ff 40%, #8b5cf6 100%)',
          filter: 'blur(0.5px)',
        }}
        animate={{ scale: speaking ? [0.7, 1.6, 0.7] : [0.8, 1.3, 0.8], opacity: speaking ? [0.8, 1, 0.8] : [0.5, 0.9, 0.5] }}
        transition={{ duration: speaking ? 0.8 : 2.5, repeat: Infinity }}
      />

    </div>
  )
}
