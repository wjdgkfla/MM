import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ToastContainer } from '@/components/Toast'

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
    <html lang="en">
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes into <body> before React hydrates, causing false-positive
          hydration warnings. This only suppresses attribute mismatches on this
          element — child component mismatches still surface normally. */}
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <ToastContainer />
      </body>
    </html>
  )
}
