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
        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
          !selected ? 'bg-[#006633] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All Items
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
            selected === category
              ? 'bg-[#006633] text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {CATEGORY_LABELS[category]}
        </button>
      ))}
    </div>
  )
}
