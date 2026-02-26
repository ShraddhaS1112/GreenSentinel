/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Green Sentinel brand colors
        'sentinel-green': '#10b981',
        'sentinel-dark': '#1f2937',
        'sentinel-light': '#f3f4f6',
        'threat-red': '#ef4444',
        'threat-orange': '#f97316',
        'health-yellow': '#eab308',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
