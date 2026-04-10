const DEFAULT_DEV_ADMIN_EMAILS = ['admin@gmu.edu', 'demo-admin@gmu.edu']

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const envAdminEmails =
  process.env.ADMIN_EMAILS?.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean) ?? []

export const DEV_ADMIN_EMAILS =
  envAdminEmails.length > 0 ? envAdminEmails : DEFAULT_DEV_ADMIN_EMAILS

export function isDevelopmentAdminEmail(email: string) {
  return DEV_ADMIN_EMAILS.includes(normalizeEmail(email))
}

export function resolveSessionRole(email: string) {
  return isDevelopmentAdminEmail(email) ? 'admin' : 'student'
}
