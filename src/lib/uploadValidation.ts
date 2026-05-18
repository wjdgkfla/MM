const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type ValidationResult = { ok: true } | { ok: false; error: string }

function hasJpegSignature(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function hasPngSignature(bytes: Uint8Array) {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return png.every((value, index) => bytes[index] === value)
}

function hasWebpSignature(bytes: Uint8Array) {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
}

function typeMatchesBytes(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg') return hasJpegSignature(bytes)
  if (type === 'image/png') return hasPngSignature(bytes)
  if (type === 'image/webp') return hasWebpSignature(bytes)
  return false
}

export async function validateImageFile(file: File): Promise<ValidationResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: 'Only JPG, PNG, and WebP images are allowed.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `"${file.name}" exceeds the 5MB limit. Please resize it and try again.` }
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!typeMatchesBytes(file.type, header)) {
    return { ok: false, error: `"${file.name}" does not appear to be a valid image file.` }
  }

  return { ok: true }
}

export function extensionForImageType(type: string) {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}
