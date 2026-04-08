'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useFavorites } from '@/lib/useFavorites'
import { useAuthSession } from '@/lib/auth/useAuthSession'

export function Header() {
  const { session } = useAuthSession()
  const { savedIds } = useFavorites(session?.userId)
  const pathname = usePathname()
  const router = useRouter()
  const isHomePage = pathname === '/'
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

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--air-border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mason-green)] shadow-sm">
            <span className="text-xl font-bold text-[var(--mason-gold)]">M</span>
          </div>
          <span className="hidden text-xl font-semibold tracking-[-0.02em] text-[var(--air-text)] sm:inline">
            Mason Market
          </span>
        </Link>

        <div className={`hidden flex-1 px-3 lg:justify-center ${isHomePage ? 'lg:hidden' : 'lg:flex'}`}>
          <form onSubmit={handleHeaderSearch} className="flex h-12 w-full max-w-[560px] items-center rounded-full border border-[var(--air-border)] bg-white px-4 shadow-[var(--air-shadow)] transition-colors focus-within:border-[var(--mason-green)]/60">
            <input
              type="search"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search listings by item, category, or campus"
              className="flex-1 bg-transparent text-sm text-[var(--air-text)] outline-none placeholder:text-[var(--air-muted)]"
            />
            <button type="submit" className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--mason-green)] text-white transition-colors hover:bg-[var(--mason-green-dark)]" aria-label="Search">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M10.5 3a7.5 7.5 0 015.96 12.05l4.24 4.24a1 1 0 11-1.42 1.42l-4.24-4.24A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"
                />
              </svg>
            </button>
          </form>
        </div>

        <div className="flex items-center gap-1 text-sm sm:gap-2">
          {session ? (
            <>
              <Link href="/saved" className="rounded-full px-3 py-2 font-medium text-[var(--air-muted)] transition-colors hover:bg-[var(--air-chip)] hover:text-[var(--air-text)]">
                Saved {savedIds.length > 0 ? `(${savedIds.length})` : ''}
              </Link>
              <Link href="/messages" className="rounded-full px-3 py-2 font-medium text-[var(--air-muted)] transition-colors hover:bg-[var(--air-chip)] hover:text-[var(--air-text)]">
                Messages
              </Link>
              <Link href="/my-listings" className="hidden rounded-full px-3 py-2 font-medium text-[var(--air-muted)] transition-colors hover:bg-[var(--air-chip)] hover:text-[var(--air-text)] sm:inline-flex">
                My Listings
              </Link>
              {session.role === 'admin' ? (
                <Link href="/admin" className="hidden rounded-full px-3 py-2 font-medium text-[var(--air-muted)] transition-colors hover:bg-[var(--air-chip)] hover:text-[var(--air-text)] sm:inline-flex">
                  Admin
                </Link>
              ) : null}
              <Link href="/sell" className="rounded-full bg-[var(--mason-green)] px-4 py-2 font-semibold text-white transition-colors hover:bg-[var(--mason-green-dark)]">
                Sell
              </Link>
              <div className="hidden items-center gap-2 rounded-full border border-[var(--air-border)] bg-white px-3 py-1.5 lg:flex">
                <span className="max-w-24 truncate text-xs font-medium text-[var(--air-text)]">{session.displayName}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    session.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-[#e8f4ee] text-[var(--mason-green)]'
                  }`}
                >
                  {session.role === 'admin' ? 'Admin' : 'Student'}
                </span>
              </div>
              <button type="button" onClick={handleSignOut} className="rounded-full px-3 py-2 font-medium text-[var(--air-muted)] transition-colors hover:bg-[var(--air-chip)] hover:text-[var(--air-text)]">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/sign-in?redirect=/" className="rounded-full bg-[var(--mason-green)] px-4 py-2 font-semibold text-white transition-colors hover:bg-[var(--mason-green-dark)]">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
