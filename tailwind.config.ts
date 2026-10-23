import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        primary: 'var(--primary)',
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}

export default config
