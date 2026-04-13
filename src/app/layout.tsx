import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'Mason Market | Buy & Sell at George Mason University',
  description: 'The trusted student marketplace for George Mason University. Buy and sell textbooks, electronics, furniture, and more — safely on campus.',
  metadataBase: new URL('https://mason-market.vercel.app'),
  openGraph: {
    title: 'Mason Market | GMU Student Marketplace',
    description: 'Buy and sell textbooks, electronics, furniture, and more — safely on campus at George Mason University.',
    type: 'website',
    siteName: 'Mason Market',
  },
  twitter: {
    card: 'summary',
    title: 'Mason Market | GMU Student Marketplace',
    description: 'Buy and sell textbooks, electronics, furniture, and more — safely on campus at GMU.',
  },
}

export const viewport: Viewport = {
  themeColor: '#006633',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
