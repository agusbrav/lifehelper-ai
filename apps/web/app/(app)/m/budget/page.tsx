import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@lifehelper/core'
import { getOrCreateMonth } from '@lifehelper/budget'
import { MonthNav } from '@/components/budget/month-nav'
import { SummaryBar } from '@/components/budget/summary-bar'
import { ExpenseTable } from '@/components/budget/expense-table'
import Link from 'next/link'

type Props = { searchParams: Promise<{ year?: string; month?: string }> }

export default async function BudgetPage({ searchParams }: Props) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) redirect('/login')

  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  const budgetMonth = await getOrCreateMonth(session.user.id, year, month)
  const items = budgetMonth?.items ?? []

  function effectiveAmount(i: typeof items[number]) {
    if (i.children.length > 0) return i.children.reduce((s, c) => s + (c.amount ?? 0), 0)
    return i.amount ?? 0
  }
  const paidCents = items.filter(i => i.paid).reduce((sum, i) => sum + effectiveAmount(i), 0)
  const pendingCents = items.filter(i => !i.paid).reduce((sum, i) => sum + effectiveAmount(i), 0)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <MonthNav year={year} month={month} />
        <div className="flex items-center gap-4">
          <SummaryBar paidCents={paidCents} pendingCents={pendingCents} />
          <Link
            href="/m/budget/analytics"
            className="text-sm text-[var(--accent)] hover:opacity-80 font-medium"
          >
            Analytics →
          </Link>
        </div>
      </div>

      <ExpenseTable
        items={items}
        monthId={budgetMonth?.id ?? ''}
        userId={session.user.id}
      />
    </div>
  )
}
