import { getTranslations, getFormatter } from 'next-intl/server'
import type { CategoryTotal, TypeTotal } from '@lifehelper/budget/client'

type Props = {
  categoryTotals: CategoryTotal[]
  typeTotals: TypeTotal[]
  usdCategoryTotals: CategoryTotal[]
}

function typeLabel(type: TypeTotal['type'], t: Awaited<ReturnType<typeof getTranslations<'budget'>>>) {
  switch (type) {
    case 'recurring': return t('recurringBadge')
    case 'subscription': return t('subscriptionBadge')
    case 'installment': return t('installmentBadge')
    case 'card': return t('addChargeBadge')
    case 'one-time': return t('one_timeBadge')
  }
}

export async function MobileSummary({ categoryTotals, typeTotals, usdCategoryTotals }: Props) {
  const t = await getTranslations('budget')
  const format = await getFormatter()

  const fmtArs = (n: number) =>
    format.number(n / 100, { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtUsd = (n: number) =>
    'USD ' + format.number(n / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (categoryTotals.length === 0 && typeTotals.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-fg)] text-center py-10">{t('noExpenses')}</p>
    )
  }

  const arsMax = categoryTotals[0]?.total ?? 1
  const usdMax = usdCategoryTotals[0]?.total ?? 1

  return (
    <div className="flex flex-col gap-7">
      {categoryTotals.length > 0 && (
        <section>
          <p className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide mb-3">
            {t('summaryCategories')}
          </p>
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {categoryTotals.map(({ category, total }) => {
              const pct = Math.max(3, Math.round((total / arsMax) * 100))
              return (
                <div key={category ?? '__null__'} className="py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[var(--fg)] truncate">
                      {category ?? t('noCategory')}
                    </span>
                    <span className="text-sm tabular-nums text-[var(--fg)] shrink-0">
                      {fmtArs(total)}
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-[var(--accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {usdCategoryTotals.length > 0 && (
        <section>
          <p className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide mb-3">
            {t('summaryUsdCategories')}
          </p>
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {usdCategoryTotals.map(({ category, total }) => {
              const pct = Math.max(3, Math.round((total / usdMax) * 100))
              return (
                <div key={category ?? '__null__'} className="py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[var(--fg)] truncate">
                      {category ?? t('noCategory')}
                    </span>
                    <span className="text-sm tabular-nums text-blue-400 shrink-0">
                      {fmtUsd(total)}
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-400/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {typeTotals.length > 0 && (
        <section>
          <p className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide mb-3">
            {t('summaryTypes')}
          </p>
          <div className="flex flex-wrap gap-2">
            {typeTotals.map(({ type, total }) => (
              <div
                key={type}
                className="flex flex-col px-3.5 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]"
              >
                <span className="text-xs text-[var(--muted-fg)] capitalize">{typeLabel(type, t)}</span>
                <span className="text-sm font-medium tabular-nums text-[var(--fg)]">{fmtArs(total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
