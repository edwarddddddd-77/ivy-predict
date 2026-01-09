/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'prism-deep': '#0A2342',
        'fintech-teal': '#005F6B',
        'energy-cyan': '#00C9A7',
        'energy-bright': '#4DFFEA',
        'deep-space': '#051525',
        'data-grey': '#8A9BA8',
        'data-grey-light': '#E0E6ED',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #005F6B 0%, #0A2342 100%)',
        'energy-gradient': 'linear-gradient(135deg, #4DFFEA 0%, #00C9A7 100%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(77, 255, 234, 0.3)',
        'glow-cyan-lg': '0 0 30px rgba(77, 255, 234, 0.5)',
      },
    },
  },
  plugins: [],
}
