/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f4f6ee',
          100: '#e6ebda',
          200: '#ccd6b5',
          300: '#aebe8a',
          400: '#91a662',
          500: '#7a9048',   // olive principal
          600: '#637839',
          700: '#4e602c',
          800: '#3a4820',
          900: '#263014',
        },
        surface: {
          base: '#f5f6f0',
          card: '#ffffff',
          muted: '#eef0e6',
        },
        olive: {
          50:  '#f4f6ee',
          100: '#e6ebda',
          200: '#ccd6b5',
          300: '#aebe8a',
          400: '#91a662',
          500: '#7a9048',
          600: '#637839',
          700: '#4e602c',
        },
        bubble: {
          outgoing: 'var(--bubble-outgoing)',
          incoming: 'var(--bubble-incoming)',
        },
      },
      fontFamily: {
        sans:    ['Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'chat-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%237a9048' fill-opacity='0.04'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
