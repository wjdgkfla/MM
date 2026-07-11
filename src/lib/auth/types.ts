import { UserRole } from '@/lib/types'

export interface AuthSession {
  userId: string
  role: UserRole
  email: string
  displayName: string
  gmuVerified: boolean
  issuedAt: string
  // The user's session_version at issue time. Checked against the current
  // DB value on every request so a password reset can invalidate any
  // already-issued cookie (see getSessionFromRequest in session.ts).
  sessionVersion: number
}
