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
      <div className="p-5 text-sm text-[var(--muted-fg)]">
        {items.length === 0 ? 'No expenses yet.' : `${items.length} expense(s) — full table coming in next step.`}
      </div>
    </div>
  )
}
