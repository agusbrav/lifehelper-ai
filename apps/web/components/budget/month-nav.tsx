'use client'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'

type Props = { year: number; month: number; firstYear?: number; firstMonth?: number }

export function MonthNav({ year, month, firstYear, firstMonth }: Props) {
  const router = useRouter()
  const format = useFormatter()
  const t = useTranslations('budget')

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const monthLabel = format.dateTime(new Date(year, month - 1, 1), { month: 'long' })

  const isFirstMonth =
    firstYear !== undefined && firstMonth !== undefined &&
    year === firstYear && month === firstMonth

  function navigate(delta: number) {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    router.push(`/m/budget?year=${y}&month=${m}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(-1)}
        disabled={isFirstMonth}
        className="border border-[var(--border)] rounded-lg px-3 py-1 text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--muted-fg)]"
      >
        ←
      </button>
      <span className="text-base font-semibold text-[var(--fg)] min-w-[130px] text-center capitalize">
        {monthLabel} {year}
      </span>
      <button
        onClick={() => navigate(1)}
        className="border border-[var(--border)] rounded-lg px-3 py-1 text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--accent-muted)] transition-colors"
      >
        →
      </button>
      {!isCurrentMonth && (
        <button
          onClick={() => router.push('/m/budget')}
          className="ml-1 border border-[var(--border)] rounded-lg px-3 py-1 text-xs text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--accent-muted)] transition-colors"
        >
          {t('today')}
        </button>
      )}
    </div>
  )
}
