/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#E6ECFA',
          100: '#C2D0F2',
          200: '#9AB1E8',
          300: '#6F91DD',
          400: '#4C77D5',
          500: '#275DCC',
          600: '#1E4FB8',
          700: '#153E9A',
          800: '#0A2463',
          900: '#061539',
          950: '#030A1F',
        },
        accent: {
          warning: '#F76C5E',
          safe: '#3CAEA3',
          danger: '#E63946',
          info: '#457B9D',
          gold: '#F4A261',
          purple: '#9B5DE5',
        },
        surface: {
          DEFAULT: '#0B1221',
          light: '#131B2E',
          card: '#1A2540',
          border: '#2A3A5C',
        },
      },
      fontFamily: {
        sans: ['"Source Han Sans CN"', '"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(42,58,92,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(42,58,92,0.3) 1px, transparent 1px)",
        'hero-gradient': 'radial-gradient(ellipse at top, rgba(39,93,204,0.15) 0%, transparent 50%)',
      },
      boxShadow: {
        'glow': '0 0 40px rgba(39,93,204,0.2)',
        'glow-danger': '0 0 40px rgba(230,57,70,0.3)',
        'glow-warning': '0 0 30px rgba(247,108,94,0.25)',
        'card': '0 4px 24px rgba(0,0,0,0.3)',
        'inner-soft': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-border': 'glow-border 2s ease-in-out infinite',
        'flow-line': 'flow-line 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-border': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(230,57,70,0.5), 0 0 20px rgba(230,57,70,0.3)' },
          '50%': { boxShadow: '0 0 15px rgba(230,57,70,0.8), 0 0 40px rgba(230,57,70,0.5)' },
        },
        'flow-line': {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
};
