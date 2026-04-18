import { motion } from 'framer-motion'

interface Props {
  size?: number
  speaking?: boolean
}

export function AriaAvatar({ size = 48, speaking = false }: Props) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Outer pulse rings */}
      {speaking && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: 'rgba(139,92,246,0.4)' }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: 'rgba(139,92,246,0.2)' }}
            animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
        </>
      )}

      {/* Static idle ring */}
      {!speaking && (
        <motion.div
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: 'rgba(139,92,246,0.3)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}

      {/* Core orb */}
      <motion.div
        className="absolute inset-1 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c3aed 40%, #4c1d95 80%, #1e0a4a)',
          boxShadow: '0 0 20px rgba(139,92,246,0.6), 0 0 40px rgba(139,92,246,0.2), inset 0 0 10px rgba(196,181,253,0.3)',
        }}
        animate={speaking
          ? { scale: [1, 1.05, 0.98, 1.02, 1], boxShadow: ['0 0 20px rgba(139,92,246,0.6)', '0 0 35px rgba(139,92,246,0.9)', '0 0 20px rgba(139,92,246,0.6)'] }
          : { scale: [1, 1.02, 1] }
        }
        transition={{ duration: speaking ? 1.5 : 3, repeat: Infinity }}
      />

      {/* Highlight shimmer */}
      <div
        className="absolute rounded-full"
        style={{
          width: '35%',
          height: '25%',
          top: '20%',
          left: '22%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.5), transparent)',
          filter: 'blur(1px)',
        }}
      />

      {/* Inner spark */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '20%',
          height: '20%',
          top: '40%',
          left: '40%',
          background: 'radial-gradient(circle, #e9d5ff, #8b5cf6)',
        }}
        animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  )
}
