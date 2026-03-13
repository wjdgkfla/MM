'use client'

import { useEffect, useMemo, useState } from 'react'
import { localFavoritesStore } from '@/lib/favoritesStore'

export function useFavorites(userScope?: string) {
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => {
    setSavedIds(localFavoritesStore.getAll(userScope))
  }, [userScope])

  const savedSet = useMemo(() => new Set(savedIds), [savedIds])

  const toggleFavorite = (id: string) => {
    setSavedIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [id, ...current]
      localFavoritesStore.setAll(next, userScope)
      return next
    })
  }

  return {
    savedIds,
    savedSet,
    isSaved: (id: string) => savedSet.has(id),
    toggleFavorite,
  }
}
