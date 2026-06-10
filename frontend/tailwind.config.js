/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0a0e1a',
          panel: '#161b22',
          panel2: '#1a1f2e',
          border: '#2d3748',
          gold: '#f0c040',
          'gold-dark': '#c9a227',
          purple: '#7c3aed',
          'purple-light': '#a78bfa',
          blue: '#3b82f6',
          'blue-dark': '#1d4ed8',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#f59e0b',
          text: '#e2e8f0',
          'text-muted': '#94a3b8',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 5px #f0c040' },
          '50%': { boxShadow: '0 0 20px #f0c040, 0 0 40px #f0c04066' },
        }
      }
    },
  },
  plugins: [],
}
