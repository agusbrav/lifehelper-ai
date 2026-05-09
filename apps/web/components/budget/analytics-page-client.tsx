'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { AnalyticsMonthNav } from './analytics-month-nav'
import { AnalyticsDashboard } from './analytics-dashboard'
import { AnalyticsConfigPanel } from './analytics-config-panel'
import type {
  CategoryTotal,
  TypeTotal,
  RollingAvgResult,
  InflationAlert,
  InstallmentSummary,
} from '@lifehelper/budget'

type MonthlyTotal = { label: string; totalCents: number }

type Props = {
  selectedYear: number
  selectedMonth: number
  firstYear: number
  firstMonth: number
  categoryTotals: CategoryTotal[]
  typeTotals: TypeTotal[]
  avg3mo: RollingAvgResult[]
  avg6mo: RollingAvgResult[]
  inflationAlerts: InflationAlert[]
  installments: InstallmentSummary[]
  monthlyTotals: MonthlyTotal[]
  usdCategoryTotals: CategoryTotal[]
  usdTypeTotals: TypeTotal[]
  usdAvg3mo: RollingAvgResult[]
  usdAvg6mo: RollingAvgResult[]
  usdMonthlyTotals: MonthlyTotal[]
}

export function AnalyticsPageClient({
  selectedYear,
  selectedMonth,
  firstYear,
  firstMonth,
  ...dashboardProps
}: Props) {
  const t = useTranslations('analytics')
  const [viewMode, setViewMode] = useState<'category' | 'type'>('category')

  const btnBase = 'px-4 py-1.5 font-medium text-sm transition-colors'
  const active = 'bg-[var(--accent)] text-[var(--accent-fg)]'
  const inactive = 'text-[var(--muted-fg)] hover:bg-[var(--muted)]'

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <AnalyticsMonthNav
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          firstYear={firstYear}
          firstMonth={firstMonth}
        />
        <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden">
          <button onClick={() => setViewMode('category')} className={`${btnBase} ${viewMode === 'category' ? active : inactive}`}>
            {t('byCategory')}
          </button>
          <button onClick={() => setViewMode('type')} className={`${btnBase} border-l border-[var(--border)] ${viewMode === 'type' ? active : inactive}`}>
            {t('byType')}
          </button>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <Link href="/m/budget" className="text-sm text-[var(--accent)] hover:opacity-80 font-medium">
            {t('backToTable')}
          </Link>
          <AnalyticsConfigPanel />
        </div>
      </div>
      <AnalyticsDashboard viewMode={viewMode} {...dashboardProps} />
    </>
  )
}
