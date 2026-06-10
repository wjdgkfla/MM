export const isGmuEmail = (email: string) => {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith('@gmu.edu') || normalized.endsWith('@masonlive.gmu.edu')
}

// User/listing ids are Supabase UUIDs or internal nanoids — both match this.
// Anything else (PostgREST filter syntax, path tricks) is rejected before the
// value reaches a .or() filter string.
export const isValidEntityId = (id: string) => /^[A-Za-z0-9-]{1,64}$/.test(id)

// Only same-origin relative paths are safe post-auth redirect targets.
// '//evil.com' and '/\evil.com' are protocol-relative escapes; reject both.
export const sanitizeRedirectPath = (value: string | null | undefined): string => {
  if (!value || !value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}
