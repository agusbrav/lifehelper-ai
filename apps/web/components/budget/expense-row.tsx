'use client'
import { useState, useRef, useTransition } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import type { ResolvedLink } from '@lifehelper/budget'
import { setAmountAction, setAmountNextMonthAction, deleteItemAction, deleteLinkAction } from '@/app/(app)/m/budget/actions'
import { ExpenseForm } from './expense-form'
import { LinkPicker } from './link-picker'

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
  children: Item[]
}

type Props = {
  item: Item
  depth?: number
  monthId: string
  keywordMap: Record<string, string>
  categories: string[]
  year: number
  month: number
  monthContext: 'current' | 'next' | 'past'
  links: ResolvedLink[]
}

export function ExpenseRow({ item, depth = 0, monthId, keywordMap, categories, year, month, monthContext, links }: Props) {
  const t = useTranslations('budget')
  const format = useFormatter()
  const fmtArs = (cents: number) =>
    format.number(cents / 100, { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtUsd = (cents: number) =>
    'USD ' + format.number(cents / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const itemCurrency = item.currency ?? 'ARS'
  const fmt = itemCurrency === 'USD' ? fmtUsd : fmtArs
  const [editing, setEditing] = useState(false)
  const [collapsed, setCollapsed] = useState(item.isCard)
  const [addingCharge, setAddingCharge] = useState(false)
  const [inflationOpen, setInflationOpen] = useState(false)
  const [linkPickerOpen, setLinkPickerOpen] = useState(false)
  const [inflationMode, setInflationMode] = useState<'pct' | 'direct'>('pct')
  const [inflationValue, setInflationValue] = useState('')
  const [inflationTarget, setInflationTarget] = useState<'next' | 'this'>(
    monthContext === 'next' ? 'this' : 'next'
  )
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const isCard = item.isCard
  const isSubItem = depth > 0
  const children = item.children ?? []
  const hasChildren = children.length > 0

  const childrenSum = children.reduce((s, c) => s + (c.amount ?? 0), 0)
  const displayAmount = isCard && hasChildren ? childrenSum : item.amount

  const dotColor = isCard
    ? 'bg-purple-400'
    : item.installmentTotal !== null
      ? 'bg-amber-400'
      : item.itemType === 'subscription'
        ? 'bg-pink-400'
        : item.itemType === 'recurring'
          ? 'bg-blue-400'
          : 'bg-cyan-400'

  const displayName =
    item.installmentTotal !== null && item.installmentNumber !== null
      ? `${item.name} (${item.installmentNumber}/${item.installmentTotal})`
      : item.name

  const showInflationBtn = monthContext !== 'past'
    && (item.itemType === 'recurring' || item.itemType === 'subscription')
    && !isCard
    && item.amount !== null
    && itemCurrency !== 'USD'

  const inflationCurrentAmount = item.amount ?? 0
  const inflationNumVal = parseFloat(inflationValue) || 0
  const inflationNewAmount = inflationMode === 'pct'
    ? Math.round(inflationCurrentAmount * (1 + inflationNumVal / 100))
    : Math.round(inflationNumVal * 100)

  const inflationNextYear = month === 12 ? year + 1 : year
  const inflationNextMonthNum = month === 12 ? 1 : month + 1
  const thisMonthLabel = format.dateTime(new Date(year, month - 1, 1), { month: 'long' })
  const nextMonthLabel = format.dateTime(new Date(inflationNextYear, inflationNextMonthNum - 1, 1), { month: 'long' })
  const inflationTargetLabel = (inflationTarget === 'this' || monthContext === 'next') ? thisMonthLabel : nextMonthLabel

  function handleInflationApply() {
    if (inflationNewAmount <= 0) return
    startTransition(async () => {
      if (inflationTarget === 'this' || monthContext === 'next') {
        await setAmountAction(item.id, inflationNewAmount)
      } else {
        await setAmountNextMonthAction(item.id, inflationNewAmount)
      }
      setInflationOpen(false)
      setInflationValue('')
    })
  }

  function handleAmountClick() {
    if (isSubItem || isCard) return
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleAmountBlur() {
    const val = parseFloat(inputRef.current?.value ?? '')
    if (!isNaN(val) && val >= 0) {
      startTransition(() => setAmountAction(item.id, Math.round(val * 100)))
    }
    setEditing(false)
  }

  function handleAmountKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') inputRef.current?.blur()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <>
      <tr className={`border-t border-[var(--border)] group transition-colors hover:bg-[var(--accent-muted)] ${isSubItem ? 'bg-[var(--muted)]' : ''}`}>
        {/* Name */}
        <td className={`py-2.5 ${depth === 0 ? 'pl-4' : 'pl-10'} pr-3`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />

            {(hasChildren || isCard) && (
              <button
                onClick={() => setCollapsed(c => !c)}
                className="text-[var(--muted-fg)] text-xs w-4 text-center flex-shrink-0 leading-none"
              >
                {collapsed ? '▸' : '▾'}
              </button>
            )}

            <span className={`text-sm truncate ${isSubItem ? 'text-[var(--muted-fg)]' : 'text-[var(--fg)]'} ${hasChildren ? 'font-medium' : ''}`}>
              {isSubItem && <span className="mr-1 text-[var(--muted-fg)]">↳</span>}
              {displayName}
            </span>

            {isCard && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-medium flex-shrink-0">
                {t('addChargeBadge')}
              </span>
            )}
            {!isCard && item.installmentTotal !== null && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium flex-shrink-0">
                {t('installmentBadge')}
              </span>
            )}
            {!isCard && item.installmentTotal === null && item.itemType === 'recurring' && !isSubItem && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium flex-shrink-0">
                {t('recurringBadge')}
              </span>
            )}
            {!isCard && item.installmentTotal === null && item.itemType === 'subscription' && !isSubItem && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-400 font-medium flex-shrink-0">
                {t('subscriptionBadge')}
              </span>
            )}
            {!isCard && item.installmentTotal === null && item.itemType === 'one_time' && !isSubItem && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-medium flex-shrink-0">
                {t('oneTimeBadge')}
              </span>
            )}
            {itemCurrency === 'USD' && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium flex-shrink-0">
                {t('usdBadge')}
              </span>
            )}

            {links.map(link => (
              <span
                key={link.linkId}
                className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-medium flex-shrink-0 inline-flex items-center gap-1"
              >
                <a
                  href={link.url}
                  onClick={e => e.stopPropagation()}
                  className="hover:text-indigo-300 transition-colors"
                >
                  ↗ {link.label}
                </a>
                <button
                  onClick={e => { e.stopPropagation(); startTransition(() => deleteLinkAction(link.linkId)) }}
                  className="opacity-50 hover:opacity-100 transition-opacity leading-none"
                  aria-label="Remove link"
                >
                  ×
                </button>
              </span>
            ))}

            <span className="ml-auto flex-shrink-0 flex items-center gap-2">
              {item.amountCarried && !isCard && (
                <span className="text-[var(--muted-fg)] text-xs opacity-0 group-hover:opacity-100 transition-opacity" title={t('carriedTitle')}>
                  {t('carriedIndicator')}
                </span>
              )}
              {showInflationBtn && (
                <button
                  onClick={e => { e.stopPropagation(); setInflationOpen(o => { if (o) setInflationValue(''); return !o }) }}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 ${
                    inflationOpen
                      ? 'bg-indigo-500/25 text-indigo-300 border-indigo-500/40'
                      : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/25'
                  }`}
                >
                  {t('inflationBtn')}
                </button>
              )}
              {!isSubItem && !isCard && (
                <button
                  onClick={() => setLinkPickerOpen(o => !o)}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 ${
                    linkPickerOpen
                      ? 'bg-indigo-500/25 text-indigo-300 border-indigo-500/40'
                      : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/25'
                  }`}
                >
                  + link
                </button>
              )}
              {isCard && !isSubItem && (
                <button
                  onClick={() => { setAddingCharge(a => !a); setCollapsed(false) }}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors opacity-0 group-hover:opacity-100"
                >
                  {t('addCharge')}
                </button>
              )}
            </span>
          </div>
        </td>

        {/* Category */}
        <td className="hidden md:table-cell py-2.5 px-3 text-sm text-[var(--muted-fg)] w-36 text-center">
          <span className="capitalize">{item.category ?? ''}</span>
        </td>

        {/* Amount */}
        <td className="py-2.5 px-3 text-right text-sm w-28">
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              defaultValue={item.amount !== null ? item.amount / 100 : ''}
              onBlur={handleAmountBlur}
              onKeyDown={handleAmountKeyDown}
              className="w-24 text-right bg-[var(--muted)] border border-[var(--accent)] rounded-md px-2 py-0.5 text-sm outline-none text-[var(--fg)]"
            />
          ) : (
            <button
              onClick={handleAmountClick}
              disabled={isSubItem || isCard}
              className={`font-medium tabular-nums ${isSubItem || isCard ? 'cursor-default' : 'hover:text-[var(--accent)] transition-colors'} ${
                displayAmount === null
                  ? 'text-[var(--muted-fg)] italic font-normal'
                  : itemCurrency === 'USD'
                    ? 'text-blue-400'
                    : isCard
                      ? 'text-purple-400'
                      : 'text-[var(--fg)]'
              }`}
            >
              {displayAmount !== null ? fmt(displayAmount) : '-'}
            </button>
          )}
        </td>

        {/* Delete */}
        <td className="py-2.5 pr-3 text-center w-8">
          <button
            onClick={() => {
              if (isCard && !window.confirm(`¿Eliminar la tarjeta "${item.name}"? Se eliminarán también todos sus cargos.`)) return
              startTransition(() => deleteItemAction(item.id))
            }}
            className="opacity-0 group-hover:opacity-100 text-[var(--muted-fg)] hover:text-rose-400 transition-all text-xs"
            aria-label={t('delete')}
          >
            ✕
          </button>
        </td>
      </tr>

      {linkPickerOpen && (
        <tr className="border-t border-indigo-500/20 bg-indigo-500/5">
          <td colSpan={4} className={`py-2.5 pr-4 ${depth === 0 ? 'pl-4' : 'pl-10'}`}>
            <LinkPicker
              sourceModuleId="budget"
              sourceEntityId={item.id}
              onDone={() => setLinkPickerOpen(false)}
            />
          </td>
        </tr>
      )}

      {/* Inflation quick-adjust popover */}
      {inflationOpen && (
        <tr className="border-t border-indigo-500/20 bg-indigo-500/5">
          <td colSpan={4} className={`py-3 pr-4 ${depth === 0 ? 'pl-4' : 'pl-10'}`}>
            <div className="flex flex-col gap-3 max-w-sm">
              <span className="text-xs font-medium text-[var(--muted-fg)] uppercase tracking-wide">
                {t('inflationTitle', { name: item.name })}
              </span>

              <div className="flex rounded-md overflow-hidden border border-[var(--border)] w-fit text-xs">
                <button
                  onClick={() => setInflationTarget('next')}
                  disabled={monthContext === 'next'}
                  className={`px-3 py-1.5 transition-colors ${
                    inflationTarget === 'next' && monthContext !== 'next'
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : monthContext === 'next'
                        ? 'text-[var(--muted-fg)]/30 cursor-not-allowed'
                        : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'
                  }`}
                >
                  {t('inflationNextMonth')}
                </button>
                <button
                  onClick={() => setInflationTarget('this')}
                  className={`px-3 py-1.5 transition-colors border-l border-[var(--border)] ${
                    inflationTarget === 'this' || monthContext === 'next'
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'
                  }`}
                >
                  {t('inflationThisMonth')}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-md overflow-hidden border border-[var(--border)] text-xs">
                  <button
                    onClick={() => setInflationMode('pct')}
                    className={`px-3 py-1.5 transition-colors ${inflationMode === 'pct' ? 'bg-indigo-500/20 text-indigo-300' : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'}`}
                  >
                    {t('inflationPct')}
                  </button>
                  <button
                    onClick={() => setInflationMode('direct')}
                    className={`px-3 py-1.5 transition-colors border-l border-[var(--border)] ${inflationMode === 'direct' ? 'bg-indigo-500/20 text-indigo-300' : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'}`}
                  >
                    {t('inflationDirect')}
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step={inflationMode === 'pct' ? '0.1' : '1'}
                  value={inflationValue}
                  onChange={e => setInflationValue(e.target.value)}
                  placeholder={inflationMode === 'pct' ? '5' : format.number(inflationCurrentAmount / 100, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  className="w-32 bg-[var(--muted)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm text-[var(--fg)] outline-none focus:ring-1 focus:ring-indigo-400"
                />
                {inflationValue !== '' && inflationNewAmount > 0 && (
                  <span className="text-xs text-[var(--muted-fg)]">
                    {'→ '}<span className="text-emerald-400 font-medium font-mono">
                      {format.number(inflationNewAmount / 100, { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleInflationApply}
                  disabled={inflationValue === '' || inflationNewAmount <= 0}
                  className="bg-indigo-500 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('inflationApply', { month: inflationTargetLabel })}
                </button>
                <button
                  onClick={() => { setInflationOpen(false); setInflationValue('') }}
                  className="text-xs text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors"
                >
                  {t('inflationCancel')}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Inline add-charge form for credit card rows */}
      {isCard && addingCharge && (
        <tr className="border-t border-purple-500/20 bg-purple-500/5">
          <td colSpan={4} className="py-2.5 pl-10 pr-4">
            <ExpenseForm
              monthId={monthId}
              keywordMap={keywordMap}
              categories={categories}
              parentId={item.id}
              defaultCurrency={itemCurrency as 'ARS' | 'USD'}
              withInstallment
              theme="purple"
              namePlaceholder={t('chargeDescription')}
              onDone={() => setAddingCharge(false)}
            />
          </td>
        </tr>
      )}

      {/* Children rows */}
      {!collapsed && children.map(child => (
        <ExpenseRow key={child.id} item={child} depth={depth + 1} monthId={monthId} keywordMap={keywordMap} categories={categories} year={year} month={month} monthContext={monthContext} links={[]} />
      ))}
    </>
  )
}
