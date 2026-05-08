'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ExpenseForm } from './expense-form'

type Props = {
  monthId: string
  keywordMap: Record<string, string>
  categories: string[]
}

export function AddExpenseRow({ monthId, keywordMap, categories }: Props) {
  const t = useTranslations('budget')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <tr className="border-t border-[var(--border)]">
        <td colSpan={4} className="py-2 pl-5">
          <button
            onClick={() => setOpen(true)}
            className="text-sm text-[var(--muted-fg)] hover:text-[var(--accent)] transition-colors"
          >
            + {t('addExpense')}
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-[var(--border)] bg-[var(--muted)]">
      <td colSpan={4} className="py-3 px-4">
        <ExpenseForm
          monthId={monthId}
          keywordMap={keywordMap}
          categories={categories}
          onDone={() => setOpen(false)}
        />
      </td>
    </tr>
  )
}
