import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-[var(--m-line)] bg-white py-8">
      <div className="mx-auto w-full max-w-[1160px] px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-base font-semibold text-[var(--m-ink)]">Mason Market</p>
            <p className="mt-0.5 text-sm text-[var(--m-muted)]">The student marketplace for George Mason University</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[var(--m-muted)]">
            <Link href="/" className="hover:text-[var(--m-green)]">Browse</Link>
            <Link href="/sell" className="hover:text-[var(--m-green)]">Sell</Link>
            <Link href="/saved" className="hover:text-[var(--m-green)]">Saved</Link>
            <Link href="/messages" className="hover:text-[var(--m-green)]">Messages</Link>
          </nav>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--m-muted)]">
          © {new Date().getFullYear()} Mason Market · GMU students only · Meet on campus · Check items before payment
        </p>
      </div>
    </footer>
  )
}
