/* Конфиг сборки Tailwind. Палитра Далата: сосна, туман, подсолнух, гортензия, вишня, черепица.
   Сборка (из папки сайта): npx tailwindcss@3.4.16 -c tools/tailwind.config.js -i tools/tw.src.css -o tw.css --minify */
const path = require('path');
const root = path.join(__dirname, '..');

module.exports = {
  future: { hoverOnlyWhenSupported: true }, // :hover только там, где есть мышь: после тапа на телефоне карточка не «залипает»
  content: ['index.html', 'realty.html', 'map.html', 'realty.js', 'script.js', 'guard.js'].map((f) => path.join(root, f)),
  theme: {
    extend: {
      colors: {
        paper:     { DEFAULT: '#F4EFE5', deep: '#EAE2D2' },
        ink:       { DEFAULT: '#16251F', soft: '#4F5D55' },
        pine:      { 50: '#EFF4EF', 100: '#DFE9E0', 200: '#C2D5C5', 300: '#9DBBA3', 500: '#4E7A61', 600: '#3B6550', 700: '#2B4F3F', 800: '#1E3B30', 900: '#132A22', 950: '#0C1D17' },
        mist:      { DEFAULT: '#DCE3E4', soft: '#ECF0EF', deep: '#B9C6CA' },
        sunflower: { DEFAULT: '#E3A21A', soft: '#F6DD9A', deep: '#A86F0A' },
        hydrangea: { DEFAULT: '#6F6AAE', soft: '#DEDBF0', deep: '#4E4890' },
        blossom:   { DEFAULT: '#D9809A', soft: '#F6DCE3', deep: '#B4566F' },
        clay:      { DEFAULT: '#B5583A', soft: '#F0D2C4' },
        tg:        { DEFAULT: '#229ED9', dark: '#1B8AC0' }
      },
      fontFamily: {
        sans:  ['Onest', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        hand:  ['Caveat', 'cursive']
      },
      letterSpacing: { tightest: '-0.045em' }
    }
  }
};
