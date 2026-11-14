/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#08070c',
        coal: '#0d0a12',
        plum: '#161020',
        wine: '#1e1420',
        rose: {
          DEFAULT: '#f2b8be',
          soft: '#f8d6d9',
          deep: '#d98b98',
          dusk: '#8a5560',
        },
        gold: {
          DEFAULT: '#e8c58c',
          soft: '#f6e3bc',
          deep: '#b8934f',
        },
        cream: '#fbf3ec',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        hand: ['Caveat', 'cursive'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 30px 70px -30px rgba(0,0,0,.85)',
        glow: '0 0 50px -12px rgba(242,184,190,.45)',
      },
      animation: {
        'fade-up': 'fadeUp .8s cubic-bezier(.16,.8,.3,1) both',
        'soft-pulse': 'softPulse 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(18px)' },
          '100%': { opacity: 1, transform: 'none' },
        },
        softPulse: {
          '0%,100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
