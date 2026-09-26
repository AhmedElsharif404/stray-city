import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F8F8F5',
        ink: '#172B46',
        coral: '#EE7B5C',
        blue: '#2F6575',
        mint: '#55989C',
        gold: '#E9A066',
        violet: '#3D6077',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 18px 50px rgba(23, 43, 70, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
