'use client'

import type { FormEvent } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: () => void
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search textbooks, dorm items, electronics, and more...',
  onSubmit
}: SearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.()
  }

  return (
    <form className="relative flex items-center" onSubmit={handleSubmit}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ui-input rounded-full pl-5 pr-14"
      />
      <button
        type={onSubmit ? 'submit' : 'button'}
        className={`absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--mason-green)] text-white ${
          onSubmit ? 'transition-colors hover:bg-[var(--mason-green-dark)]' : 'pointer-events-none'
        }`}
        aria-label="Search"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10.5 3a7.5 7.5 0 015.96 12.05l4.24 4.24a1 1 0 11-1.42 1.42l-4.24-4.24A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"
          />
        </svg>
      </button>
    </form>
  )
}
