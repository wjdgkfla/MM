import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      maxWidth: {
        wide: '1280px',
        content: '1024px',
        narrow: '640px',
      },
      fontSize: {
        'display-lg': '36px',
        'display-md': '28px',
        'display-sm': '22px',
      },
    },
  },
  plugins: [],
}
export default config
