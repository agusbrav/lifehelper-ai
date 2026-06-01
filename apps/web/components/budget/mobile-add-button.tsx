'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ExpenseForm } from './expense-form'

type Props = {
  monthId: string
  keywordMap: Record<string, string>
  categories: string[]
}

export function MobileAddButton({ monthId, keywordMap, categories }: Props) {
  const t = useTranslations('budget')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('addExpense')}
        className="fixed right-4 z-30 w-14 h-14 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-lg flex items-center justify-center text-2xl font-light hover:opacity-90 active:scale-95 transition-all"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full bg-[var(--card-bg)] rounded-t-3xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-[var(--fg)]">{t('addExpense')}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors p-1"
                aria-label={t('cancel')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-5 pb-8">
              <ExpenseForm
                monthId={monthId}
                keywordMap={keywordMap}
                categories={categories}
                onDone={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
