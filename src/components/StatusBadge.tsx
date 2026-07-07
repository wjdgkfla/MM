import { Listing } from '@/lib/types'

const BADGE_STYLES: Record<Listing['status'], string> = {
  available: 'bg-[var(--m-green-soft)] text-[var(--m-green)]',
  reserved:  'bg-[var(--m-gold-soft)] text-[var(--m-gold-text)]',
  sold:      'bg-[var(--m-soft)] text-[var(--m-muted)]',
}

const BADGE_LABELS: Record<Listing['status'], string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
}

export function StatusBadge({ status }: { status: Listing['status'] }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE_STYLES[status]}`}>
      {BADGE_LABELS[status]}
    </span>
  )
}
