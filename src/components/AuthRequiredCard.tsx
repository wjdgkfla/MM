import Link from 'next/link'

type AuthRequiredCardProps = {
  title: string
  description: string
  redirectTo: string
}

export function AuthRequiredCard({ title, description, redirectTo }: AuthRequiredCardProps) {
  return (
    <div className="ui-surface p-6 text-center">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Link href={`/sign-in?redirect=${encodeURIComponent(redirectTo)}`} className="ui-btn-primary">
          Sign in
        </Link>
        <Link href={`/sign-up?redirect=${encodeURIComponent(redirectTo)}`} className="ui-btn-secondary">
          Sign up
        </Link>
      </div>
    </div>
  )
}
