'use client'
import { useRouter } from 'next/navigation'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type Props = { year: number; month: number }

export function MonthNav({ year, month }: Props) {
  const router = useRouter()

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
      <span className="text-base font-semibold text-[var(--fg)] min-w-[120px] text-center">
        {MONTH_NAMES[month - 1]} {year}
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
