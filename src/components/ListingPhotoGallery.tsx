'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

type ListingPhotoGalleryProps = {
  images: string[]
  title: string
  coverImageUrl?: string
}

const FALLBACK_IMAGE = '/listings/moving-boxes.svg'

export function ListingPhotoGallery({ images, title, coverImageUrl }: ListingPhotoGalleryProps) {
  const gallery = useMemo(() => {
    const deduped = Array.from(new Set(images.filter(Boolean)))
    const sorted = coverImageUrl && deduped.includes(coverImageUrl)
      ? [coverImageUrl, ...deduped.filter((image) => image !== coverImageUrl)]
      : deduped
    return sorted.length > 0 ? sorted : [FALLBACK_IMAGE]
  }, [coverImageUrl, images])
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  const selectedImage = gallery[Math.min(activeIndex, gallery.length - 1)]
  const canGoPrevious = activeIndex > 0
  const canGoNext = activeIndex < gallery.length - 1

  const go = (direction: -1 | 1) => {
    setActiveIndex((current) => Math.min(gallery.length - 1, Math.max(0, current + direction)))
  }

  const handleTouchEnd = (x: number) => {
    if (touchStart == null) return
    const delta = x - touchStart
    if (Math.abs(delta) > 40) go(delta > 0 ? -1 : 1)
    setTouchStart(null)
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border bg-[var(--m-soft)] aspect-[4/3]" style={{ borderColor: 'var(--m-line)' }}>
        <button type="button" onClick={() => setLightboxOpen(true)} className="absolute inset-0">
          <Image src={selectedImage} alt={title} fill className="object-cover" priority unoptimized={selectedImage.startsWith('data:')} />
        </button>
      </div>

      {gallery.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {gallery.map((image, index) => (
            <button
              type="button"
              key={`${image}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`relative overflow-hidden rounded-xl border aspect-square ${
                index === activeIndex ? 'border-[var(--m-green)]' : 'border-[var(--m-line)]'
              }`}
            >
              <Image src={image} alt={`${title} ${index + 1}`} fill className="object-cover" unoptimized={image.startsWith('data:')} />
            </button>
          ))}
        </div>
      ) : null}

      {lightboxOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4" onClick={() => setLightboxOpen(false)}>
          <div
            className="relative h-[82vh] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            <Image src={selectedImage} alt={title} fill className="object-contain" unoptimized={selectedImage.startsWith('data:')} />
            <button type="button" onClick={() => setLightboxOpen(false)} aria-label="Close photo viewer" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[var(--m-ink)]">
              <span aria-hidden="true">x</span>
            </button>
            {canGoPrevious ? (
              <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[var(--m-ink)]">
                <span aria-hidden="true">&lt;</span>
              </button>
            ) : null}
            {canGoNext ? (
              <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[var(--m-ink)]">
                <span aria-hidden="true">&gt;</span>
              </button>
            ) : null}
            {gallery.length > 1 ? (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-3 py-2">
                {gallery.map((image, index) => (
                  <button key={image} type="button" aria-label={`Photo ${index + 1}`} onClick={() => setActiveIndex(index)} className="h-2 rounded-full" style={{ width: index === activeIndex ? 18 : 8, background: index === activeIndex ? 'white' : 'rgba(255,255,255,0.45)' }} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
