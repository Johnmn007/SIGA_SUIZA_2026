/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Identidad institucional IESTP Suiza (fuente: web_suiza) */
        primary: {
          DEFAULT: '#0044B2',
          dark: '#003388',
          light: '#A0C1F7',
          soft: '#E5EEFE',
        },
        secondary: {
          DEFAULT: '#002D7A',
          dark: '#001F58',
        },
        background: '#F3F4F6',
        surface: '#FFFFFF',
        'slate-text': '#1E293B',
        'slate-light': '#F8FAFC',
        navy: '#3A4B74',
        darkaccent: '#0F172A',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(75, 122, 244, 0.08)',
        'glass-lg': '0 12px 36px rgba(0, 45, 122, 0.12)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'card-lg': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'focus-ring': '0 0 0 4px rgba(0, 68, 178, 0.15)',
      },
      backdropBlur: {
        'glass': '16px',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}