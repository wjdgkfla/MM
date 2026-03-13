import Link from 'next/link'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants'
import { decodeSession } from '@/lib/auth/session'
import { AdminModerationClient } from './AdminModerationClient'

export default function AdminPage() {
  const rawSession = cookies().get(AUTH_COOKIE_NAME)?.value
  const session = decodeSession(rawSession)

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="ui-surface p-6 text-center">
          <h1 className="text-2xl font-bold text-[#006633]">Admin access requires sign-in</h1>
          <p className="mt-2 text-sm text-gray-600">Use the seeded admin account to review marketplace activity.</p>
          <Link href="/sign-in?redirect=/admin" className="ui-btn-primary mt-4 inline-flex">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (session.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="ui-surface p-6 text-center">
          <h1 className="text-2xl font-bold text-[#006633]">Admin only</h1>
          <p className="mt-2 text-sm text-gray-600">Your account can use marketplace features but does not have admin privileges.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-[#006633]">
            Back to browse feed
          </Link>
        </div>
      </div>
    )
  }

  return <AdminModerationClient adminName={session.displayName} adminEmail={session.email} />
}
