'use client'
import { useTranslations, useFormatter } from 'next-intl'

type Props = {
  paidArsCents: number
  pendingArsCents: number
  paidUsdCents: number
  pendingUsdCents: number
}

export function SummaryBar({ paidArsCents, pendingArsCents, paidUsdCents, pendingUsdCents }: Props) {
  const t = useTranslations('budget')
  const format = useFormatter()

  const fmtArs = (n: number) =>
    format.number(n / 100, { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtUsd = (n: number) =>
    'USD ' + format.number(n / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const hasUsd = paidUsdCents > 0 || pendingUsdCents > 0

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm items-center">
      <span className="text-[var(--muted-fg)]">
        {t('paid')} <strong className="text-emerald-500">{fmtArs(paidArsCents)}</strong>
      </span>
      <span className="text-[var(--muted-fg)]">
        {t('pending')} <strong className="text-orange-400">{fmtArs(pendingArsCents)}</strong>
      </span>
      <span className="text-[var(--muted-fg)]">
        {t('total')} <strong className="text-[var(--fg)]">{fmtArs(paidArsCents + pendingArsCents)}</strong>
      </span>
      {hasUsd && (
        <>
          <span className="w-px h-3.5 bg-[var(--border)] self-center" />
          <span className="text-[var(--muted-fg)]">
            {t('paid')} <strong className="text-emerald-400">{fmtUsd(paidUsdCents)}</strong>
          </span>
          <span className="text-[var(--muted-fg)]">
            {t('pending')} <strong className="text-orange-300">{fmtUsd(pendingUsdCents)}</strong>
          </span>
          <span className="text-[var(--muted-fg)]">
            {t('total')} <strong className="text-blue-400">{fmtUsd(paidUsdCents + pendingUsdCents)}</strong>
          </span>
        </>
      )}
    </div>
  )
}
