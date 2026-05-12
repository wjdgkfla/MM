'use client'

import { Category, CATEGORY_LABELS, CATEGORIES } from '@/lib/types'

interface CategoryFilterProps {
  selected: Category | null
  onSelect: (category: Category | null) => void
}

const ACTIVE_PILL = 'h-9 px-3.5 rounded-full border text-[13px] font-semibold transition shrink-0 inline-flex items-center gap-1.5 bg-[var(--m-ink)] text-white border-[var(--m-ink)]'
const INACTIVE_PILL = 'h-9 px-3.5 rounded-full border text-[13px] font-semibold transition shrink-0 inline-flex items-center gap-1.5 bg-white text-[var(--m-ink)] border-[var(--m-line)] hover:border-[var(--m-ink)]'

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`whitespace-nowrap ${!selected ? ACTIVE_PILL : INACTIVE_PILL}`}
      >
        All
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`whitespace-nowrap ${selected === category ? ACTIVE_PILL : INACTIVE_PILL}`}
        >
          {CATEGORY_LABELS[category]}
        </button>
      ))}
    </div>
  )
}
