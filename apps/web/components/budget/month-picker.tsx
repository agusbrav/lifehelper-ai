'use client'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

type Props = {
  months: { year: number; month: number }[]
  selectedYear: number
  selectedMonth: number
}

export function MonthPicker({ months, selectedYear, selectedMonth }: Props) {
  const router = useRouter()
  const locale = useLocale()

  if (months.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {months.map(({ year, month }) => {
        const isActive = year === selectedYear && month === selectedMonth
        const label = new Date(year, month - 1, 1).toLocaleString(locale, {
          month: 'short',
          year: '2-digit',
        })
        return (
          <button
            key={`${year}-${month}`}
            onClick={() => router.push(`?year=${year}&month=${month}`)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              isActive
                ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                : 'bg-transparent text-[var(--muted-fg)] border-[var(--border)] hover:text-[var(--fg)]'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
