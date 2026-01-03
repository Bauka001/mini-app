/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        player: '#3b82f6', // blue-500
        enemy: '#ef4444',  // red-500
        neutral: '#9ca3af', // gray-400
      },
    },
  },
  plugins: [],
}
