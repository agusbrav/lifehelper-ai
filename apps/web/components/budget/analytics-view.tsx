import type { CategoryTotal, RollingAvgResult, InflationAlert, InstallmentSummary } from '@lifehelper/budget'

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

function pctColor(pct: number) {
  if (pct > 10) return 'text-rose-400'
  if (pct < -5) return 'text-emerald-400'
  return 'text-[var(--muted-fg)]'
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type MonthlyTotal = { label: string; totalCents: number }

type Props = {
  currentMonth: { year: number; month: number }
  categoryTotals: CategoryTotal[]
  avg3mo: RollingAvgResult[]
  avg6mo: RollingAvgResult[]
  inflationAlerts: InflationAlert[]
  installments: InstallmentSummary[]
  monthlyTotals: MonthlyTotal[]
}

export function AnalyticsView({
  currentMonth,
  categoryTotals,
  avg3mo,
  avg6mo,
  inflationAlerts,
  installments,
  monthlyTotals,
}: Props) {
  const maxCategory = Math.max(...categoryTotals.map(c => c.total), 1)
  const maxMonthly = Math.max(...monthlyTotals.map(m => m.totalCents), 1)

  return (
    <div className="flex flex-col gap-8">

      {/* Category spend */}
      <section>
        <h2 className="text-xs font-semibold text-[var(--muted-fg)] mb-3 uppercase tracking-wide">
          Spend by Category - {MONTH_NAMES[currentMonth.month - 1]} {currentMonth.year}
        </h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--muted)]">
                <th className="text-left py-2.5 pl-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Category</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-28">This month</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-24">3-mo avg</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-24">6-mo avg</th>
                <th className="py-2.5 pr-5 w-36" />
              </tr>
            </thead>
            <tbody>
              {categoryTotals.map(({ category, total }) => {
                const a3 = avg3mo.find(a => a.category === category)?.avg ?? 0
                const a6 = avg6mo.find(a => a.category === category)?.avg ?? 0
                const pct3 = a3 > 0 ? Math.round(((total - a3) / a3) * 100) : 0
                return (
                  <tr key={category ?? '__null__'} className="border-t border-[var(--border)]">
                    <td className="py-3 pl-5 font-medium text-[var(--fg)]">{category ?? 'Uncategorized'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[var(--fg)]">{fmt(total)}</td>
                    <td className="py-3 px-4 text-right text-[var(--muted-fg)]">{a3 > 0 ? fmt(a3) : '-'}</td>
                    <td className="py-3 px-4 text-right text-[var(--muted-fg)]">{a6 > 0 ? fmt(a6) : '-'}</td>
                    <td className="py-3 pr-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[var(--muted)] rounded-full h-1.5">
                          <div
                            className="bg-[var(--accent)] h-1.5 rounded-full"
                            style={{ width: `${Math.round((total / maxCategory) * 100)}%` }}
                          />
                        </div>
                        {a3 > 0 && (
                          <span className={`text-xs font-medium w-10 text-right ${pctColor(pct3)}`}>
                            {pct3 > 0 ? '+' : ''}{pct3}%
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {categoryTotals.length === 0 && (
            <div className="py-8 text-center text-sm text-[var(--muted-fg)]">No data for this month yet.</div>
          )}
        </div>
      </section>

      {/* Monthly trend */}
      <section>
        <h2 className="text-xs font-semibold text-[var(--muted-fg)] mb-3 uppercase tracking-wide">Monthly Total - Last 6 Months</h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
          {monthlyTotals.some(m => m.totalCents > 0) ? (
            <div className="flex items-end gap-3 h-28">
              {monthlyTotals.map(({ label, totalCents }) => (
                <div key={label} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs text-[var(--muted-fg)] leading-none">{totalCents > 0 ? fmt(totalCents) : ''}</span>
                  <div
                    className="w-full bg-[var(--accent)] rounded-t-md"
                    style={{ height: `${Math.max(Math.round((totalCents / maxMonthly) * 80), totalCents > 0 ? 4 : 0)}px` }}
                  />
                  <span className="text-xs text-[var(--muted-fg)]">{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-fg)] text-center py-4">Not enough data yet - add expenses across multiple months to see trends.</p>
          )}
        </div>
      </section>

      {/* Inflation alerts */}
      {inflationAlerts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[var(--muted-fg)] mb-3 uppercase tracking-wide">Price Changes vs 3 Months Ago</h2>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--muted)]">
                  <th className="text-left py-2.5 pl-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Item</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">3 months ago</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">This month</th>
                  <th className="text-right py-2.5 pr-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Change</th>
                </tr>
              </thead>
              <tbody>
                {inflationAlerts.map(a => (
                  <tr key={a.name} className="border-t border-[var(--border)]">
                    <td className="py-3 pl-5 font-medium text-[var(--fg)]">{a.name}</td>
                    <td className="py-3 px-4 text-right text-[var(--muted-fg)]">{fmt(a.previousAmount)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[var(--fg)]">{fmt(a.currentAmount)}</td>
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

      {/* Installment overview */}
      {installments.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[var(--muted-fg)] mb-3 uppercase tracking-wide">Active Installments</h2>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--muted)]">
                  <th className="text-left py-2.5 pl-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Purchase</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">$/month</th>
                  <th className="text-center py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Progress</th>
                  <th className="text-right py-2.5 pr-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Left</th>
                </tr>
              </thead>
              <tbody>
                {installments.map(inst => (
                  <tr key={inst.groupId} className="border-t border-[var(--border)]">
                    <td className="py-3 pl-5 font-medium text-[var(--fg)]">{inst.name}</td>
                    <td className="py-3 px-4 text-right text-[var(--fg)]">{fmt(inst.amountPerMonth)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-24 bg-[var(--muted)] rounded-full h-1.5">
                          <div
                            className="bg-[var(--accent)] h-1.5 rounded-full"
                            style={{ width: `${Math.round((inst.currentPayment / inst.totalPayments) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--muted-fg)] w-10">{inst.currentPayment}/{inst.totalPayments}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-5 text-right font-semibold text-[var(--fg)]">{fmt(inst.totalRemaining)}</td>
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
