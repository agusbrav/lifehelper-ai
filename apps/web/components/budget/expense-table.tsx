'use client'
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

type Props = { items: Item[]; monthId: string; userId: string }

export function ExpenseTable({ items, monthId }: Props) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--muted)]">
            <th className="text-left py-2.5 pl-5 pr-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Expense</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Category</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Amount</th>
            <th className="text-center py-2.5 px-5 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">Paid</th>
            <th className="py-2.5 pr-4 w-8" />
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <ExpenseRow key={item.id} item={item} />
          ))}
          <AddExpenseRow monthId={monthId} />
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="py-10 text-center text-sm text-[var(--muted-fg)]">
          No expenses yet. Add your first one below.
        </div>
      )}

      <div className="px-5 py-2.5 border-t border-[var(--border)] flex gap-4 text-xs text-[var(--muted-fg)]">
        <span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1.5 align-middle" />
          Recurring or installment
        </span>
        <span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--muted-fg)] mr-1.5 align-middle" />
          One-off
        </span>
        <span className="ml-auto">↩ amount suggested from last month</span>
      </div>
    </div>
  )
}
