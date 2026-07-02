'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Locale, TranslationKey, translations } from './translations'

const STORAGE_KEY = 'mm_locale'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // Reading localStorage during the initial render (rather than here, in a
  // post-mount effect) causes a React hydration mismatch: the server always
  // renders English (it has no access to localStorage), so if the client's
  // very first render immediately produced Korean, React can't reconcile the
  // SSR'd English HTML against it and throws a "Recoverable Error", forcing
  // the whole tree to be discarded and re-rendered client-side. Starting
  // from 'en' here guarantees the first client render always matches the
  // server; this effect then applies the real preference right after.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'ko') setLocaleState(stored)
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const t = useCallback((key: TranslationKey) => {
    return translations[locale][key] ?? translations.en[key] ?? key
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider')
  return ctx
}
