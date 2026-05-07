'use client'
import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ExpenseRow } from './expense-row'
import { AddExpenseRow } from './add-expense-row'
import { BudgetConfigPanel } from './budget-config-panel'

type Item = {
  id: string
  name: string
  category: string | null
  amount: number | null
  amountCarried: boolean
  paid: boolean
  recurring: boolean
  itemType: string
  isCard: boolean
  currency: string
  installmentTotal: number | null
  installmentNumber: number | null
  parentId: string | null
  children: Item[]
}

type Card = { id: string; name: string; currency: string }
type KeywordRecord = { id: string; keyword: string; category: string }

type Props = {
  items: Item[]
  monthId: string
  userId: string
  keywordMap: Record<string, string>
  categories: string[]
  year: number
  month: number
  monthContext: 'current' | 'next' | 'past'
  cards: Card[]
  userKeywords: KeywordRecord[]
}

type SortCol = 'name' | 'category' | 'amount'
type SortDir = 'asc' | 'desc'

function resolvedType(item: Item): string {
  if (item.isCard) return 'card'
  if (item.installmentTotal !== null) return 'installment'
  return item.itemType
}

function effectiveAmount(item: Item): number {
  if (item.isCard && item.children.length > 0)
    return item.children.reduce((s, c) => s + (c.amount ?? 0), 0)
  return item.amount ?? -1
}

function SortArrow({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol | null; sortDir: SortDir }) {
  if (sortCol !== col) return <span className="ml-0.5 opacity-25 text-[9px]">⇅</span>
  return <span className="ml-0.5 text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
}

export function ExpenseTable({ items, monthId, keywordMap, categories, year, month, monthContext, cards, userKeywords }: Props) {
  const t = useTranslations('budget')

  const [sortCol, setSortCol] = useState<SortCol | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterCats, setFilterCats] = useState<Set<string>>(new Set())
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set())

  const cardItems = useMemo(() => items.filter(i => i.isCard), [items])
  const expenseItems = useMemo(() => items.filter(i => !i.isCard), [items])
  const allCards = cardItems.map(i => ({ id: i.id, name: i.name }))

  const uniqueCategories = useMemo(
    () => [...new Set(expenseItems.map(i => i.category).filter((c): c is string => c !== null))].sort(),
    [expenseItems],
  )

  function toggleSort(col: SortCol) {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else setSortCol(null)
  }

  function toggleCat(cat: string) {
    setFilterCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function toggleType(type: string) {
    setFilterTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const visibleExpenses = useMemo(() => {
    let result = [...expenseItems]
    if (filterCats.size > 0)
      result = result.filter(i => filterCats.has(i.category ?? ''))
    if (filterTypes.size > 0)
      result = result.filter(i => filterTypes.has(resolvedType(i)))
    if (sortCol) {
      result.sort((a, b) => {
        let cmp = 0
        if (sortCol === 'name')
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        else if (sortCol === 'category')
          cmp = (a.category ?? '').localeCompare(b.category ?? '', undefined, { sensitivity: 'base' })
        else if (sortCol === 'amount')
          cmp = effectiveAmount(a) - effectiveAmount(b)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [expenseItems, sortCol, sortDir, filterCats, filterTypes])

  // Cards show unless a non-card type filter or any category filter is active
  const showCards = cardItems.length > 0
    && (filterTypes.size === 0 || filterTypes.has('card'))
    && filterCats.size === 0

  // Expenses show unless the only active type filter is 'card'
  const showExpenses = !(filterTypes.size === 1 && filterTypes.has('card'))

  const hasFilters = filterCats.size > 0 || filterTypes.size > 0

  const inactiveCls = 'bg-transparent text-[var(--muted-fg)] border-[var(--border)] hover:text-[var(--fg)]'

  const typeFilters = [
    { key: 'recurring',    label: t('recurringBadge'),    activeCls: 'bg-blue-500/15   text-blue-400   border-blue-500/30'   },
    { key: 'subscription', label: t('subscriptionBadge'), activeCls: 'bg-pink-500/15   text-pink-400   border-pink-500/30'   },
    { key: 'installment',  label: t('installmentBadge'),  activeCls: 'bg-amber-500/15  text-amber-400  border-amber-500/30'  },
    { key: 'card',         label: t('addChargeBadge'),    activeCls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
    { key: 'one_time',     label: t('oneTimeBadge'),      activeCls: 'bg-cyan-500/15   text-cyan-400   border-cyan-500/30'   },
  ]

  const sharedRowProps = { monthId, keywordMap, categories, year, month, monthContext }
  const totalVisible = (showCards ? cardItems.length : 0) + (showExpenses ? visibleExpenses.length : 0)

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">

      {/* Filter bar */}
      {items.length > 0 && (
        <div className="px-4 py-2 border-b border-[var(--border)] flex flex-wrap gap-1.5 items-center">
          {typeFilters.map(f => (
            <button
              key={f.key}
              onClick={() => toggleType(f.key)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                filterTypes.has(f.key) ? f.activeCls : inactiveCls
              }`}
            >
              {f.label}
            </button>
          ))}

          {uniqueCategories.length > 0 && (
            <>
              <span className="w-px h-3.5 bg-[var(--border)] mx-0.5 self-center" />
              {uniqueCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCat(cat)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                    filterCats.has(cat)
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                      : inactiveCls
                  }`}
                >
                  {cat}
                </button>
              ))}
            </>
          )}

          <span className="ml-auto flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={() => { setFilterCats(new Set()); setFilterTypes(new Set()) }}
                className="text-xs text-[var(--muted-fg)] hover:text-rose-400 transition-colors"
              >
                {t('clearFilters')}
              </button>
            )}
            <BudgetConfigPanel year={year} month={month} cards={cards} userKeywords={userKeywords} />
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--muted)]">
              <th className="text-left py-2.5 pl-4 pr-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                <button onClick={() => toggleSort('name')} className="flex items-center hover:text-[var(--fg)] transition-colors">
                  {t('expense')}
                  <SortArrow col="name" sortCol={sortCol} sortDir={sortDir} />
                </button>
              </th>
              <th className="hidden md:table-cell text-center py-2.5 px-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-36">
                <button onClick={() => toggleSort('category')} className="flex items-center justify-center w-full hover:text-[var(--fg)] transition-colors">
                  {t('category')}
                  <SortArrow col="category" sortCol={sortCol} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-28">
                <button onClick={() => toggleSort('amount')} className="flex items-center justify-end w-full hover:text-[var(--fg)] transition-colors">
                  {t('amount')}
                  <SortArrow col="amount" sortCol={sortCol} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-center py-2.5 px-2 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-14">{t('paid')}</th>
              <th className="py-2.5 pr-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {/* Cards group — pinned at top */}
            {showCards && (
              <>
                <tr className="bg-purple-500/5 border-t border-[var(--border)]">
                  <td colSpan={5} className="py-1 pl-4 text-[10px] font-semibold text-purple-400 uppercase tracking-widest">
                    {t('addChargeBadge')}s
                  </td>
                </tr>
                {cardItems.map(item => (
                  <ExpenseRow key={item.id} item={item} {...sharedRowProps} />
                ))}
              </>
            )}

            {/* Divider between cards and expenses */}
            {showCards && showExpenses && visibleExpenses.length > 0 && (
              <tr className="bg-[var(--muted)]/60 border-t border-[var(--border)]">
                <td colSpan={5} className="py-1 pl-4 text-[10px] font-semibold text-[var(--muted-fg)] uppercase tracking-widest">
                  {t('expense')}s
                </td>
              </tr>
            )}

            {/* Regular expenses */}
            {showExpenses && visibleExpenses.map(item => (
              <ExpenseRow key={item.id} item={item} {...sharedRowProps} />
            ))}

            <AddExpenseRow monthId={monthId} keywordMap={keywordMap} categories={categories} cards={allCards} />
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--muted-fg)]">
          {t('noExpenses')}
        </div>
      )}

      {items.length > 0 && totalVisible === 0 && (
        <div className="py-6 text-center text-sm text-[var(--muted-fg)]">
          {t('noFilterResults')}
        </div>
      )}
    </div>
  )
}
