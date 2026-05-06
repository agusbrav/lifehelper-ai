'use client'
import { useState, useRef, useTransition } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { setAmountAction, togglePaidAction, deleteItemAction, addExpenseAction } from '@/app/(app)/m/budget/actions'

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

type Props = { item: Item; depth?: number; monthId: string }

export function ExpenseRow({ item, depth = 0, monthId }: Props) {
  const t = useTranslations('budget')
  const format = useFormatter()
  const fmt = (cents: number) =>
    format.number(cents / 100, { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const [editing, setEditing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [addingCharge, setAddingCharge] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const isCard = item.category === 'tarjeta'
  const isSubItem = depth > 0
  const children = item.children ?? []
  const hasChildren = children.length > 0

  const childrenSum = children.reduce((s, c) => s + (c.amount ?? 0), 0)
  const displayAmount = isCard && hasChildren ? childrenSum : item.amount

  const dotColor = isCard
    ? 'bg-purple-400'
    : item.installmentTotal !== null
      ? 'bg-amber-400'
      : item.recurring
        ? 'bg-blue-400'
        : 'bg-[var(--muted-fg)] opacity-40'

  const displayName =
    item.installmentTotal !== null && item.installmentNumber !== null
      ? `${item.name} (${item.installmentNumber}/${item.installmentTotal})`
      : item.name

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

  function handleAddCharge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('monthId', monthId)
    fd.set('parentId', item.id)
    fd.set('recurring', 'false')
    e.currentTarget.reset()
    startTransition(async () => {
      await addExpenseAction(fd)
      setAddingCharge(false)
    })
  }

  return (
    <>
      <tr className={`border-t border-[var(--border)] group ${isSubItem ? 'bg-[var(--muted)]' : ''}`}>
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
            {!isCard && item.installmentTotal === null && item.recurring && !isSubItem && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium flex-shrink-0">
                {t('recurringBadge')}
              </span>
            )}

            <span className="ml-auto flex-shrink-0 flex items-center gap-2">
              {item.amountCarried && !isCard && (
                <span className="text-[var(--muted-fg)] text-xs opacity-0 group-hover:opacity-100 transition-opacity" title={t('carriedTitle')}>
                  {t('carriedIndicator')}
                </span>
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
              className={`font-medium tabular-nums ${isSubItem || isCard ? 'cursor-default' : 'hover:text-[var(--accent)] transition-colors'} ${displayAmount === null ? 'text-[var(--muted-fg)] italic font-normal' : isCard ? 'text-purple-400' : 'text-[var(--fg)]'}`}
            >
              {displayAmount !== null ? fmt(displayAmount) : '-'}
            </button>
          )}
        </td>

        {/* Paid */}
        <td className="py-2.5 px-4 text-center w-16">
          {isSubItem ? (
            <span className="text-[var(--muted-fg)] text-xs">-</span>
          ) : (
            <input
              type="checkbox"
              checked={item.paid}
              onChange={() => startTransition(() => togglePaidAction(item.id))}
              className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
            />
          )}
        </td>

        {/* Delete */}
        <td className="py-2.5 pr-3 text-center w-8">
          <button
            onClick={() => startTransition(() => deleteItemAction(item.id))}
            className="opacity-0 group-hover:opacity-100 text-[var(--muted-fg)] hover:text-rose-400 transition-all text-xs"
            aria-label={t('delete')}
          >
            ✕
          </button>
        </td>
      </tr>

      {/* Inline add-charge form for credit card rows */}
      {isCard && addingCharge && (
        <tr className="border-t border-purple-500/20 bg-purple-500/5">
          <td colSpan={4} className="py-2.5 pl-10 pr-4">
            <form onSubmit={handleAddCharge} className="flex gap-2 items-center flex-wrap">
              <input
                name="name"
                required
                placeholder={t('chargeDescription')}
                autoFocus
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-purple-400 flex-1 min-w-32"
              />
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder={t('chargeAmount')}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-purple-400 w-28"
              />
              <button
                type="submit"
                className="bg-purple-500 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-purple-600 transition-colors flex-shrink-0"
              >
                {t('add')}
              </button>
              <button
                type="button"
                onClick={() => setAddingCharge(false)}
                className="text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors flex-shrink-0"
              >
                {t('cancel')}
              </button>
            </form>
          </td>
        </tr>
      )}

      {/* Children rows */}
      {!collapsed && children.map(child => (
        <ExpenseRow key={child.id} item={child} depth={depth + 1} monthId={monthId} />
      ))}
    </>
  )
}
