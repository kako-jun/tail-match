/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Instagram-inspired palette
        ig: {
          white: '#FFFFFF',
          'off-white': '#FAFAFA', // Instagram background
          border: '#DBDBDB', // Instagram border
          'border-light': '#EFEFEF',
          text: '#262626', // Instagram near-black
          muted: '#8E8E8E', // Instagram muted gray
          coral: '#FF7A7A', // heart/favorite accent
          'coral-light': '#FFEDED',
          'coral-dark': '#E85555',
          urgent: '#ED4956', // alert red
          'warm-gray': '#F5F5F5', // subtle section bg
        },
        // Keep urgency colors for status chips
        urgent: {
          red: '#ED4956',
          orange: '#FFBA33',
          yellow: '#FFD166',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'Hiragino Kaku Gothic ProN',
          'Hiragino Sans',
          'sans-serif',
        ],
      },
      borderRadius: {
        ig: '8px',
        'ig-sm': '4px',
        'ig-full': '50%',
      },
      boxShadow: {
        none: 'none',
        ig: '0 1px 3px rgba(0,0,0,0.08)',
      },
      aspectRatio: {
        square: '1 / 1',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'scale-in': 'scaleIn 0.2s ease',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
