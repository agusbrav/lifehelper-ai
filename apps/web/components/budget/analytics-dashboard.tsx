'use client'
import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { DonutChart } from './donut-chart'
import { ClickableRow } from '@/components/clickable-row'
import type {
  CategoryTotal,
  TypeTotal,
  RollingAvgResult,
  InflationAlert,
  InstallmentSummary,
} from '@lifehelper/budget'

const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#d946ef', '#06b6d4', '#ec4899', '#84cc16',
]

const TYPE_COLORS: Record<string, string> = {
  recurring: '#3b82f6',
  subscription: '#ec4899',
  installment: '#f59e0b',
  card: '#a855f7',
  'one-time': '#06b6d4',
}

function buildColorMap(items: { category: string | null }[]): Map<string | null, string> {
  const map = new Map<string | null, string>()
  items.forEach((c, i) => { map.set(c.category, PALETTE[i % PALETTE.length]!) })
  return map
}

function fmtCompact(cents: number, locale: string): string {
  const v = cents / 100
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 2 }) + 'M'
  if (v >= 1_000) return '$' + (v / 1_000).toLocaleString(locale, { maximumFractionDigits: 0 }) + 'K'
  return '$' + v.toLocaleString(locale, { minimumFractionDigits: 0 })
}

function pctColor(pct: number) {
  if (pct > 10) return 'text-[var(--error-fg)]'
  if (pct < -5) return 'text-[var(--success-fg)]'
  return 'text-[var(--muted-fg)]'
}

type MonthlyTotal = { label: string; totalCents: number }

type ViewItem = {
  key: string
  label: string
  total: number
  color: string
  avg3?: number
  avg6?: number
}

type Props = {
  categoryTotals: CategoryTotal[]
  typeTotals: TypeTotal[]
  avg3mo: RollingAvgResult[]
  avg6mo: RollingAvgResult[]
  inflationAlerts: InflationAlert[]
  installments: InstallmentSummary[]
  monthlyTotals: MonthlyTotal[]
}

export function AnalyticsDashboard({
  categoryTotals,
  typeTotals,
  avg3mo,
  avg6mo,
  inflationAlerts,
  installments,
  monthlyTotals,
}: Props) {
  const t = useTranslations('analytics')
  const tBudget = useTranslations('budget')
  const locale = useLocale()
  const [viewMode, setViewMode] = useState<'category' | 'type'>('category')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  const fmt = (cents: number) =>
    '$' + (cents / 100).toLocaleString(locale, { minimumFractionDigits: 0 })

  const sortedCategoryTotals = useMemo(
    () => [...categoryTotals].sort((a, b) => b.total - a.total),
    [categoryTotals],
  )

  const categoryColorMap = useMemo(() => buildColorMap(sortedCategoryTotals), [sortedCategoryTotals])

  const typeLabels: Record<string, string> = {
    recurring: tBudget('recurringBadge'),
    subscription: tBudget('subscriptionBadge'),
    installment: tBudget('installmentBadge'),
    card: tBudget('addChargeBadge'),
    'one-time': tBudget('oneTimeBadge'),
  }

  const viewItems: ViewItem[] = useMemo(() => {
    if (viewMode === 'category') {
      return sortedCategoryTotals.map(c => ({
        key: c.category ?? '__null__',
        label: c.category ?? t('uncategorized'),
        total: c.total,
        color: categoryColorMap.get(c.category) ?? PALETTE[0]!,
        avg3: avg3mo.find(a => a.category === c.category)?.avg ?? 0,
        avg6: avg6mo.find(a => a.category === c.category)?.avg ?? 0,
      }))
    }
    return typeTotals.map(tp => ({
      key: tp.type,
      label: typeLabels[tp.type] ?? tp.type,
      total: tp.total,
      color: TYPE_COLORS[tp.type] ?? '#64748b',
    }))
  }, [viewMode, sortedCategoryTotals, typeTotals, categoryColorMap, avg3mo, avg6mo])

  function toggle(key: string) {
    setExcluded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function switchMode(mode: 'category' | 'type') {
    setViewMode(mode)
    setExcluded(new Set())
  }

  const includedItems = viewItems.filter(item => !excluded.has(item.key))
  const includedSum = includedItems.reduce((s, item) => s + item.total, 0)
  const maxItem = Math.max(...viewItems.map(item => item.total), 1)
  const maxMonthly = Math.max(...monthlyTotals.map(m => m.totalCents), 1)

  const donutSegments = includedItems.map(item => ({
    category: item.key,
    value: item.total,
    color: item.color,
  }))

  const showAvgCols = viewMode === 'category'

  return (
    <div className="flex flex-col gap-8">

      {/* View mode toggle */}
      <div className="flex">
        <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-sm">
          <button
            onClick={() => switchMode('category')}
            className={`px-4 py-1.5 font-medium transition-colors ${
              viewMode === 'category'
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'text-[var(--muted-fg)] hover:bg-[var(--muted)]'
            }`}
          >
            {t('byCategory')}
          </button>
          <button
            onClick={() => switchMode('type')}
            className={`px-4 py-1.5 font-medium transition-colors border-l border-[var(--border)] ${
              viewMode === 'type'
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'text-[var(--muted-fg)] hover:bg-[var(--muted)]'
            }`}
          >
            {t('byType')}
          </button>
        </div>
      </div>

      {/* Split: donut left, table right */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-start">

          {/* Left: donut + legend */}
          <div className="flex flex-col items-center gap-4">
            <DonutChart
              segments={donutSegments}
              total={includedSum}
              centerLabel={fmtCompact(includedSum, locale)}
              onToggle={toggle}
            />

            <div className="w-full flex flex-col gap-1.5">
              {viewItems.map(item => {
                const isExcluded = excluded.has(item.key)
                const pct = !isExcluded && includedSum > 0
                  ? Math.round((item.total / includedSum) * 100)
                  : 0
                return (
                  <button
                    key={item.key}
                    onClick={() => toggle(item.key)}
                    className={`flex items-center gap-2 text-xs text-left transition-opacity w-full ${
                      isExcluded ? 'opacity-40' : ''
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: item.color }}
                    />
                    <span className={`flex-1 capitalize ${isExcluded ? 'line-through' : ''}`}>
                      {item.label}
                    </span>
                    <span className="text-[var(--muted-fg)]">
                      {isExcluded ? '' : `${pct}%`}
                    </span>
                  </button>
                )
              })}

              {excluded.size > 0 && (
                <button
                  onClick={() => setExcluded(new Set())}
                  className="mt-1 text-xs text-[var(--accent)] hover:opacity-75 text-left"
                >
                  {t('resetExclusions')}
                </button>
              )}
            </div>
          </div>

          {/* Right: table */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--muted)]">
                  <th className="text-left py-2.5 pl-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                    {viewMode === 'category' ? t('category') : t('byType')}
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-28">
                    {t('thisMonth')}
                  </th>
                  {showAvgCols && (
                    <>
                      <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-24">
                        {t('avg3mo')}
                      </th>
                      <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-24">
                        {t('avg6mo')}
                      </th>
                    </>
                  )}
                  <th className="py-2.5 pr-5 w-36" />
                </tr>
              </thead>
              <tbody>
                {viewItems.map(item => {
                  const isExcluded = excluded.has(item.key)
                  const pct3 = (item.avg3 ?? 0) > 0
                    ? Math.round(((item.total - item.avg3!) / item.avg3!) * 100)
                    : 0
                  return (
                    <ClickableRow
                      key={item.key}
                      onClick={() => toggle(item.key)}
                      excluded={isExcluded}
                    >
                      <td className="py-3 pl-5 font-medium text-[var(--fg)]">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: item.color }}
                          />
                          <span className={`capitalize ${isExcluded ? 'line-through' : ''}`}>
                            {item.label}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[var(--fg)]">
                        {fmt(item.total)}
                      </td>
                      {showAvgCols && (
                        <>
                          <td className="py-3 px-4 text-right text-[var(--muted-fg)]">
                            {(item.avg3 ?? 0) > 0 ? fmt(item.avg3!) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-[var(--muted-fg)]">
                            {(item.avg6 ?? 0) > 0 ? fmt(item.avg6!) : '-'}
                          </td>
                        </>
                      )}
                      <td className="py-3 pr-5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[var(--muted)] rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.round((item.total / maxItem) * 100)}%`,
                                background: item.color,
                              }}
                            />
                          </div>
                          {showAvgCols && (item.avg3 ?? 0) > 0 && (
                            <span className={`text-xs font-medium w-10 text-right ${pctColor(pct3)}`}>
                              {pct3 > 0 ? '+' : ''}{pct3}%
                            </span>
                          )}
                        </div>
                      </td>
                    </ClickableRow>
                  )
                })}
              </tbody>
            </table>
            {viewItems.length === 0 && (
              <div className="py-8 text-center text-sm text-[var(--muted-fg)]">
                {t('noData')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Monthly trend — only when 3+ months have data */}
      {monthlyTotals.length >= 3 && (
      <section>
        <h2 className="text-xs font-semibold text-[var(--muted-fg)] mb-3 uppercase tracking-wide">
          {t('monthlyTotalTitle')}
        </h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
          {monthlyTotals.some(m => m.totalCents > 0) ? (
            <div className="flex items-end gap-3 h-28">
              {monthlyTotals.map(({ label, totalCents }) => (
                <div key={label} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs text-[var(--muted-fg)] leading-none">
                    {totalCents > 0 ? fmt(totalCents) : ''}
                  </span>
                  <div
                    className="w-full bg-[var(--accent)] rounded-t-md"
                    style={{
                      height: `${Math.max(Math.round((totalCents / maxMonthly) * 80), totalCents > 0 ? 4 : 0)}px`,
                    }}
                  />
                  <span className="text-xs text-[var(--muted-fg)]">{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-fg)] text-center py-4">
              {t('notEnoughData')}
            </p>
          )}
        </div>
      </section>
      )}

      {/* Inflation alerts */}
      {inflationAlerts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[var(--muted-fg)] mb-3 uppercase tracking-wide">
            {t('priceChanges')}
          </h2>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--muted)]">
                  <th className="text-left py-2.5 pl-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                    {t('item')}
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                    {t('threeMonthsAgo')}
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                    {t('thisMonth')}
                  </th>
                  <th className="text-right py-2.5 pr-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                    {t('change')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {inflationAlerts.map(a => (
                  <tr key={a.name} className="border-t border-[var(--border)]">
                    <td className="py-3 pl-5 font-medium text-[var(--fg)]">{a.name}</td>
                    <td className="py-3 px-4 text-right text-[var(--muted-fg)]">
                      {fmt(a.previousAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[var(--fg)]">
                      {fmt(a.currentAmount)}
                    </td>
                    <td className={`py-3 pr-5 text-right font-semibold ${pctColor(a.changePct)}`}>
                      {a.changePct > 0 ? '+' : ''}{a.changePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Active installments */}
      {installments.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[var(--muted-fg)] mb-3 uppercase tracking-wide">
            {t('activeInstallments')}
          </h2>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--muted)]">
                  <th className="text-left py-2.5 pl-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                    {t('purchase')}
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                    {t('perMonth')}
                  </th>
                  <th className="text-center py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                    {t('progress')}
                  </th>
                  <th className="text-right py-2.5 pr-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                    {t('left')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {installments.map(inst => (
                  <tr key={inst.groupId} className="border-t border-[var(--border)]">
                    <td className="py-3 pl-5 font-medium text-[var(--fg)]">{inst.name}</td>
                    <td className="py-3 px-4 text-right text-[var(--fg)]">
                      {fmt(inst.amountPerMonth)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-24 bg-[var(--muted)] rounded-full h-1.5">
                          <div
                            className="bg-[var(--accent)] h-1.5 rounded-full"
                            style={{
                              width: `${Math.round((inst.currentPayment / inst.totalPayments) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-[var(--muted-fg)] w-10">
                          {inst.currentPayment}/{inst.totalPayments}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-5 text-right font-semibold text-[var(--fg)]">
                      {fmt(inst.totalRemaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}
