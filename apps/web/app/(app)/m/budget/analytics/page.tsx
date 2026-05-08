import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@lifehelper/core'
import {
  getItemsForAnalytics,
  computeCategoryTotals,
  computeUsdCategoryTotals,
  computeTypeTotals,
  computeRollingAverage,
  computeInflationAlerts,
  computeInstallmentOverview,
} from '@lifehelper/budget'
import { getTranslations } from 'next-intl/server'
import { AnalyticsDashboard } from '@/components/budget/analytics-dashboard'
import { AnalyticsMonthNav } from '@/components/budget/analytics-month-nav'
import Link from 'next/link'

export default async function BudgetAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) redirect('/login')

  const params = await searchParams
  const now = new Date()
  const rawYear = parseInt(params.year ?? '', 10)
  const rawMonth = parseInt(params.month ?? '', 10)
  const selectedYear = isNaN(rawYear) ? now.getFullYear() : rawYear
  const selectedMonth =
    isNaN(rawMonth) || rawMonth < 1 || rawMonth > 12
      ? now.getMonth() + 1
      : rawMonth

  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  const maxYear = nowMonth === 12 ? nowYear + 1 : nowYear
  const maxMonth = nowMonth === 12 ? 1 : nowMonth + 1
  const maxIndex = maxYear * 12 + maxMonth
  if (selectedYear * 12 + selectedMonth > maxIndex) {
    redirect(`/m/budget/analytics?year=${maxYear}&month=${maxMonth}`)
  }

  const [allItems, t] = await Promise.all([
    getItemsForAnalytics(session.user.id),
    getTranslations('analytics'),
  ])

  const locale = session.user.locale

  const monthMap = new Map<string, typeof allItems>()
  for (const item of allItems) {
    const key = `${item.month.year}-${item.month.month}`
    if (!monthMap.has(key)) monthMap.set(key, [])
    monthMap.get(key)!.push(item)
  }

  // Include all months that have any data (card charges count as real spending to analyze).
  // Use Math.min(dataIndex, nowIndex) to derive the floor so the nav button is disabled at
  // the oldest data month, capped at the current month to prevent a future-floor loop.
  const availableMonths = Array.from(
    new Map(
      allItems.map(i => [
        `${i.month.year}-${i.month.month}`,
        { year: i.month.year, month: i.month.month },
      ]),
    ).values(),
  )
    .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month))
    .slice(0, 12)

  const nowIndex = nowYear * 12 + nowMonth
  const oldestAvailable = availableMonths[availableMonths.length - 1]
  const dataIndex = oldestAvailable ? oldestAvailable.year * 12 + oldestAvailable.month : nowIndex
  const floorIndex = Math.min(dataIndex, nowIndex)
  const floorYear = Math.floor((floorIndex - 1) / 12)
  const floorMonth = floorIndex - floorYear * 12

  // 6-month window ending at selectedMonth
  const last6: { year: number; month: number; items: typeof allItems }[] = []
  for (let i = 5; i >= 0; i--) {
    let m = selectedMonth - i
    let y = selectedYear
    while (m <= 0) { m += 12; y-- }
    last6.push({ year: y, month: m, items: monthMap.get(`${y}-${m}`) ?? [] })
  }

  const currentItems = last6[last6.length - 1]!.items
  const threeMonthsAgoItems = last6[2]?.items ?? []

  const categoryTotals = computeCategoryTotals(currentItems)
  const typeTotals = computeTypeTotals(currentItems)
  const avg3mo = computeRollingAverage(last6, 3)
  const avg6mo = computeRollingAverage(last6, 6)
  const inflationAlerts = computeInflationAlerts(currentItems, threeMonthsAgoItems)
  const installments = computeInstallmentOverview(currentItems)

  const usdCategoryTotals = computeUsdCategoryTotals(currentItems)
  const usdAvg3mo = computeRollingAverage(last6, 3, computeUsdCategoryTotals)
  const usdAvg6mo = computeRollingAverage(last6, 6, computeUsdCategoryTotals)

  const monthsForChart = availableMonths
    .filter(m => m.year < selectedYear || (m.year === selectedYear && m.month <= selectedMonth))
    .slice(0, 6)
    .reverse()

  const monthlyTotals = monthsForChart.map(m => ({
    label: new Date(m.year, m.month - 1, 1).toLocaleString(locale, { month: 'short' }),
    totalCents: computeCategoryTotals(monthMap.get(`${m.year}-${m.month}`) ?? []).reduce((sum, c) => sum + c.total, 0),
  }))

  const usdMonthlyTotals = monthsForChart.map(m => ({
    label: new Date(m.year, m.month - 1, 1).toLocaleString(locale, { month: 'short' }),
    totalCents: computeUsdCategoryTotals(monthMap.get(`${m.year}-${m.month}`) ?? []).reduce((sum, c) => sum + c.total, 0),
  }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <AnalyticsMonthNav
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          firstYear={floorYear}
          firstMonth={floorMonth}
        />
        <Link
          href="/m/budget"
          className="text-sm text-[var(--accent)] hover:opacity-80 font-medium"
        >
          {t('backToTable')}
        </Link>
      </div>
      <AnalyticsDashboard
        categoryTotals={categoryTotals}
        typeTotals={typeTotals}
        avg3mo={avg3mo}
        avg6mo={avg6mo}
        inflationAlerts={inflationAlerts}
        installments={installments}
        monthlyTotals={monthlyTotals}
        usdCategoryTotals={usdCategoryTotals}
        usdAvg3mo={usdAvg3mo}
        usdAvg6mo={usdAvg6mo}
        usdMonthlyTotals={usdMonthlyTotals}
      />
    </div>
  )
}
