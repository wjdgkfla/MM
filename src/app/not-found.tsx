import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--m-soft)' }}>
          <span className="text-3xl font-bold" style={{ color: 'var(--m-green)' }}>M</span>
        </div>
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--m-ink)' }}>Page not found</h1>
        <p className="mt-2" style={{ color: 'var(--m-muted)' }}>
          This listing may have been removed, or the link might be wrong.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="ui-btn-primary">
            Browse listings
          </Link>
          <Link href="/sell" className="ui-btn-secondary">
            Post an item
          </Link>
        </div>
      </div>
    </div>
  )
}
