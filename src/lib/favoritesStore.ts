const STORAGE_KEY = 'mason-market-saved-v1'

export interface FavoritesStore {
  getAll: (scope?: string) => string[]
  setAll: (ids: string[], scope?: string) => void
}

function storageKey(scope?: string) {
  return `${STORAGE_KEY}:${scope || 'anon'}`
}

export const localFavoritesStore: FavoritesStore = {
  getAll: (scope) => {
    if (typeof window === 'undefined') return []

    const raw = window.localStorage.getItem(storageKey(scope))
    if (!raw) return []

    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((value) => typeof value === 'string')
    } catch {
      window.localStorage.removeItem(storageKey(scope))
      return []
    }
  },
  setAll: (ids: string[], scope) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey(scope), JSON.stringify(ids))
  },
}
