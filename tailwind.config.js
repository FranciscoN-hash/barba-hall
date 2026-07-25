/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B0B0B',
          900: '#111111',
          800: '#1C1C1C',
          700: '#242424',
          600: '#2E2E2E',
          500: '#3A3A3A',
          400: '#525252',
          300: '#737373',
          200: '#A3A3A3',
          100: '#D4D4D4',
          50: '#F5F5F5',
        },
        gold: {
          50: '#FBF7EC',
          100: '#F5E9C6',
          200: '#EDD693',
          300: '#E2C25E',
          400: '#D4AF37',
          500: '#C29B2A',
          600: '#A57E1F',
          700: '#7E5F18',
          800: '#5C4515',
          900: '#3C2E10',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.06)',
        card: '0 2px 8px -2px rgba(0,0,0,0.08), 0 4px 16px -4px rgba(0,0,0,0.06)',
        elevated: '0 8px 32px -8px rgba(0,0,0,0.18), 0 2px 8px -2px rgba(0,0,0,0.10)',
        gold: '0 0 0 1px rgba(212,175,55,0.25), 0 4px 16px -4px rgba(212,175,55,0.25)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #E2C25E 100%)',
        'gold-sheen': 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(226,194,94,0.04) 100%)',
        'ink-gradient': 'linear-gradient(160deg, #0B0B0B 0%, #1C1C1C 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-up': 'fade-up 0.4s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
