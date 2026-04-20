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
      className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b z-50 relative"
      style={{
        background: 'rgba(8,8,16,0.95)',
        borderColor: 'rgba(0,229,255,0.1)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Brand */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 font-mono"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="text-lg"
          style={{ color: '#00e5ff' }}
        >
          ✦
        </motion.div>
        <span className="text-sm font-semibold tracking-widest" style={{ color: '#00e5ff' }}>
          AKASHIC
        </span>
        <span className="text-xs font-light tracking-widest" style={{ color: 'rgba(0,229,255,0.5)' }}>
          CODEX
        </span>
      </button>

      {/* Nav tabs */}
      <nav className="flex items-center gap-1">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ y: -1 }}
                className={clsx(
                  'px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-all duration-200 flex items-center gap-1.5',
                )}
                style={{
                  background: isActive ? 'rgba(0,229,255,0.1)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(0,229,255,0.3)' : 'transparent'}`,
                  color: isActive ? '#00e5ff' : 'rgba(255,255,255,0.4)',
                  boxShadow: isActive ? '0 0 12px rgba(0,229,255,0.15)' : 'none',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Right: book title + Aria toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono truncate max-w-32" style={{ color: 'rgba(255,215,0,0.6)' }}>
          {book.title}
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleAria}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-all"
          style={{
            background: ariaOpen ? 'rgba(139,92,246,0.15)' : 'transparent',
            border: `1px solid ${ariaOpen ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.15)'}`,
            color: ariaOpen ? '#a78bfa' : 'rgba(139,92,246,0.5)',
          }}
        >
          <AriaAvatar size={16} />
          <span>ARIA</span>
        </motion.button>
      </div>
    </header>
  )
}
