'use client'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search textbooks, dorm items, electronics, and more...'
}: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ui-input pl-10 pr-4"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
    </div>
  )
}
