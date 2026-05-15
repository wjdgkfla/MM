const normalizeEmail = (email: string) => email.trim().toLowerCase()

// Admin emails are configured via the ADMIN_EMAILS env var (comma-separated).
// In development, we keep a fallback so the app works without env config.
// In production, ADMIN_EMAILS must be set explicitly — no hidden defaults.
const DEV_FALLBACK = process.env.NODE_ENV !== 'production'
  ? ['admin@gmu.edu', 'demo-admin@gmu.edu']
  : []

const envAdminEmails =
  process.env.ADMIN_EMAILS?.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean) ?? []

export const DEV_ADMIN_EMAILS =
  envAdminEmails.length > 0 ? envAdminEmails : DEV_FALLBACK

export function isDevelopmentAdminEmail(email: string) {
  return DEV_ADMIN_EMAILS.includes(normalizeEmail(email))
}

export function resolveSessionRole(email: string) {
  return isDevelopmentAdminEmail(email) ? 'admin' : 'student'
}
