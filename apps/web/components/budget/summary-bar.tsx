'use client'
import { useTranslations, useFormatter } from 'next-intl'

type Props = { paidCents: number; pendingCents: number }

export function SummaryBar({ paidCents, pendingCents }: Props) {
  const t = useTranslations('budget')
  const format = useFormatter()

  const fmt = (n: number) =>
    format.number(n / 100, { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="flex gap-5 text-sm">
      <span className="text-[var(--muted-fg)]">
        {t('paid')} <strong className="text-emerald-500">{fmt(paidCents)}</strong>
      </span>
      <span className="text-[var(--muted-fg)]">
        {t('pending')} <strong className="text-orange-400">{fmt(pendingCents)}</strong>
      </span>
      <span className="text-[var(--muted-fg)]">
        {t('total')} <strong className="text-[var(--fg)]">{fmt(paidCents + pendingCents)}</strong>
      </span>
    </div>
  )
}
