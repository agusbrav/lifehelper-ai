'use client'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'

type Props = {
  selectedYear: number
  selectedMonth: number
  firstYear: number
  firstMonth: number
}

export function AnalyticsMonthNav({ selectedYear, selectedMonth, firstYear, firstMonth }: Props) {
  const router = useRouter()
  const format = useFormatter()
  const t = useTranslations('budget')

  const now = new Date()
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  const isCurrentMonth = selectedYear === nowYear && selectedMonth === nowMonth

  const isFirstMonth = selectedYear === firstYear && selectedMonth === firstMonth

  const maxYear = nowMonth === 12 ? nowYear + 1 : nowYear
  const maxMonth = nowMonth === 12 ? 1 : nowMonth + 1
  const isMaxMonth = selectedYear === maxYear && selectedMonth >= maxMonth

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
      <button onClick={() => navigate(-1)} disabled={isFirstMonth} className={btnCls}>←</button>
      <span className="text-base font-semibold text-[var(--fg)] min-w-[160px] text-center capitalize">
        {monthLabel} {selectedYear}
      </span>
      <button onClick={() => navigate(1)} disabled={isMaxMonth} className={btnCls}>→</button>
      {!isCurrentMonth && (
        <button onClick={() => router.push('/m/budget/analytics')} className={`ml-1 ${btnCls} text-xs`}>
          {t('today')}
        </button>
      )}
    </div>
  )
}
