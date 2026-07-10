'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUnreadMessages } from '@/lib/useUnreadMessages'
import { useLocale } from '@/lib/i18n/LocaleProvider'

function TabIcon({ d, filled }: { d: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export function MobileTabBar() {
  const pathname = usePathname()
  const { t } = useLocale()
  const hasUnread = useUnreadMessages()

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  const tabs = [
    { href: '/', label: t('header.browse'), icon: 'M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9' },
    { href: '/saved', label: t('header.saved'), icon: 'M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.9 8.8-8.9a5 5 0 0 0 0-7.1Z' },
  ] as const

  const profileTabs = [
    { href: '/messages', label: t('header.messages'), icon: 'M21 11.5a8.38 8.38 0 0 1-8.8 8.5c-1.4 0-2.7-.3-3.9-.9L3 21l1.9-5.1a8.38 8.38 0 0 1 12.7-11A8.5 8.5 0 0 1 21 11.5Z' },
    { href: '/profile', label: t('header.profile'), icon: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
  ] as const

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] items-stretch border-t bg-white/95 backdrop-blur-xl sm:hidden"
      style={{ borderColor: 'var(--m-line)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5"
            style={{ color: active ? 'var(--m-ink)' : 'var(--m-muted)' }}
          >
            <TabIcon d={tab.icon} filled={tab.href === '/saved' && active} />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </Link>
        )
      })}

      {/* Sell — center accent button */}
      <Link href="/sell" className="flex flex-1 flex-col items-center justify-center">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-md"
          style={{ background: 'var(--m-green)' }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </Link>

      {profileTabs.map((tab) => {
        const active = isActive(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
            style={{ color: active ? 'var(--m-ink)' : 'var(--m-muted)' }}
          >
            <span className="relative">
              <TabIcon d={tab.icon} />
              {tab.href === '/messages' && hasUnread && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--m-pop)] ring-2 ring-white" />
              )}
            </span>
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
