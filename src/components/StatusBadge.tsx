import { ListingStatus, STATUS_LABELS } from '@/lib/types'

interface StatusBadgeProps {
  status: ListingStatus
}

const statusStyles: Record<ListingStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  reserved: 'bg-amber-50 text-amber-700 border-amber-200',
  sold: 'bg-slate-100 text-slate-700 border-slate-300',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}>
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current/80" />
      {STATUS_LABELS[status]}
    </span>
  )
}
