export type PhotoAction =
  | { type: 'move'; from: number; to: number }
  | { type: 'remove'; index: number }

export function applyPhotoAction<T>(items: T[], action: PhotoAction): T[] {
  const images = items.filter(Boolean)

  if (action.type === 'remove') {
    if (action.index < 0 || action.index >= images.length) return images
    return images.filter((_, index) => index !== action.index)
  }

  if (action.from < 0 || action.from >= images.length) return images
  if (action.to < 0 || action.to >= images.length) return images
  if (action.from === action.to) return images

  const next = [...images]
  const [moved] = next.splice(action.from, 1)
  next.splice(action.to, 0, moved)
  return next
}

export function getCoverImageUrl(imageUrls: string[], requestedCover?: string | null): string | undefined {
  const images = imageUrls.filter(Boolean)
  if (requestedCover && images.includes(requestedCover)) return requestedCover
  return images[0]
}
