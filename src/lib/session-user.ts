import { SessionUser } from '@/lib/types'

const STORAGE_KEY = 'mason-market-session-user'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const isGmuEmail = (email: string) => {
  const normalized = normalizeEmail(email)
  return normalized.endsWith('@gmu.edu') || normalized.endsWith('@masonlive.gmu.edu')
}

export const userIdFromEmail = (email: string) => {
  const normalized = normalizeEmail(email)
  return `stu-${normalized.replace(/[^a-z0-9]/g, '-')}`
}

export const getSessionUser = (): SessionUser | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as SessionUser
    if (!parsed?.id || !parsed?.name || !parsed?.email) return null
    return {
      id: String(parsed.id),
      name: String(parsed.name),
      email: normalizeEmail(parsed.email),
    }
  } catch {
    return null
  }
}

export const saveSessionUser = (name: string, email: string): SessionUser => {
  const normalizedEmail = normalizeEmail(email)
  const user: SessionUser = {
    id: userIdFromEmail(normalizedEmail),
    name: name.trim(),
    email: normalizedEmail,
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }
  return user
}
