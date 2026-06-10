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
          // Fundo roxo escuro quase preto — como na imagem
          bg:        '#090514',
          panel:     '#130e26',
          panel2:    '#181330',
          border:    '#2a1e4a',
          // Roxo vibrante (accent principal — substitui o dourado)
          gold:        '#a855f7',   // violet-500 — usado em títulos, destaques
          'gold-dark': '#7c3aed',   // violet-700 — hover
          // Roxo neon para glow e bordas ativas
          purple:        '#8b5cf6',  // violet-500
          'purple-light': '#c4b5fd', // violet-300
          'purple-glow':  '#a855f7', // para box-shadow
          // Verde esmeralda — preços e ações positivas
          blue:       '#10b981',  // emerald-500
          'blue-dark':'#059669',  // emerald-700
          // Vermelho e amarelo mantidos
          red:    '#ef4444',
          green:  '#10b981',
          yellow: '#f59e0b',
          // Textos
          text:        '#e2e8f0',
          'text-muted':'#9ca3af',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-in':   'slideIn 0.3s ease-out',
        'pulse-purple': 'pulsePurple 2s infinite',
        'glow':       'glow 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulsePurple: {
          '0%, 100%': { boxShadow: '0 0 5px #a855f7' },
          '50%':      { boxShadow: '0 0 20px #a855f7, 0 0 40px #a855f766' },
        },
        glow: {
          '0%, 100%': { opacity: '0.8' },
          '50%':      { opacity: '1' },
        },
      },
      boxShadow: {
        'purple':     '0 0 12px #a855f766',
        'purple-lg':  '0 0 24px #a855f7aa',
        'purple-xl':  '0 0 40px #a855f7cc',
        'green-glow': '0 0 12px #10b98166',
      },
    },
  },
  plugins: [],
}
