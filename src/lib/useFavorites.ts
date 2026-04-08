'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export function useFavorites(userScope?: string) {
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => {
    if (!userScope) {
      setSavedIds([])
      return
    }

    fetch('/api/favorites', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.listingIds)) {
          setSavedIds(data.listingIds)
        }
      })
      .catch(() => setSavedIds([]))
  }, [userScope])

  const savedSet = useMemo(() => new Set(savedIds), [savedIds])

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!userScope) return

      const isCurrentlySaved = savedIds.includes(id)
      const optimistic = isCurrentlySaved
        ? savedIds.filter((item) => item !== id)
        : [id, ...savedIds]
      setSavedIds(optimistic)

      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listingId: id,
          action: isCurrentlySaved ? 'remove' : 'add',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data?.listingIds)) {
            setSavedIds(data.listingIds)
          }
        })
        .catch(() => {
          setSavedIds(savedIds)
        })
    },
    [userScope, savedIds]
  )

  return {
    savedIds,
    savedSet,
    isSaved: (id: string) => savedSet.has(id),
    toggleFavorite,
  }
}
