/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#07070B', 900: '#0B0B10', 800: '#12121A', 700: '#1A1A25', 600: '#242432', 500: '#34344A', 400: '#55556E' },
        fog: { 100: '#F2F2F7', 200: '#D8D8E4', 300: '#A9A9BD', 400: '#7C7C92' },
        cyan: { DEFAULT: '#00E5FF' },
        magenta: { DEFAULT: '#FF2BD6' },
        violet: { DEFAULT: '#7C4DFF' },
        amber: { DEFAULT: '#FFB020' },
        danger: { DEFAULT: '#FF4D5E' },
        ok: { DEFAULT: '#3DDC97' },
      },
      fontFamily: {
        ui: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      boxShadow: { page: '0 1px 2px rgba(0,0,0,.5), 0 12px 40px rgba(0,0,0,.45)', pop: '0 16px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)' },
    },
  },
  plugins: [],
}
