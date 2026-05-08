'use client'
import { useTranslations, useFormatter } from 'next-intl'

type Props = {
  totalArsCents: number
  totalUsdCents: number
}

export function SummaryBar({ totalArsCents, totalUsdCents }: Props) {
  const t = useTranslations('budget')
  const format = useFormatter()

  const fmtArs = (n: number) =>
    format.number(n / 100, { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtUsd = (n: number) =>
    'USD ' + format.number(n / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm items-center">
      <span className="text-[var(--muted-fg)]">
        {t('total')} <strong className="text-[var(--fg)]">{fmtArs(totalArsCents)}</strong>
      </span>
      {totalUsdCents > 0 && (
        <>
          <span className="w-px h-3.5 bg-[var(--border)] self-center" />
          <span className="text-[var(--muted-fg)]">
            {t('total')} <strong className="text-blue-400">{fmtUsd(totalUsdCents)}</strong>
          </span>
        </>
      )}
    </div>
  )
}
