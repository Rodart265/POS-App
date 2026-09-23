/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12172B',
          light: '#1B2140',
          dim: '#2A3154'
        },
        paper: {
          DEFAULT: '#FAFAF7',
          dim: '#F0EEE7'
        },
        amber: {
          DEFAULT: '#E8A33D',
          dim: '#C6862A',
          bright: '#F5B85C'
        },
        slate: {
          DEFAULT: '#5B6478',
          light: '#8890A0'
        },
        signal: {
          DEFAULT: '#C4432E',
          dim: '#A83A28'
        },
        mint: {
          DEFAULT: '#3E9C6E'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '6px'
      }
    }
  },
  plugins: []
}
