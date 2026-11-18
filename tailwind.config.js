/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Light luxury palette
        cream: '#FDF8F3',
        sand: '#EFE6DA',
        ivory: '#FFFFFF',
        ink: '#1A1A1A',
        muted: '#6B6259',
        gold: {
          DEFAULT: '#C5A253',
          soft: '#E7D3A6',
          deep: '#A8873D',
        },
        blush: {
          DEFAULT: '#F8E1E7',
          soft: '#FDF1F4',
          deep: '#B5768A',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        hand: ['Caveat', 'cursive'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.3em',
      },
      boxShadow: {
        soft: '0 28px 70px -34px rgba(26,26,26,0.20), 0 2px 6px rgba(26,26,26,0.03)',
        hair: '0 1px 2px rgba(26,26,26,0.05)',
        gold: '0 18px 40px -22px rgba(197,162,83,0.55)',
        glow: '0 18px 44px -26px rgba(197,162,83,0.45)',
      },
      borderRadius: {
        luxe: '4px',
      },
      animation: {
        'fade-up': 'fadeUp .9s cubic-bezier(.16,.8,.3,1) both',
        'soft-pulse': 'softPulse 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(18px)' },
          '100%': { opacity: 1, transform: 'none' },
        },
        softPulse: {
          '0%,100%': { opacity: 0.45 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
