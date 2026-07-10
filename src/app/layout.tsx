import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Outfit, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MobileTabBar } from '@/components/MobileTabBar'
import { ToastContainer } from '@/components/Toast'
import { LocaleProvider } from '@/lib/i18n/LocaleProvider'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
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
    <html lang="en">
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes into <body> before React hydrates, causing false-positive
          hydration warnings. This only suppresses attribute mismatches on this
          element — child component mismatches still surface normally. */}
      <body
        className={`${GeistSans.variable} ${outfit.variable} ${ibmPlexMono.variable} flex min-h-screen flex-col`}
        suppressHydrationWarning
      >
        <LocaleProvider>
          <Header />
          <div className="flex-1 pb-[60px] sm:pb-0">{children}</div>
          <Footer />
          <MobileTabBar />
          <ToastContainer />
        </LocaleProvider>
      </body>
    </html>
  )
}
