'use client'
import { useRouter } from 'next/navigation'
import { useFormatter } from 'next-intl'

type Props = { year: number; month: number }

export function MonthNav({ year, month }: Props) {
  const router = useRouter()
  const format = useFormatter()

  const monthLabel = format.dateTime(new Date(year, month - 1, 1), { month: 'long' })

  function navigate(delta: number) {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    router.push(`/m/budget?year=${y}&month=${m}`)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate(-1)}
        className="border border-[var(--border)] rounded-lg px-3 py-1 text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--accent-muted)] transition-colors"
      >
        ←
      </button>
      <span className="text-base font-semibold text-[var(--fg)] min-w-[120px] text-center capitalize">
        {monthLabel} {year}
      </span>
      <button
        onClick={() => navigate(1)}
        className="border border-[var(--border)] rounded-lg px-3 py-1 text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--accent-muted)] transition-colors"
      >
        →
      </button>
    </div>
  )
}
