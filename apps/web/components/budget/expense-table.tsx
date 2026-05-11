'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { ResolvedLink } from '@lifehelper/budget'
import { matchCategory, buildTypeMap } from '@lifehelper/budget'
import { ExpenseRow } from './expense-row'
import { AddExpenseRow } from './add-expense-row'

type Item = {
  id: string
  name: string
  category: string | null
  amount: number | null
  amountCarried: boolean
  recurring: boolean
  itemType: string
  isCard: boolean
  currency: string
  installmentTotal: number | null
  installmentNumber: number | null
  parentId: string | null
  expenseDate: Date | null
  children: Item[]
}

type KeywordRecord = { id: string; keyword: string; category: string | null; itemType: string | null }

type Props = {
  items: Item[]
  monthId: string
  userId: string
  keywordMap: Record<string, string>
  categories: string[]
  year: number
  month: number
  monthContext: 'current' | 'next' | 'past'
  userKeywords: KeywordRecord[]
  linksMap: Record<string, ResolvedLink[]>
}

type SortCol = 'name' | 'amount'
type SortDir = 'asc' | 'desc'

function effectiveAmount(item: Item): number {
  if (item.isCard && item.children.length > 0)
    return item.children.reduce((s, c) => s + (c.amount ?? 0), 0)
  return item.amount ?? -1
}

function SortArrow({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol | null; sortDir: SortDir }) {
  if (sortCol !== col) return <span className="ml-0.5 opacity-25 text-[9px]">⇅</span>
  return <span className="ml-0.5 text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
}

export function ExpenseTable({ items, monthId, keywordMap, categories, year, month, monthContext, userKeywords, linksMap }: Props) {
  const t = useTranslations('budget')

  const typeMap = buildTypeMap(userKeywords)
  const [sortCol, setSortCol] = useState<SortCol | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterCats, setFilterCats] = useState<Set<string>>(new Set())
  const [catDropdownOpen, setCatDropdownOpen] = useState(false)
  const catDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!catDropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node))
        setCatDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [catDropdownOpen])

  const cardItems = useMemo(() => {
    const cards = items.filter(i => i.isCard)
    if (!sortCol) return cards
    return [...cards].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'name') cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      else if (sortCol === 'amount') cmp = effectiveAmount(a) - effectiveAmount(b)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [items, sortCol, sortDir])
  const expenseItems = useMemo(() => items.filter(i => !i.isCard), [items])
  const allCards = cardItems.map(i => ({ id: i.id, name: i.name }))

  const HIDDEN_CATS = new Set(['system', 'tarjetas'])

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>()
    // From current expenses (stored or keyword-matched)
    for (const i of expenseItems) {
      const cat = (i.category ?? matchCategory(i.name, keywordMap))?.toLowerCase().trim()
      if (cat && !HIDDEN_CATS.has(cat)) cats.add(cat)
    }
    // Always include user-defined categories — they're intentional even if no expense matches yet
    for (const r of userKeywords) {
      const cat = r.category?.toLowerCase().trim()
      if (cat && !HIDDEN_CATS.has(cat)) cats.add(cat)
    }
    return [...cats].sort()
  }, [expenseItems, keywordMap, userKeywords])

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

  const visibleExpenses = useMemo(() => {
    let result = [...expenseItems]
    if (filterCats.size > 0) {
      result = result.filter(i => {
        const stored = i.category?.toLowerCase().trim() ?? ''
        if (!stored && filterCats.has('')) return true
        const resolved = (i.category ?? matchCategory(i.name, keywordMap))?.toLowerCase().trim() ?? ''
        return filterCats.has(resolved)
      })
    }
    if (sortCol) {
      result.sort((a, b) => {
        let cmp = 0
        if (sortCol === 'name')
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        else if (sortCol === 'amount')
          cmp = effectiveAmount(a) - effectiveAmount(b)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [expenseItems, sortCol, sortDir, filterCats])

  const showCards = cardItems.length > 0 && filterCats.size === 0

  const inactiveCls = 'bg-transparent text-[var(--muted-fg)] border-[var(--border)] hover:text-[var(--fg)]'

  const sharedRowProps = { monthId, keywordMap, categories, year, month, monthContext, typeMap }
  const totalVisible = (showCards ? cardItems.length : 0) + visibleExpenses.length

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--muted)]">
              <th className="text-left py-2.5 pl-4 pr-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                <button onClick={() => toggleSort('name')} className="flex items-center hover:text-[var(--fg)] transition-colors uppercase tracking-wide">
                  {t('expense')}
                  <SortArrow col="name" sortCol={sortCol} sortDir={sortDir} />
                </button>
              </th>
              <th className="hidden md:table-cell text-center py-2.5 px-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-36">
                <div className="relative flex justify-center" ref={catDropdownRef}>
                  <button
                    onClick={() => setCatDropdownOpen(o => !o)}
                    className={`flex items-center gap-1 hover:text-[var(--fg)] transition-colors uppercase tracking-wide ${filterCats.size > 0 ? 'text-[var(--accent)]' : ''}`}
                  >
                    {t('category')}
                    {filterCats.size > 0 && <span className="text-[10px]">({filterCats.size})</span>}
                    <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor" className={`transition-transform ${catDropdownOpen ? 'rotate-180' : ''}`}>
                      <path d="M0 2l4 4 4-4z"/>
                    </svg>
                  </button>

                  {catDropdownOpen && (
                    <div className="absolute top-full mt-1.5 z-30 w-44 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg py-1 overflow-hidden">
                      {filterCats.size > 0 && (
                        <>
                          <button
                            onClick={() => setFilterCats(new Set())}
                            className="w-full text-left px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--border)]/40 transition-colors normal-case tracking-normal font-normal"
                          >
                            {t('clearFilters')}
                          </button>
                          <div className="h-px bg-[var(--border)] mx-2 my-1" />
                        </>
                      )}
                      <button
                        onClick={() => toggleCat('')}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--border)]/40 transition-colors tracking-normal font-normal"
                      >
                        <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
                          filterCats.has('')
                            ? 'bg-[var(--accent)] border-[var(--accent)]'
                            : 'border-[var(--border)]'
                        }`}>
                          {filterCats.has('') && (
                            <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent-fg)]">
                              <path d="M1 3.5l2 2 3-3"/>
                            </svg>
                          )}
                        </span>
                        <span className="text-[var(--muted-fg)] italic">{t('noCategory')}</span>
                      </button>
                      {uniqueCategories.length > 0 && <div className="h-px bg-[var(--border)] mx-2 my-1" />}
                      {uniqueCategories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => toggleCat(cat)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--border)]/40 transition-colors tracking-normal font-normal"
                        >
                          <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
                            filterCats.has(cat)
                              ? 'bg-[var(--accent)] border-[var(--accent)]'
                              : 'border-[var(--border)]'
                          }`}>
                            {filterCats.has(cat) && (
                              <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent-fg)]">
                                <path d="M1 3.5l2 2 3-3"/>
                              </svg>
                            )}
                          </span>
                          <span className="text-[var(--fg)]">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </th>
              <th className="hidden md:table-cell text-center py-2.5 px-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-10">
                {t('date')}
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide w-28">
                <button onClick={() => toggleSort('amount')} className="flex items-center justify-end w-full hover:text-[var(--fg)] transition-colors uppercase tracking-wide">
                  {t('amount')}
                  <SortArrow col="amount" sortCol={sortCol} sortDir={sortDir} />
                </button>
              </th>
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
                  <ExpenseRow key={item.id} item={item} {...sharedRowProps} links={linksMap[item.id] ?? []} linksMap={linksMap} />
                ))}
              </>
            )}

            {/* Divider between cards and expenses */}
            {showCards && visibleExpenses.length > 0 && (
              <tr className="bg-[var(--muted)]/60 border-t border-[var(--border)]">
                <td colSpan={5} className="py-1 pl-4 text-[10px] font-semibold text-[var(--muted-fg)] uppercase tracking-widest">
                  {t('expense')}s
                </td>
              </tr>
            )}

            {/* Regular expenses */}
            {visibleExpenses.map(item => (
              <ExpenseRow key={item.id} item={item} {...sharedRowProps} links={linksMap[item.id] ?? []} linksMap={linksMap} />
            ))}

            <AddExpenseRow monthId={monthId} keywordMap={keywordMap} categories={categories} />
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
