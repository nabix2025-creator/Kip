/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        meta: ['11px', { lineHeight: '13px', letterSpacing: '0.02em' }],
        body: ['13px', { lineHeight: '18px', letterSpacing: '-0.01em' }],
        title: ['15px', { lineHeight: '20px', letterSpacing: '-0.016em' }],
        header: ['20px', { lineHeight: '25px', letterSpacing: '-0.022em' }],
        date: ['28px', { lineHeight: '34px', letterSpacing: '-0.03em' }],
        large: ['34px', { lineHeight: '41px', letterSpacing: '-0.04em' }],
      },
      backgroundColor: {
        primary: 'rgb(var(--bg-primary) / <alpha-value>)',
        secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
        tertiary: 'rgb(var(--bg-tertiary) / <alpha-value>)',
        grouped: 'rgb(var(--bg-grouped) / <alpha-value>)',
        fill: 'rgb(var(--bg-fill) / <alpha-value>)',
        divider: 'var(--hairline)',
      },
      textColor: {
        primary: 'rgb(var(--fg) / <alpha-value>)',
        secondary: 'rgb(var(--label-secondary) / 0.72)',
        tertiary: 'rgb(var(--label-tertiary) / 0.55)',
      },
      borderColor: {
        divider: 'var(--hairline)',
      },
      colors: {
        accent: {
          red: 'rgb(var(--accent-red) / <alpha-value>)',
          orange: 'rgb(var(--accent-orange) / <alpha-value>)',
          green: 'rgb(var(--accent-green) / <alpha-value>)',
          blue: 'rgb(var(--accent-blue) / <alpha-value>)',
          indigo: 'rgb(var(--accent-indigo) / <alpha-value>)',
        },
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        card: 'var(--shadow-card)',
        event: 'var(--shadow-event)',
        sheet: 'var(--shadow-sheet)',
      },
      borderRadius: {
        panel: '16px',
        card: '12px',
        sheet: '20px',
        pill: '980px',
      },
      transitionTimingFunction: {
        kip: 'cubic-bezier(0.4, 0, 0.2, 1)',
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
}
