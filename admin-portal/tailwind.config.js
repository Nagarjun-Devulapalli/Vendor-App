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
          DEFAULT: '#1a6b4a',
          light: '#e8f5ee',
          mid: '#2d8f63',
          dark: '#145537',
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