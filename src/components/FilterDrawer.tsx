'use client'

import { useEffect } from 'react'
import {
  CAMPUS_LOCATIONS,
  CONDITIONS,
  PICKUP_ZONES,
  CampusLocation,
  Condition,
  CONDITION_LABELS,
  LOCATION_LABELS,
  PICKUP_ZONE_LABELS,
  PickupZone,
} from '@/lib/types'

export interface FilterState {
  campusLocation: CampusLocation | ''
  pickupZone: PickupZone | ''
  condition: Condition | ''
  status: 'available' | 'reserved' | ''
  minPrice: string
  maxPrice: string
  freeOnly: boolean
  courseTag: string
}

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  filters: FilterState
  onChange: (f: Partial<FilterState>) => void
  onReset: () => void
  totalCount: number
  loading: boolean
}

export function FilterDrawer({ open, onClose, filters, onChange, onReset, totalCount, loading }: FilterDrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  // Lock scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const activeCount =
    (filters.campusLocation ? 1 : 0) +
    (filters.pickupZone ? 1 : 0) +
    (filters.condition ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.freeOnly ? 1 : 0) +
    (filters.courseTag ? 1 : 0)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'rgba(15,22,17,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 right-0 top-0 z-50 flex flex-col border-l bg-white"
        style={{
          width: 380,
          borderColor: 'var(--m-line)',
          transform: open ? 'none' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--m-line)' }}>
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--m-ink)' }}>Filters</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--m-soft)]" style={{ color: 'var(--m-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">

          {/* Condition */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--m-muted)' }}>Condition</p>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => {
                const on = filters.condition === c
                return (
                  <button key={c} onClick={() => onChange({ condition: on ? '' : c })}
                    className="inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-all"
                    style={{ background: on ? 'var(--m-ink)' : 'white', color: on ? 'white' : 'var(--m-ink)', borderColor: on ? 'var(--m-ink)' : 'var(--m-line)', cursor: 'pointer' }}>
                    {CONDITION_LABELS[c]}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Status */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--m-muted)' }}>Status</p>
            <div className="flex flex-wrap gap-2">
              {(['available', 'reserved'] as const).map(s => {
                const on = filters.status === s
                return (
                  <button key={s} onClick={() => onChange({ status: on ? '' : s })}
                    className="inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-all"
                    style={{ background: on ? 'var(--m-ink)' : 'white', color: on ? 'white' : 'var(--m-ink)', borderColor: on ? 'var(--m-ink)' : 'var(--m-line)', cursor: 'pointer' }}>
                    {s === 'available' ? 'Available' : 'Reserved'}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Campus */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--m-muted)' }}>Campus</p>
            <div className="flex flex-wrap gap-2">
              {CAMPUS_LOCATIONS.map(loc => {
                const on = filters.campusLocation === loc
                return (
                  <button key={loc} onClick={() => onChange({ campusLocation: on ? '' : loc, pickupZone: '' })}
                    className="inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-all"
                    style={{ background: on ? 'var(--m-ink)' : 'white', color: on ? 'white' : 'var(--m-ink)', borderColor: on ? 'var(--m-ink)' : 'var(--m-line)', cursor: 'pointer' }}>
                    {LOCATION_LABELS[loc]}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Pickup zone */}
          {filters.campusLocation && (
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--m-muted)' }}>Pickup zone</p>
              <div className="flex flex-wrap gap-2">
                {PICKUP_ZONES.map(z => {
                  const on = filters.pickupZone === z
                  return (
                    <button key={z} onClick={() => onChange({ pickupZone: on ? '' : z })}
                      className="inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-all"
                      style={{ background: on ? 'var(--m-ink)' : 'white', color: on ? 'white' : 'var(--m-ink)', borderColor: on ? 'var(--m-ink)' : 'var(--m-line)', cursor: 'pointer' }}>
                      {PICKUP_ZONE_LABELS[z]}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Price range */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--m-muted)' }}>Price range</p>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Min $" value={filters.minPrice}
                onChange={e => onChange({ minPrice: e.target.value })}
                className="h-11 w-full rounded-2xl border bg-white px-3 text-[13px] outline-none"
                style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}/>
              <span style={{ color: 'var(--m-muted)' }}>—</span>
              <input type="number" placeholder="Max $" value={filters.maxPrice}
                onChange={e => onChange({ maxPrice: e.target.value })}
                className="h-11 w-full rounded-2xl border bg-white px-3 text-[13px] outline-none"
                style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}/>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] font-medium" style={{ color: 'var(--m-ink)' }}>
              <input type="checkbox" checked={filters.freeOnly} onChange={e => onChange({ freeOnly: e.target.checked })}
                className="h-4 w-4" style={{ accentColor: 'var(--m-green)' }}/>
              Free items only
            </label>
          </section>

          {/* Course code */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--m-muted)' }}>Course code</p>
            <input
              type="text"
              placeholder="e.g. MATH 113, CS 310"
              value={filters.courseTag}
              onChange={e => onChange({ courseTag: e.target.value })}
              className="h-11 w-full rounded-2xl border bg-white px-4 text-[13px] outline-none"
              style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)' }}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t px-5 py-4" style={{ borderColor: 'var(--m-line)' }}>
          <button onClick={onReset}
            className="h-11 flex-1 rounded-2xl border text-[13px] font-semibold transition-colors hover:bg-[var(--m-soft)]"
            style={{ borderColor: 'var(--m-line)', color: 'var(--m-ink)', background: 'white', cursor: 'pointer' }}>
            Reset{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          <button onClick={onClose}
            className="h-11 flex-[2] rounded-2xl text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--m-green)', border: 'none', cursor: 'pointer' }}>
            {loading ? 'Loading…' : `Show ${totalCount} listing${totalCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </>
  )
}
