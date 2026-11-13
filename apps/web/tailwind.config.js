/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Automotive Redesign Palette (ASKR EV)
        graphite: '#101318',
        carbon: '#080A0D',
        lightSurface: '#F6F7F8',
        lime: {
          DEFAULT: '#C9FF36',
          400: '#D5FF5C',
          500: '#C9FF36',
          600: '#B0EA1E',
        },
        silver: {
          DEFAULT: '#A7ADB5',
          300: '#D1D5DB',
          400: '#A7ADB5',
          500: '#8E95A0',
        },
        brand: {
          50: '#F0F6FC',
          100: '#E1EDF9',
          200: '#C3DCF4',
          300: '#8FBFEA',
          400: '#529CDA',
          500: '#165DAD', // Primary Brand Blue (Official ASKR EV Identity)
          600: '#124B8D',
          700: '#0E3A6D',
          800: '#0B2C52',
          900: '#08203B',
        },
        surface: {
          DEFAULT: '#FFFFFF', // Primary Background
          alt: '#F7F9FC',     // Secondary Background
          border: '#E2E8F0',  // Border Color
        },
        corporate: {
          text: '#253247',      // Primary Text
          muted: '#64748B',     // Secondary Text
          subtle: '#94A3B8',    // Subtle/Placeholder
          border: '#E2E8F0',    // Clean Border
          success: '#15803D',   // Corporate Green
          error: '#DC2626',     // Corporate Red
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        card: '0 2px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
