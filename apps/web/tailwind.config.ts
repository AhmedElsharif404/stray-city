import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F8FAFF',
        ink: '#18275C',
        coral: '#EF6658',
        blue: '#4B73F2',
        mint: '#7895F7',
        gold: '#F2A096',
        violet: '#2D438D',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 18px 50px rgba(24, 39, 92, 0.13)',
      },
    },
  },
  plugins: [],
} satisfies Config;
