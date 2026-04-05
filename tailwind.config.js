/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#030303',
          2: '#0a0a0a',
          3: '#111111',
          surface: '#161616',
        },
        accent: {
          DEFAULT: '#f59e0b',
          dim: '#d97706',
          glow: 'rgba(245,158,11,0.15)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          hover: 'rgba(255,255,255,0.2)',
          accent: 'rgba(245,158,11,0.3)',
        },
        crypto: {
          green: '#22c55e',
          red: '#ef4444',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      fontSize: {
        '10xl': ['10rem', { lineHeight: '0.85' }],
        '9xl': ['8rem', { lineHeight: '0.85' }],
      },
      letterSpacing: {
        '3xl': '0.3em',
        '2xl': '0.2em',
      },
      animation: {
        'spin-slow': 'spinSlow 14s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};