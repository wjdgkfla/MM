import Link from 'next/link'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME } from '@/lib/auth/constants'
import { DEV_ADMIN_EMAILS } from '@/lib/auth/devAdmin'
import { decodeSession } from '@/lib/auth/session'
import { AdminModerationClient } from './AdminModerationClient'

export default function AdminPage() {
  const rawSession = cookies().get(AUTH_COOKIE_NAME)?.value
  const session = decodeSession(rawSession)

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="ui-surface p-6 text-center">
          <h1 className="font-display text-[32px] font-black" style={{ color: 'var(--m-ink)' }}>Admin access requires sign-in</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--m-muted)' }}>Use the seeded demo admin account to review marketplace activity.</p>
          <p className="mt-2 text-xs" style={{ color: 'var(--m-muted)' }}>Demo admin emails: {DEV_ADMIN_EMAILS.join(', ')}</p>
          <Link href="/sign-in?redirect=/admin" className="ui-btn-primary mt-4 inline-flex">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (session.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="ui-surface p-6 text-center">
          <h1 className="font-display text-[32px] font-black" style={{ color: 'var(--m-ink)' }}>Admin only</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--m-muted)' }}>
            You are signed in as {session.displayName} ({session.email}) with the <span className="font-medium">{session.role}</span> role.
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--m-muted)' }}>
            This account can use marketplace features, but it does not have access to the admin moderation tools.
          </p>
          <p className="mt-2 text-xs" style={{ color: 'var(--m-muted)' }}>For demo testing, sign out and use: {DEV_ADMIN_EMAILS.join(', ')}</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium" style={{ color: 'var(--m-green)' }}>
            Back to browse feed
          </Link>
        </div>
      </div>
    )
  }

  return <AdminModerationClient adminName={session.displayName} adminEmail={session.email} />
}
