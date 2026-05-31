import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { useStore, useActiveBook } from '../../store/bookStore'
import { AriaAvatar } from '../aria/AriaAvatar'

const TABS = [
  { to: '/', label: 'Command Center', icon: '⬡' },
  { to: '/concepts', label: 'Concept Web', icon: '◈' },
  { to: '/characters', label: 'Characters', icon: '👤' },
  { to: '/cover', label: 'Cover', icon: '✦' },
  { to: '/images', label: 'Image Vault', icon: '◻' },
]

export function NavBar() {
  const book = useActiveBook()
  const { ariaOpen, toggleAria } = useStore()
  const navigate = useNavigate()

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-4 h-14 relative z-50"
      style={{
        background: 'rgba(5,5,8,0.92)',
        borderBottom: '1px solid rgba(220,20,60,0.12)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 1px 0 rgba(220,20,60,0.06), 0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(220,20,60,0.5) 30%, rgba(139,92,246,0.5) 70%, transparent)' }} />

      {/* Brand */}
      <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          style={{ color: '#dc143c', filter: 'drop-shadow(0 0 6px rgba(220,20,60,0.8))', fontSize: '1rem' }}
        >
          ✦
        </motion.div>
        <div className="flex flex-col leading-none gap-0.5">
          <span className="text-xs font-semibold tracking-[0.25em]" style={{ color: '#dc143c', textShadow: '0 0 12px rgba(220,20,60,0.5)', fontFamily: 'monospace' }}>
            AKASHIC
          </span>
          <span className="tracking-[0.3em]" style={{ color: 'rgba(139,92,246,0.5)', fontFamily: 'monospace', fontSize: '0.55rem' }}>
            CODEX
          </span>
        </div>
      </button>

      {/* Nav tabs */}
      <nav className="flex items-center gap-0.5">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ y: -1 }}
                className="relative px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-colors duration-200 flex items-center gap-1.5"
                style={{
                  background: isActive ? 'rgba(220,20,60,0.1)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(220,20,60,0.3)' : 'transparent'}`,
                  color: isActive ? '#ff6b7a' : 'rgba(255,255,255,0.35)',
                  boxShadow: isActive ? '0 0 12px rgba(220,20,60,0.15)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.7rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {isActive && (
                  <div
                    className="absolute inset-x-2 bottom-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(220,20,60,0.9), transparent)' }}
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Right: book title + Aria toggle */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-xs font-mono truncate max-w-36" style={{ color: 'rgba(255,215,0,0.7)', textShadow: '0 0 8px rgba(255,215,0,0.3)' }}>
            {book.title}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', fontFamily: 'monospace' }}>
            {book.author}
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleAria}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded transition-all"
          style={{
            background: ariaOpen ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.04)',
            border: `1px solid ${ariaOpen ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.15)'}`,
            color: ariaOpen ? '#a78bfa' : 'rgba(139,92,246,0.45)',
            boxShadow: ariaOpen ? '0 0 16px rgba(139,92,246,0.2)' : 'none',
          }}
        >
          <AriaAvatar size={18} speaking={false} />
          <span className="text-xs font-mono tracking-widest">ARIA</span>
        </motion.button>
      </div>
    </header>
  )
}
