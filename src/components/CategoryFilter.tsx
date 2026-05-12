'use client'

import { Category, CATEGORY_LABELS, CATEGORIES } from '@/lib/types'

interface CategoryFilterProps {
  selected: Category | null
  onSelect: (category: Category | null) => void
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`ui-pill whitespace-nowrap ${
          !selected ? 'ui-pill-active' : 'ui-pill-neutral'
        }`}
      >
        All
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`ui-pill whitespace-nowrap ${
            selected === category ? 'ui-pill-active' : 'ui-pill-neutral'
          }`}
        >
          {CATEGORY_LABELS[category]}
        </button>
      ))}
    </div>
  )
}
