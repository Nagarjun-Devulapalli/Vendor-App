/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orchid: {
          DEFAULT: '#1B4CCB',
          light: '#e8eefb',
          mid: '#ff6b6b',
          dark: '#BB2139',
        },
        amber: {
          DEFAULT: '#e8a020',
          light: '#fef3e0',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
