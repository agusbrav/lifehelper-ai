function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

type Props = { paidCents: number; pendingCents: number }

export function SummaryBar({ paidCents, pendingCents }: Props) {
  return (
    <div className="flex gap-5 text-sm">
      <span className="text-[var(--muted-fg)]">
        Paid <strong className="text-emerald-500">{fmt(paidCents)}</strong>
      </span>
      <span className="text-[var(--muted-fg)]">
        Pending <strong className="text-orange-400">{fmt(pendingCents)}</strong>
      </span>
      <span className="text-[var(--muted-fg)]">
        Total <strong className="text-[var(--fg)]">{fmt(paidCents + pendingCents)}</strong>
      </span>
    </div>
  )
}
