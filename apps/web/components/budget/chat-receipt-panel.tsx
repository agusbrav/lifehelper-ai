'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { addReceiptExpensesAction } from '@/app/(app)/m/budget/actions'
import type { ParsedReceiptItem } from '@/app/(app)/m/budget/config/parse-receipt-action'

type Props = {
  items: ParsedReceiptItem[]
  year: number
  month: number
  onDone: (added: number) => void
  onCancel: () => void
}

function formatAmount(item: ParsedReceiptItem): string {
  if (item.currency === 'USD') return `USD ${item.amountUSD?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  return `$ ${item.amountARS?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

export function ChatReceiptPanel({ items, year, month, onDone, onCancel }: Props) {
  const t = useTranslations('budget')
  const [selected, setSelected] = useState<Set<number>>(new Set(items.map((_, i) => i)))
  const [phase, setPhase] = useState<'preview' | 'importing'>('preview')
  const [error, setError] = useState<string | null>(null)
  const [descriptions, setDescriptions] = useState<string[]>(items.map(i => i.description))

  function toggleOne(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function handleConfirm() {
    if (selected.size === 0) return
    setPhase('importing')
    setError(null)
    try {
      const toAdd = [...selected].flatMap(i => {
        const item = items[i]
        if (!item) return []
        const amountCents = item.currency === 'USD'
          ? Math.round((item.amountUSD ?? 0) * 100)
          : Math.round((item.amountARS ?? 0) * 100)
        return [{
          description: descriptions[i] ?? item.description,
          amountCents,
          currency: item.currency,
          expenseDate: item.date ? new Date(item.date) : undefined,
          category: item.category ?? undefined,
        }]
      })
      const { added } = await addReceiptExpensesAction(toAdd, year, month)
      onDone(added)
    } catch {
      setError(t('importError'))
      setPhase('preview')
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden text-xs w-full">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-[var(--fg)] font-medium">{t('importPreviewTitle')} ({items.length})</span>
        <button onClick={onCancel} className="text-[var(--muted-fg)] hover:text-rose-400 transition-colors">&#x2715;</button>
      </div>

      <div className="max-h-44 overflow-y-auto divide-y divide-[var(--border)]">
        {items.length === 0 && (
          <p className="px-3 py-3 text-[var(--muted-fg)] text-center">{t('noExpenses')}</p>
        )}
        {items.map((item, i) => (
          <label key={i} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--accent-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(i)}
              onChange={() => toggleOne(i)}
              className="accent-[var(--accent)] h-3 w-3 flex-shrink-0"
            />
            <input
              type="text"
              value={descriptions[i] ?? item.description}
              onChange={e => {
                e.stopPropagation()
                setDescriptions(prev => { const n = [...prev]; n[i] = e.target.value; return n })
              }}
              onClick={e => e.preventDefault()}
              className="flex-1 min-w-0 bg-transparent text-[var(--fg)] outline-none border-b border-transparent hover:border-[var(--border)] focus:border-[var(--accent)] transition-colors"
            />
            {item.date && (
              <span className="text-[var(--muted-fg)] flex-shrink-0 tabular-nums">
                {`${String(new Date(item.date).getUTCDate()).padStart(2, '0')}/${String(new Date(item.date).getUTCMonth() + 1).padStart(2, '0')}`}
              </span>
            )}
            {item.category && (
              <span className="text-[var(--muted-fg)] flex-shrink-0 italic truncate max-w-[60px]">{item.category}</span>
            )}
            <span className="flex-shrink-0 font-medium tabular-nums text-[var(--fg)]">{formatAmount(item)}</span>
          </label>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-[var(--border)] flex items-center justify-between gap-2">
        <div>
          {error && <span className="text-rose-400">{error}</span>}
          {!error && selected.size === 0 && <span className="text-[var(--muted-fg)]">{t('importNoneSelected')}</span>}
        </div>
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0 || phase === 'importing'}
          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
        >
          {phase === 'importing' ? t('importImporting') : t('importConfirm', { count: selected.size })}
        </button>
      </div>
    </div>
  )
}
