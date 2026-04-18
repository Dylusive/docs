/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#080810',
        'void-2': '#0d0d1a',
        'void-3': '#12122a',
        cyan: {
          DEFAULT: '#00e5ff',
          dim: '#00b8d4',
          glow: '#00e5ff33',
        },
        purple: {
          DEFAULT: '#8b5cf6',
          dim: '#6d28d9',
          glow: '#8b5cf633',
        },
        gold: {
          DEFAULT: '#ffd700',
          dim: '#b8960c',
          glow: '#ffd70033',
        },
        glass: 'rgba(255,255,255,0.04)',
        'glass-border': 'rgba(0,229,255,0.15)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0,229,255,0.4), 0 0 60px rgba(0,229,255,0.15)',
        'glow-purple': '0 0 20px rgba(139,92,246,0.4), 0 0 60px rgba(139,92,246,0.15)',
        'glow-gold': '0 0 20px rgba(255,215,0,0.4), 0 0 60px rgba(255,215,0,0.15)',
        'glow-sm': '0 0 8px rgba(0,229,255,0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.95' },
        },
      },
      backgroundImage: {
        'grid-cyan': 'linear-gradient(rgba(0,229,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.05) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
