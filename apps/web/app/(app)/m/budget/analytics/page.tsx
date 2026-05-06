import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@lifehelper/core'
import {
  getItemsForAnalytics,
  computeCategoryTotals,
  computeRollingAverage,
  computeInflationAlerts,
  computeInstallmentOverview,
} from '@lifehelper/budget'
import { AnalyticsView } from '@/components/budget/analytics-view'
import Link from 'next/link'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function BudgetAnalyticsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) redirect('/login')

  const allItems = await getItemsForAnalytics(session.user.id)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Group items by month key
  const monthMap = new Map<string, typeof allItems>()
  for (const item of allItems) {
    const key = `${item.month.year}-${item.month.month}`
    if (!monthMap.has(key)) monthMap.set(key, [])
    monthMap.get(key)!.push(item)
  }

  // Build last 6 months (oldest first)
  const last6: { year: number; month: number; items: typeof allItems }[] = []
  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i
    let y = currentYear
    if (m <= 0) { m += 12; y-- }
    last6.push({ year: y, month: m, items: monthMap.get(`${y}-${m}`) ?? [] })
  }

  const currentItems = last6[last6.length - 1]!.items
  const threeMonthsAgoItems = last6[2]?.items ?? []

  const categoryTotals = computeCategoryTotals(currentItems)
  const avg3mo = computeRollingAverage(last6, 3)
  const avg6mo = computeRollingAverage(last6, 6)
  const inflationAlerts = computeInflationAlerts(currentItems, threeMonthsAgoItems)
  const installments = computeInstallmentOverview(currentItems)

  const monthlyTotals = last6.map(m => ({
    label: MONTH_NAMES[m.month - 1]!,
    totalCents: computeCategoryTotals(m.items).reduce((sum, c) => sum + c.total, 0),
  }))

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-[var(--fg)]">Budget Analytics</h1>
        <Link
          href="/m/budget"
          className="text-sm text-[var(--accent)] hover:opacity-80 font-medium"
        >
          ← Back to table
        </Link>
      </div>
      <AnalyticsView
        currentMonth={{ year: currentYear, month: currentMonth }}
        categoryTotals={categoryTotals}
        avg3mo={avg3mo}
        avg6mo={avg6mo}
        inflationAlerts={inflationAlerts}
        installments={installments}
        monthlyTotals={monthlyTotals}
      />
    </div>
  )
}
