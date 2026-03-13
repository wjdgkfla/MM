import { UserRole } from '@/lib/types'

export interface AuthSession {
  userId: string
  role: UserRole
  email: string
  displayName: string
  gmuVerified: boolean
  issuedAt: string
}
