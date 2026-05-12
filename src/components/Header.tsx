'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthSession } from '@/lib/auth/useAuthSession'

export function Header() {
  const { session } = useAuthSession()
  const pathname = usePathname()
  const router = useRouter()
  const [headerSearch, setHeaderSearch] = useState('')

  const handleSignOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    window.location.href = '/'
  }

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = headerSearch.trim()
    router.push(q ? `/?search=${encodeURIComponent(q)}` : '/')
    setHeaderSearch('')
  }

  const navLinks = [
    { href: '/', label: 'Browse' },
    { href: '/saved', label: 'Saved' },
    { href: '/messages', label: 'Messages' },
    { href: '/my-listings', label: 'My posts' },
  ]

  return (
    <header className="sticky top-0 z-30 border-b bg-[var(--m-bg)]/85 backdrop-blur-xl" style={{ borderColor: 'var(--m-line)' }}>
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-4 px-6">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center font-display font-black text-white"
            style={{ background: 'var(--m-ink)', borderRadius: 'var(--r-tile)', fontSize: 18, lineHeight: 1 }}
          >
            M
          </div>
          <span className="font-display hidden text-[19px] font-black tracking-tight sm:block" style={{ color: 'var(--m-ink)' }}>
            Mason Market
          </span>
        </Link>

        {/* Search */}
        <form
          onSubmit={handleHeaderSearch}
          className="flex flex-1 max-w-[480px] items-center gap-2 h-11 rounded-full border bg-white px-4 transition-colors focus-within:border-[var(--m-ink)]"
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
                Sell
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
    </header>
  )
}
