'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function useFavorites(userScope?: string) {
  const [savedIds, setSavedIds] = useState<string[]>([])
  // Track which listing IDs have an in-flight toggle to prevent double-tap race conditions
  const pendingRef = useRef(new Set<string>())

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
      // Prevent concurrent toggles for the same listing
      if (pendingRef.current.has(id)) return

      pendingRef.current.add(id)
      const isCurrentlySaved = savedSet.has(id)
      // Capture the pre-toggle state for rollback
      const previousIds = savedIds
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
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to update favorite')
          return res.json()
        })
        .then((data) => {
          if (Array.isArray(data?.listingIds)) {
            setSavedIds(data.listingIds)
          }
        })
        .catch(() => {
          // Roll back to the state before the toggle
          setSavedIds(previousIds)
        })
        .finally(() => {
          pendingRef.current.delete(id)
        })
    },
    [userScope, savedIds, savedSet]
  )

  return {
    savedIds,
    savedSet,
    isSaved: (id: string) => savedSet.has(id),
    toggleFavorite,
  }
}
