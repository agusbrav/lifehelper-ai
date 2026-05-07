'use client'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'

type Props = {
  availableMonths: { year: number; month: number }[]
  selectedYear: number
  selectedMonth: number
}

export function AnalyticsMonthNav({ availableMonths, selectedYear, selectedMonth }: Props) {
  const router = useRouter()
  const format = useFormatter()
  const t = useTranslations('budget')

  if (availableMonths.length === 0) return null

  const now = new Date()
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1

  const newest = availableMonths[0]!
  const oldest = availableMonths[availableMonths.length - 1]!
  const isNewest = selectedYear === newest.year && selectedMonth === newest.month
  const isOldest = selectedYear === oldest.year && selectedMonth === oldest.month

  const monthLabel = format.dateTime(new Date(selectedYear, selectedMonth - 1, 1), { month: 'long' })

  function navigate(delta: number) {
    let m = selectedMonth + delta
    let y = selectedYear
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    router.push(`?year=${y}&month=${m}`)
  }

  const btnCls = 'border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--muted-fg)]'

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => navigate(-1)} disabled={isOldest} className={btnCls}>←</button>
      <span className="text-base font-semibold text-[var(--fg)] min-w-[160px] text-center capitalize">
        {monthLabel} {selectedYear}
      </span>
      <button onClick={() => navigate(1)} disabled={isNewest} className={btnCls}>→</button>
      {!isCurrentMonth && (
        <button onClick={() => router.push('/m/budget/analytics')} className={`ml-1 ${btnCls} text-xs`}>
          {t('today')}
        </button>
      )}
    </div>
  )
}
