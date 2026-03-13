import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'mason-green': '#006633',
        'mason-gold': '#FFCC00',
        'mason-dark': '#1a1a1a',
      },
    },
  },
  plugins: [],
}
export default config
