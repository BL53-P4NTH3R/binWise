/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1D9E75',
          50: '#E8F7F2',
          100: '#C5EBDC',
          200: '#8FD4BB',
          300: '#5ABF9B',
          400: '#2EAA82',
          500: '#1D9E75',
          600: '#178660',
          700: '#10674A',
          800: '#0A4A35',
          900: '#052D20',
        },
        warning: {
          DEFAULT: '#BA7517',
          light: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#E24B4A',
          light: '#FEE2E2',
        },
        info: {
          DEFAULT: '#185FA5',
          light: '#DBEAFE',
        },
        surface: '#FFFFFF',
        border: '#E5E7EB',
        'bg-base': '#F8F9FA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
