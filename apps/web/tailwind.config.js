/** Design tokens from docs/03-design-system.md §2. Spacing uses Tailwind's
 * default 4px-based scale, which already matches the 4/8/12/16/24/32/48
 * scale mandated by the global CLAUDE.md §10 — no override needed there. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111114',
        surface: '#FFFFFF',
        'surface-dim': '#F4F4F6',
        muted: '#8A8A93',
        primary: { DEFAULT: '#FF4D5E', ink: '#B8202F' },
        success: '#22C55E',
        rejection: '#6C5CE7',
        power: '#FFB020',
        warning: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '16px',
        lg: '24px',
      },
      transitionDuration: {
        micro: '150ms',
        standard: '250ms',
        dramatic: '550ms',
      },
    },
  },
  plugins: [],
};
