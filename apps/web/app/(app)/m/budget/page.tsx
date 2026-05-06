import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@lifehelper/core'
import { getOrCreateMonth, fetchCategoryHistory, buildKeywordMap, knownCategories, getFirstMonth } from '@lifehelper/budget'
import { getTranslations } from 'next-intl/server'
import { MonthNav } from '@/components/budget/month-nav'
import { SummaryBar } from '@/components/budget/summary-bar'
import { ExpenseTable } from '@/components/budget/expense-table'
import { ResetMonthButton } from '@/components/budget/reset-month-button'
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

  const firstMonth = await getFirstMonth(session.user.id)
  if (firstMonth) {
    const targetIndex = year * 12 + month
    const firstIndex = firstMonth.year * 12 + firstMonth.month
    if (targetIndex < firstIndex) {
      redirect(`/m/budget?year=${firstMonth.year}&month=${firstMonth.month}`)
    }
  }

  const [budgetMonth, historyMap, t] = await Promise.all([
    getOrCreateMonth(session.user.id, year, month),
    fetchCategoryHistory(session.user.id),
    getTranslations('budget'),
  ])
  const items = budgetMonth?.items ?? []
  const keywordMap = buildKeywordMap(historyMap)
  const categories = knownCategories(keywordMap)

  type DbItem = typeof items[number]
  function effectiveAmount(i: DbItem) {
    const ch = i.children ?? []
    if (ch.length > 0) return ch.reduce((s, c) => s + (c.amount ?? 0), 0)
    return i.amount ?? 0
  }
  const paidCents = items.filter(i => i.paid).reduce((sum, i) => sum + effectiveAmount(i), 0)
  const pendingCents = items.filter(i => !i.paid).reduce((sum, i) => sum + effectiveAmount(i), 0)

  // Children from the DB query are one level deep and never have sub-children;
  // cast to satisfy the recursive Item type expected by ExpenseTable.
  type TableItem = Omit<DbItem, 'children'> & { children: TableItem[] }
  const tableItems = items as unknown as TableItem[]

  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-6">
        <MonthNav year={year} month={month} firstYear={firstMonth?.year} firstMonth={firstMonth?.month} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 ml-auto">
          <SummaryBar paidCents={paidCents} pendingCents={pendingCents} />
          <Link
            href="/m/budget/analytics"
            className="text-sm text-[var(--accent)] hover:opacity-80 font-medium whitespace-nowrap"
          >
            {t('analyticsLink')}
          </Link>
          <ResetMonthButton year={year} month={month} />
        </div>
      </div>

      <ExpenseTable
        items={tableItems}
        monthId={budgetMonth?.id ?? ''}
        userId={session.user.id}
        keywordMap={keywordMap}
        categories={categories}
      />
    </div>
  )
}
