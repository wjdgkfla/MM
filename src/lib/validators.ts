export const isGmuEmail = (email: string) => {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith('@gmu.edu') || normalized.endsWith('@masonlive.gmu.edu')
}
