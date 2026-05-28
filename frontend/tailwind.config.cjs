/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Marca institucional Sureste Sostenible — turquesa #00B7C6 (escala anclada en 500)
        brand: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a3eff7',
          300: '#62e0ee',
          400: '#1fc7db',
          500: '#00b7c6',
          600: '#057d8c',
          700: '#0a6571',
          800: '#11515c',
          900: '#14424b',
          950: '#0a2c33',
        },
        ink: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#121c28', // secundario institucional (sidebar oscuro)
        },
        // Éxito → verde institucional #67AE3E (sobrescribe emerald de Tailwind)
        emerald: {
          50:  '#f2f9ec',
          100: '#ddf0cf',
          200: '#bfe3a3',
          300: '#9cd373',
          400: '#7cc04d',
          500: '#67ae3e',
          600: '#498029',
          700: '#3a6720',
          800: '#2f521b',
          900: '#284517',
          950: '#11260a',
        },
        // Info / aprobado → azul institucional #1B347D (sobrescribe blue de Tailwind)
        blue: {
          50:  '#eef1fa',
          100: '#d7ddf2',
          200: '#b3c0e6',
          300: '#8398d4',
          400: '#5470bd',
          500: '#3450a0',
          600: '#283f88',
          700: '#1b347d',
          800: '#182a60',
          900: '#16244e',
          950: '#0d1530',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 12px -2px rgb(15 23 42 / 0.06)',
      },
    },
  },
  plugins: [],
};
