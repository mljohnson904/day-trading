/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(34,197,94,.18), 0 24px 80px rgba(0,0,0,.45)'
      }
    },
  },
  plugins: [],
}
