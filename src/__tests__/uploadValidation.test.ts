/**
 * uploadValidation.test.ts
 * Tests magic-byte verification and MIME type restrictions for image uploads.
 */

import { validateImageFile, extensionForImageType } from '@/lib/uploadValidation'

// ── Minimal valid file headers (magic bytes) ─────────────────────────────────
const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01])
const PNG_MAGIC  = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52])
const WEBP_MAGIC = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x00, 0x00, 0x00, 0x00])
const SVG_BYTES  = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
const HTML_BYTES = new TextEncoder().encode('<!DOCTYPE html><html></html>')

function makeFile(name: string, type: string, bytes: Uint8Array, sizeBytes = bytes.length): File {
  // For oversized tests we create a minimal file with the right `size` reported
  const blob = new Blob([bytes], { type })
  Object.defineProperty(blob, 'size', { value: sizeBytes })
  return new File([blob], name, { type })
}

describe('validateImageFile — allowed types', () => {
  it('accepts a valid JPEG', async () => {
    const file = makeFile('photo.jpg', 'image/jpeg', JPEG_MAGIC)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(true)
  })

  it('accepts a valid PNG', async () => {
    const file = makeFile('photo.png', 'image/png', PNG_MAGIC)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(true)
  })

  it('accepts a valid WebP', async () => {
    const file = makeFile('photo.webp', 'image/webp', WEBP_MAGIC)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(true)
  })
})

describe('validateImageFile — blocked types', () => {
  it('rejects SVG (even with image/svg+xml MIME)', async () => {
    const file = makeFile('icon.svg', 'image/svg+xml', SVG_BYTES)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/jpg|png|webp/i)
  })

  it('rejects HTML file disguised as JPEG', async () => {
    const file = makeFile('hack.jpg', 'image/jpeg', HTML_BYTES)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/valid image/i)
  })

  it('rejects a PNG file with wrong MIME type', async () => {
    // PNG bytes but claimed as JPEG — magic bytes mismatch
    const file = makeFile('trick.jpg', 'image/jpeg', PNG_MAGIC)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(false)
  })

  it('rejects a JPEG file with wrong MIME type', async () => {
    const file = makeFile('trick.png', 'image/png', JPEG_MAGIC)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(false)
  })

  it('rejects image/gif', async () => {
    const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    const file = makeFile('anim.gif', 'image/gif', gifBytes)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(false)
  })

  it('rejects application/pdf', async () => {
    const pdfBytes = new TextEncoder().encode('%PDF-1.4')
    const file = makeFile('doc.pdf', 'application/pdf', pdfBytes)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(false)
  })
})

describe('validateImageFile — size limit', () => {
  it('rejects files over 5 MB', async () => {
    const file = makeFile('huge.jpg', 'image/jpeg', JPEG_MAGIC, 5 * 1024 * 1024 + 1)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/5MB|limit/i)
  })

  it('accepts files exactly at 5 MB', async () => {
    const file = makeFile('max.jpg', 'image/jpeg', JPEG_MAGIC, 5 * 1024 * 1024)
    const result = await validateImageFile(file)
    expect(result.ok).toBe(true)
  })
})

describe('extensionForImageType', () => {
  it('returns jpg for image/jpeg', () => expect(extensionForImageType('image/jpeg')).toBe('jpg'))
  it('returns png for image/png',  () => expect(extensionForImageType('image/png')).toBe('png'))
  it('returns webp for image/webp', () => expect(extensionForImageType('image/webp')).toBe('webp'))
  it('falls back to jpg for unknown', () => expect(extensionForImageType('image/tiff')).toBe('jpg'))
})
