'use client'

import { CATEGORIES, CATEGORY_LABELS, Category } from '@/lib/types'
import { useLocale } from '@/lib/i18n/LocaleProvider'

type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc'

interface SubNavRailProps {
  category: Category | null
  onCategoryChange: (c: Category | null) => void
  sort: SortOption
  onSortChange: (s: SortOption) => void
  filterCount: number
  onFiltersOpen: () => void
  totalCount: number
  loading: boolean
}

export function SubNavRail({
  category, onCategoryChange,
  sort, onSortChange,
  filterCount, onFiltersOpen,
  totalCount, loading,
}: SubNavRailProps) {
  const { t, locale } = useLocale()

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: t('nav.sortNewest') },
    { value: 'oldest',     label: t('nav.sortOldest') },
    { value: 'price-asc',  label: t('nav.sortPriceAsc') },
    { value: 'price-desc', label: t('nav.sortPriceDesc') },
  ]

  const cats: Array<{ id: Category | null; label: string }> = [
    { id: null, label: t('nav.all') },
    ...CATEGORIES.map(c => ({ id: c, label: CATEGORY_LABELS[c] })),
  ]

  return (
    <div
      className="sticky z-40 border-b"
      style={{ top: 68, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderColor: 'var(--m-line)' }}
    >
      <div className="mx-auto flex max-w-wide flex-col gap-2 px-6 py-2 sm:h-[54px] sm:flex-row sm:items-center sm:gap-3 sm:py-0">
        {/* Category pills — horizontally scrollable */}
        <div className="flex flex-1 items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {cats.map(c => {
            const active = category === c.id
            return (
              <button
                key={String(c.id)}
                onClick={() => onCategoryChange(c.id)}
                className="shrink-0 inline-flex h-[34px] items-center rounded-full border px-[14px] text-[13px] font-semibold whitespace-nowrap transition-all"
                style={{
                  background: active ? 'var(--m-ink)' : 'white',
                  color: active ? 'white' : 'var(--m-ink)',
                  borderColor: active ? 'var(--m-ink)' : 'var(--m-line)',
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Right: filter + sort + count */}
        <div className="flex items-center justify-between gap-2 shrink-0 sm:justify-normal">
          <div className="flex items-center gap-2">
            {/* Filter button */}
            <button
              onClick={onFiltersOpen}
              className="flex h-[34px] items-center gap-1.5 rounded-full border bg-white px-3 text-[13px] font-semibold transition-colors hover:border-[var(--m-ink)]"
              style={{ borderColor: filterCount > 0 ? 'var(--m-ink)' : 'var(--m-line)', color: 'var(--m-ink)' }}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 6h10M4 12h6M4 18h14"/><circle cx="18" cy="6" r="2"/><circle cx="14" cy="12" r="2"/><circle cx="20" cy="18" r="2"/>
              </svg>
              {t('nav.filters')}
              {filterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: 'var(--m-ink)' }}>
                  {filterCount}
                </span>
              )}
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sort}
                onChange={e => onSortChange(e.target.value as SortOption)}
                className="h-[34px] cursor-pointer appearance-none rounded-full border bg-white py-0 pl-3 pr-8 text-[13px] font-semibold outline-none transition-colors hover:border-[var(--m-ink)]"
                style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--m-muted)' }}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Count (right edge) */}
          {!loading && (
            <p className="flex shrink-0 items-center gap-1.5 text-[12px]" style={{ color: 'var(--m-muted)' }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--m-green)' }} />
              {locale === 'ko'
                ? `${totalCount}${t('nav.listings')}`
                : `${totalCount} ${totalCount === 1 ? t('nav.listing') : t('nav.listings')}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
