'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { Conversation } from '@/lib/data/contracts'
import { usePushNotifications } from '@/lib/usePushNotifications'
import { useLocale } from '@/lib/i18n/LocaleProvider'

export function Header() {
  const { session } = useAuthSession()
  const { locale, setLocale, t } = useLocale()
  usePushNotifications(session?.userId)
  const pathname = usePathname()
  const router = useRouter()
  const [headerSearch, setHeaderSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    if (!session) return

    const checkUnread = async () => {
      try {
        const res = await fetch('/api/messages')
        if (!res.ok) return
        const conversations = (await res.json()) as Conversation[]
        if (!Array.isArray(conversations) || conversations.length === 0) return
        const apiUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
        if (apiUnread > 0) {
          setHasUnread(true)
          return
        }
        const lastSeen = parseInt(localStorage.getItem('mm_msgs_last_seen') || '0', 10)
        const hasNew = conversations.some(
          (c) => c.lastMessageAt && new Date(c.lastMessageAt).getTime() > lastSeen
        )
        setHasUnread(hasNew)
      } catch {
        // silently ignore — unread dot is non-critical
      }
    }

    checkUnread()
    // Poll every 30s so the badge updates without a page reload
    const interval = setInterval(checkUnread, 30_000)
    return () => clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (!session) return
    const loadNotifications = async () => {
      const res = await fetch('/api/notifications').catch(() => null)
      if (!res?.ok) return
      const data = await res.json().catch(() => [])
      setUnreadNotifications(Array.isArray(data) ? data.filter((n) => !n.isRead).length : 0)
    }
    loadNotifications()
    const interval = setInterval(loadNotifications, 30_000)
    return () => clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (pathname === '/messages') {
      setHasUnread(false)
    }
  }, [pathname])

  const handleSignOut = async () => {
    // Clear the Supabase client session too — otherwise its refresh token stays
    // in localStorage and can mint a new app session on a shared computer.
    try {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      await getSupabaseClient().auth.signOut()
    } catch {
      // Supabase env missing or network error — the cookie clear below still signs out
    }
    await fetch('/api/auth/sign-out', { method: 'POST' })
    window.location.href = '/'
  }

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = headerSearch.trim()
    router.push(q ? `/?search=${encodeURIComponent(q)}` : '/')
    setHeaderSearch('')
    setMobileSearchOpen(false)
  }

  const navLinks = [
    { href: '/', label: t('header.browse') },
    { href: '/saved', label: t('header.saved') },
    { href: '/messages', label: t('header.messages') },
    { href: '/my-listings', label: t('header.myPosts') },
  ]

  const initials = (session?.displayName || session?.email || '?')
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || '?'

  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--m-bg)]/85 backdrop-blur-xl" style={{ borderColor: 'var(--m-line)' }}>
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-4 px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Mason Market"
            width={180}
            height={60}
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop search */}
        <form
          onSubmit={handleHeaderSearch}
          className="hidden sm:flex flex-1 max-w-[480px] items-center gap-2 h-11 rounded-full border bg-white px-4 transition-colors focus-within:border-[var(--m-ink)]"
          style={{ borderColor: 'var(--m-line)' }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--m-muted)' }}>
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder={t('header.search')}
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: 'var(--m-ink)' }}
          />
        </form>

        {/* Mobile search icon */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen((v) => !v)}
          aria-label="Search"
          className="flex sm:hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          style={{ color: 'var(--m-muted)' }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
        </button>

        {/* Nav — only when signed in */}
        {session && (
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex h-9 items-center rounded-full px-3 text-[13px] font-semibold transition-colors"
                  style={{ color: active ? 'var(--m-ink)' : 'var(--m-muted)' }}
                >
                  {item.label}
                  {item.href === '/messages' && hasUnread && (
                    <span className="ml-1 inline-block h-2 w-2 rounded-full bg-[var(--m-pop)]" />
                  )}
                  {active && (
                    <span
                      className="absolute left-3 right-3 rounded-full"
                      style={{ bottom: -10, height: 3, background: 'var(--m-ink)' }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>
        )}

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              {session.role === 'admin' && (
                <Link
                  href="/admin"
                  className="hidden h-9 items-center rounded-full px-3 text-[13px] font-semibold lg:flex"
                  style={{ color: 'var(--m-muted)' }}
                >
                  {t('header.admin')}
                </Link>
              )}
              <Link
                href="/sell"
                className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--m-pop)' }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="hidden sm:inline">{t('header.sell')}</span>
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-label={t('header.accountMenu')}
                  className="relative grid h-10 w-10 place-items-center rounded-full text-[12px] font-black text-white"
                  style={{ background: 'var(--m-ink)' }}
                >
                  {initials}
                  {(hasUnread || unreadNotifications > 0) && (
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[var(--m-pop)] ring-2 ring-white" />
                  )}
                </button>
                {accountOpen ? (
                  <>
                    <button type="button" className="fixed inset-0 z-40 cursor-default bg-transparent" onClick={() => setAccountOpen(false)} aria-label="Close account menu" />
                    <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border bg-white p-2 shadow-xl" style={{ borderColor: 'var(--m-line)' }}>
                      <p className="px-3 py-2 text-xs text-[var(--m-muted)]">{session.email}</p>
                      {[
                        [t('header.profile'), '/profile'],
                        [t('header.settings'), '/settings'],
                        [t('header.notifications'), '/notifications'],
                        [t('header.myPosts'), '/my-listings'],
                        [t('header.saved'), '/saved'],
                        [t('header.messages'), '/messages'],
                      ].map(([label, href]) => (
                        <Link key={href} href={href} onClick={() => setAccountOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[var(--m-soft)]" style={{ color: 'var(--m-ink)' }}>
                          {label}
                          {href === '/messages' && hasUnread ? <span className="h-2 w-2 rounded-full bg-[var(--m-pop)]" /> : null}
                          {href === '/notifications' && unreadNotifications > 0 ? <span className="text-xs text-[var(--m-pop)]">{unreadNotifications}</span> : null}
                        </Link>
                      ))}
                      {session.role === 'admin' ? (
                        <Link href="/admin" onClick={() => setAccountOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[var(--m-soft)]" style={{ color: 'var(--m-ink)' }}>
                          {t('header.admin')}
                        </Link>
                      ) : null}
                      <button type="button" onClick={handleSignOut} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-[var(--m-soft)]" style={{ color: 'var(--m-muted)' }}>
                        {t('header.signOut')}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <Link
              href="/sign-in?redirect=/"
              className="flex h-10 items-center rounded-full px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--m-pop)' }}
            >
              {t('header.signIn')}
            </Link>
          )}

          {/* Language toggle */}
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'ko' : 'en')}
            aria-label="Toggle language"
            className="flex h-9 shrink-0 items-center rounded-full border px-3 text-[12px] font-bold transition-colors hover:bg-[var(--m-soft)]"
            style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
          >
            {locale === 'en' ? '한국어' : 'EN'}
          </button>
        </div>
      </div>

      {/* Mobile search dropdown */}
      {mobileSearchOpen && (
        <div className="border-t px-4 py-3 sm:hidden" style={{ borderColor: 'var(--m-line)', background: 'var(--m-bg)' }}>
          <form onSubmit={handleHeaderSearch} className="flex items-center gap-2 h-11 rounded-full border bg-white px-4" style={{ borderColor: 'var(--m-line)' }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--m-muted)' }}>
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              autoFocus
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder={t('header.search')}
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--m-ink)' }}
            />
            <button type="submit" className="text-xs font-semibold" style={{ color: 'var(--m-green)' }}>{t('header.searchButton')}</button>
          </form>
        </div>
      )}
    </header>
  )
}
