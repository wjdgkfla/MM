import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-[var(--air-border)] bg-white py-8">
      <div className="mx-auto w-full max-w-[1160px] px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-base font-semibold text-[var(--air-text)]">Mason Market</p>
            <p className="mt-0.5 text-sm text-[var(--air-muted)]">The student marketplace for George Mason University</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[var(--air-muted)]">
            <Link href="/" className="hover:text-[var(--mason-green)]">Browse</Link>
            <Link href="/sell" className="hover:text-[var(--mason-green)]">Sell</Link>
            <Link href="/saved" className="hover:text-[var(--mason-green)]">Saved</Link>
            <Link href="/messages" className="hover:text-[var(--mason-green)]">Messages</Link>
          </nav>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--air-muted)]">
          © {new Date().getFullYear()} Mason Market · GMU students only · Meet on campus · Check items before payment
        </p>
      </div>
    </footer>
  )
}
