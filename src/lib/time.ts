export function formatRecency(isoDate: string) {
  const postedAt = new Date(isoDate).getTime()
  const now = Date.now()

  if (Number.isNaN(postedAt)) return 'Recently'

  const diffMs = Math.max(now - postedAt, 0)
  const minutes = Math.floor(diffMs / (1000 * 60))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function formatPostedDate(isoDate: string) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'recently'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
