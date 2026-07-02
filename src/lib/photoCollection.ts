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

/**
 * Given a photo collection index and an action applied to that collection,
 * returns where the item at that index ends up afterward. Used to keep a
 * "cover photo" selection pointed at the same photo when other photos are
 * reordered or removed around it — not just when the cover itself moves.
 */
export function adjustIndexForPhotoAction(index: number, action: PhotoAction): number {
  if (action.type === 'remove') {
    // When the tracked index is the one removed, the item that slides into
    // its slot (if any) becomes the new selection — matches how the rest of
    // the array shifts, rather than resetting to the start.
    return index > action.index ? index - 1 : index
  }

  if (action.from === action.to) return index
  if (index === action.from) return action.to
  if (action.from < index && index <= action.to) return index - 1
  if (action.to <= index && index < action.from) return index + 1
  return index
}

export function getCoverImageUrl(imageUrls: string[], requestedCover?: string | null): string | undefined {
  const images = imageUrls.filter(Boolean)
  if (requestedCover && images.includes(requestedCover)) return requestedCover
  return images[0]
}
