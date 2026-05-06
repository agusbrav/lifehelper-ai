'use client'
import { useTranslations } from 'next-intl'
import { ExpenseRow } from './expense-row'
import { AddExpenseRow } from './add-expense-row'

type Item = {
  id: string
  name: string
  category: string | null
  amount: number | null
  amountCarried: boolean
  paid: boolean
  recurring: boolean
  installmentTotal: number | null
  installmentNumber: number | null
  parentId: string | null
  children: Item[]
}

type Props = {
  items: Item[]
  monthId: string
  userId: string
  keywordMap: Record<string, string>
  categories: string[]
}

export function ExpenseTable({ items, monthId, keywordMap, categories }: Props) {
  const t = useTranslations('budget')

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--muted)]">
            <th className="text-left py-2.5 pl-4 pr-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">{t('expense')}</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-28">{t('amount')}</th>
            <th className="text-center py-2.5 px-4 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-16">{t('paid')}</th>
            <th className="py-2.5 pr-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <ExpenseRow key={item.id} item={item} monthId={monthId} />
          ))}
          <AddExpenseRow monthId={monthId} keywordMap={keywordMap} categories={categories} />
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--muted-fg)]">
          {t('noExpenses')}
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-[var(--border)] flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted-fg)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          {t('legend.recurring')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          {t('legend.installments')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-400" />
          {t('legend.card')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--muted-fg)] opacity-50" />
          {t('legend.oneTime')}
        </span>
        <span className="ml-auto">&#8629; {t('legend.carriedAmount')}</span>
      </div>
    </div>
  )
}
