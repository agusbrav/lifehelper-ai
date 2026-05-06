'use client'
import { useState, useRef, useTransition } from 'react'
import { setAmountAction, togglePaidAction, deleteItemAction } from '@/app/(app)/m/budget/actions'

function fmt(cents: number) {
  return (cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

function installmentLabel(name: string, num: number | null, total: number | null) {
  if (num !== null && total !== null) return `${name} (${num}/${total})`
  return name
}

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

type Props = { item: Item; depth?: number }

export function ExpenseRow({ item, depth = 0 }: Props) {
  const [editing, setEditing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const hasChildren = item.children.length > 0
  const isSubItem = depth > 0

  function handleAmountClick() {
    if (isSubItem) return
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

  const displayName = installmentLabel(item.name, item.installmentNumber, item.installmentTotal)
  const isRecurringOrInstallment = item.recurring || item.installmentTotal !== null

  return (
    <>
      <tr className={`border-t border-[var(--border)] ${depth > 0 ? 'bg-[var(--muted)]' : ''} group`}>
        {/* Name */}
        <td className={`py-3 ${depth === 0 ? 'pl-5' : 'pl-10'} pr-3`}>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRecurringOrInstallment ? 'bg-[var(--accent)]' : 'bg-[var(--muted-fg)]'}`} />
            {hasChildren && (
              <button
                onClick={() => setCollapsed(c => !c)}
                className="text-[var(--muted-fg)] text-xs w-4 text-center"
              >
                {collapsed ? '▸' : '▾'}
              </button>
            )}
            <span className={`text-sm ${depth > 0 ? 'text-[var(--muted-fg)]' : 'text-[var(--fg)]'} ${hasChildren ? 'font-semibold' : ''}`}>
              {depth > 0 && <span className="mr-1">↳</span>}{displayName}
            </span>
          </div>
        </td>
        {/* Category */}
        <td className="py-3 px-3 text-sm text-[var(--muted-fg)]">{item.category ?? ''}</td>
        {/* Amount */}
        <td className="py-3 px-3 text-right text-sm">
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
              disabled={isSubItem}
              className={`font-medium ${isSubItem ? 'cursor-default text-[var(--muted-fg)]' : 'hover:text-[var(--accent)] transition-colors cursor-pointer'} ${item.amount === null ? 'text-[var(--muted-fg)] italic' : 'text-[var(--fg)]'}`}
            >
              {item.amount !== null ? `$${fmt(item.amount)}` : '—'}
              {item.amountCarried && !isSubItem && (
                <span className="ml-1 text-[var(--muted-fg)] text-xs" title="Suggested from last month">↩</span>
              )}
            </button>
          )}
        </td>
        {/* Paid */}
        <td className="py-3 px-5 text-center">
          {isSubItem ? (
            <span className="text-[var(--muted-fg)] text-xs">—</span>
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
        <td className="py-3 pr-4 text-center w-8">
          <button
            onClick={() => startTransition(() => deleteItemAction(item.id))}
            className="opacity-0 group-hover:opacity-100 text-[var(--muted-fg)] hover:text-rose-400 transition-all text-xs"
            aria-label="Delete"
          >
            ✕
          </button>
        </td>
      </tr>
      {!collapsed && item.children.map(child => (
        <ExpenseRow key={child.id} item={child} depth={depth + 1} />
      ))}
    </>
  )
}
