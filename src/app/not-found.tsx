import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f4ee]">
          <span className="text-3xl font-bold text-[#006633]">M</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-600">
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
