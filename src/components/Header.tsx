'use client'

import Link from 'next/link'
import { useFavorites } from '@/lib/useFavorites'
import { useAuthSession } from '@/lib/auth/useAuthSession'

export function Header() {
  const { session } = useAuthSession()
  const { savedIds } = useFavorites(session?.userId)

  const handleSignOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#006633] flex items-center justify-center">
            <span className="text-[#FFCC00] font-bold text-xl">M</span>
          </div>
          <span className="font-bold text-xl text-[#006633] hidden sm:inline">Mason Market</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          <Link href="/saved" className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-[#006633] transition-colors font-medium">
            Saved {savedIds.length > 0 ? `(${savedIds.length})` : ''}
          </Link>
          <Link href="/messages" className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-[#006633] transition-colors font-medium">
            Messages
          </Link>
          {session ? (
            <Link href="/my-listings" className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-[#006633] transition-colors font-medium">
              My Listings
            </Link>
          ) : null}
          {session?.role === 'admin' ? (
            <Link href="/admin" className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-[#006633] transition-colors font-medium">
              Admin
            </Link>
          ) : null}
          <Link href="/sell" className="rounded-xl bg-[#006633] px-3 py-2 text-white font-medium hover:bg-[#005a2b] transition-colors">
            Sell
          </Link>
          {session ? (
            <>
              <span className="hidden sm:inline text-gray-500 text-xs">{session.displayName}</span>
              <button type="button" onClick={handleSignOut} className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-[#006633] transition-colors font-medium">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/sign-in" className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-[#006633] transition-colors font-medium">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
