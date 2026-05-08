import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@lifehelper/core'
import { getOrCreateMonth, fetchCategoryHistory, buildKeywordMap, knownCategories, getFirstMonth, getCardsForUser, getCategoryKeywords, getLinksForItems } from '@lifehelper/budget'
import { getTranslations } from 'next-intl/server'
import { MonthNav } from '@/components/budget/month-nav'
import { SummaryBar } from '@/components/budget/summary-bar'
import { ExpenseTable } from '@/components/budget/expense-table'
import Link from 'next/link'
import { ChatRegistrar } from './chat-registrar'

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

  const maxYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
  const maxMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
  if (year * 12 + month > maxYear * 12 + maxMonth) {
    redirect(`/m/budget?year=${maxYear}&month=${maxMonth}`)
  }

  type MonthContext = 'current' | 'next' | 'past'
  const monthContext: MonthContext =
    year === now.getFullYear() && month === now.getMonth() + 1 ? 'current' :
    year * 12 + month === now.getFullYear() * 12 + now.getMonth() + 2 ? 'next' :
    'past'

  const firstMonth = await getFirstMonth(session.user.id)
  const nowIndex = now.getFullYear() * 12 + (now.getMonth() + 1)
  // Floor = earliest month the user may navigate to.
  // Use the first month with real (non-card) data, capped at the current calendar month:
  // - No real data yet → floor = current month (can't wander into empty past months)
  // - Real data in the past → floor = that month (can review history)
  // - Real data only in the future → floor = current month (prevents the redirect loop)
  const dataIndex = firstMonth ? firstMonth.year * 12 + firstMonth.month : nowIndex
  const floorIndex = Math.min(dataIndex, nowIndex)
  const floorYear = Math.floor((floorIndex - 1) / 12)
  const floorMonth = floorIndex - floorYear * 12
  const targetIndex = year * 12 + month
  const maxIndex = maxYear * 12 + maxMonth
  if (targetIndex < floorIndex && floorIndex <= maxIndex) {
    redirect(`/m/budget?year=${floorYear}&month=${floorMonth}`)
  }

  const [budgetMonth, historyMap, t, cards, userKeywordRecords] = await Promise.all([
    getOrCreateMonth(session.user.id, year, month),
    fetchCategoryHistory(session.user.id),
    getTranslations('budget'),
    getCardsForUser(session.user.id),
    getCategoryKeywords(session.user.id),
  ])
  const items = budgetMonth?.items ?? []
  const allItemIds = [
    ...items.map(i => i.id),
    ...items.flatMap(i => (i.children ?? []).map(c => c.id)),
  ]
  const linksMap = await getLinksForItems(session.user.id, 'budget', allItemIds)
  const userKeywords = Object.fromEntries(userKeywordRecords.map(r => [r.keyword, r.category]))
  const keywordMap = buildKeywordMap(historyMap, userKeywords)
  const categories = knownCategories(keywordMap)

  type DbItem = typeof items[number]
  // A card's currency is authoritative for its charges. Children of a USD card are always USD
  // even if their stored currency is 'ARS' (schema default for rows created before USD tracking).
  function totalByCurrency(currency: 'ARS' | 'USD'): number {
    return items.reduce((sum, i) => {
      const ch = i.children ?? []
      const iCur = (i.currency ?? 'ARS') as 'ARS' | 'USD'
      if (ch.length > 0)
        return sum + ch
          .filter(c => (c.currency === 'USD' || iCur === 'USD' ? 'USD' : 'ARS') === currency)
          .reduce((s, c) => s + (c.amount ?? 0), 0)
      return iCur === currency ? sum + (i.amount ?? 0) : sum
    }, 0)
  }

  const totalArsCents = totalByCurrency('ARS')
  const totalUsdCents = totalByCurrency('USD')

  // Children from the DB query are one level deep and never have sub-children;
  // cast to satisfy the recursive Item type expected by ExpenseTable.
  type TableItem = Omit<DbItem, 'children'> & { children: TableItem[] }
  const tableItems = items as unknown as TableItem[]

  return (
    <>
    <ChatRegistrar year={year} month={month} />
    <div className="p-4 sm:p-6 w-full">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-6">
        <MonthNav year={year} month={month} firstYear={floorYear} firstMonth={floorMonth} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 ml-auto">
          <SummaryBar
            totalArsCents={totalArsCents}
            totalUsdCents={totalUsdCents}
          />
          <Link
            href="/m/budget/analytics"
            className="text-sm text-[var(--accent)] hover:opacity-80 font-medium whitespace-nowrap"
          >
            {t('analyticsLink')}
          </Link>
        </div>
      </div>

      <ExpenseTable
        items={tableItems}
        monthId={budgetMonth?.id ?? ''}
        userId={session.user.id}
        keywordMap={keywordMap}
        categories={categories}
        year={year}
        month={month}
        monthContext={monthContext}
        cards={cards}
        userKeywords={userKeywordRecords}
        linksMap={linksMap}
      />
    </div>
    </>
  )
}
