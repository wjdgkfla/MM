'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthSession } from '@/lib/auth/useAuthSession'
import { Conversation } from '@/lib/data/contracts'

export function Header() {
  const { session } = useAuthSession()
  const pathname = usePathname()
  const router = useRouter()
  const [headerSearch, setHeaderSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    if (!session) return

    const checkUnread = async () => {
      try {
        const res = await fetch('/api/messages')
        if (!res.ok) return
        const conversations = (await res.json()) as Conversation[]
        if (!Array.isArray(conversations) || conversations.length === 0) return
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
    if (pathname === '/messages') {
      setHasUnread(false)
    }
  }, [pathname])

  const handleSignOut = async () => {
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
    { href: '/', label: 'Browse' },
    { href: '/saved', label: 'Saved' },
    { href: '/messages', label: 'Messages' },
    { href: '/my-listings', label: 'My posts' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--m-bg)]/85 backdrop-blur-xl" style={{ borderColor: 'var(--m-line)' }}>
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-4 px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Mason Market"
            width={140}
            height={48}
            className="h-10 w-auto object-contain"
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
            placeholder="Search campus listings…"
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
                  Admin
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
                <span className="hidden sm:inline">Sell</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden h-9 items-center rounded-full px-3 text-[13px] font-semibold transition-colors lg:flex"
                style={{ color: 'var(--m-muted)' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/sign-in?redirect=/"
              className="flex h-10 items-center rounded-full px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--m-pop)' }}
            >
              Sign in
            </Link>
          )}
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
              placeholder="Search campus listings…"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--m-ink)' }}
            />
            <button type="submit" className="text-xs font-semibold" style={{ color: 'var(--m-green)' }}>Search</button>
          </form>
        </div>
      )}
    </header>
  )
}
