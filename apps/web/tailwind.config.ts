import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F7F5EF',
        ink: '#162A2B',
        coral: '#F06A4D',
        blue: '#3267C8',
        mint: '#6CC9A5',
        gold: '#E7AC3A',
        violet: '#7465B2',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 18px 50px rgba(22, 42, 43, 0.10)',
      },
    },
  },
  plugins: [],
} satisfies Config;
