import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, IBM_Plex_Mono, Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

const geist = Inter({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'Mason Market | Buy & Sell at George Mason University',
  description:
    'The trusted student marketplace for George Mason University. Buy and sell textbooks, electronics, furniture, and more — safely on campus.',
  metadataBase: new URL('https://mason-market.vercel.app'),
  openGraph: {
    title: 'Mason Market | GMU Student Marketplace',
    description:
      'Buy and sell textbooks, electronics, furniture, and more — safely on campus at George Mason University.',
    type: 'website',
    siteName: 'Mason Market',
  },
  twitter: {
    card: 'summary',
    title: 'Mason Market | GMU Student Marketplace',
    description:
      'Buy and sell textbooks, electronics, furniture, and more — safely on campus at GMU.',
  },
}

export const viewport: Viewport = {
  themeColor: '#006B3C',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body className="flex min-h-screen flex-col" style={{ background: 'var(--m-bg)', color: 'var(--m-ink)' }}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
