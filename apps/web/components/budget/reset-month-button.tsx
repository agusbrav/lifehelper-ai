'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { resetMonthAction } from '@/app/(app)/m/budget/actions'

type Props = { year: number; month: number }

export function ResetMonthButton({ year, month }: Props) {
  const t = useTranslations('budget')
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleReset() {
    startTransition(async () => {
      await resetMonthAction(year, month)
      setConfirming(false)
      router.refresh()
    })
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-[var(--muted-fg)]">{t('resetMonthConfirm')}</span>
        <button
          onClick={handleReset}
          disabled={isPending}
          className="text-rose-400 hover:text-rose-300 font-medium transition-colors"
        >
          {isPending ? '…' : '✓'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors"
        >
          ✕
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-[var(--muted-fg)] hover:text-rose-400 transition-colors"
    >
      {t('resetMonth')}
    </button>
  )
}
