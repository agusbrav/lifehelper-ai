'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { matchItemType } from '@lifehelper/budget/client'
import { bulkImportStatementAction } from '@/app/(app)/m/budget/config/bulk-import-action'
import type { ParsedTransaction } from '@/app/(app)/m/budget/config/parse-statement-action'

const TYPE_CYCLE = ['one_time', 'subscription', 'recurring'] as const
type TxType = typeof TYPE_CYCLE[number]

function formatAmount(tx: ParsedTransaction): string {
  if (tx.currency === 'USD') return `USD ${tx.amountUSD?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  return `$ ${tx.amountARS?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

type Props = {
  transactions: ParsedTransaction[]
  dueDate?: string | null
  cards: string[]
  typeMap: Record<string, string>
  year: number
  month: number
  hint?: string
  onDone: (cardName: string, imported: number) => void
  onCancel: () => void
}

export function ChatImportPanel({ transactions, dueDate, cards, typeMap, year, month, hint, onDone, onCancel }: Props) {
  const t = useTranslations('budget')

  const initialCard = hint
    ? (cards.find(c => hint.toLowerCase().includes(c.toLowerCase())) ?? cards[0] ?? '')
    : (cards[0] ?? '')

  const [selectedCard, setSelectedCard] = useState(initialCard)
  const [selected, setSelected] = useState<Set<number>>(new Set(transactions.map((_, i) => i)))
  const [phase, setPhase] = useState<'preview' | 'importing'>('preview')
  const [error, setError] = useState<string | null>(null)

  const [typeOverrideState, setTypeOverrideState] = useState<Map<number, string>>(() => {
    const m = new Map<number, string>()
    transactions.forEach((tx, i) => {
      const detected = matchItemType(tx.description, typeMap)
      if (detected) m.set(i, detected)
    })
    return m
  })

  const [totalPayments, setTotalPayments] = useState<Map<number, number>>(() => {
    const m = new Map<number, number>()
    transactions.forEach((tx, i) => {
      if (tx.installmentCurrent != null && tx.installmentTotal != null) {
        m.set(i, tx.installmentTotal)
      }
    })
    return m
  })

  const TYPE_STYLE: Record<TxType, { label: string; className: string }> = {
    one_time:     { label: t('oneTimeBadge'),      className: 'bg-cyan-500/15 text-cyan-400' },
    subscription: { label: t('subscriptionBadge'), className: 'bg-pink-500/15 text-pink-400' },
    recurring:    { label: t('recurringBadge'),    className: 'bg-blue-500/15 text-blue-400' },
  }

  function cycleType(i: number, e: React.MouseEvent) {
    e.preventDefault()
    setTypeOverrideState(prev => {
      const current = (prev.get(i) ?? 'one_time') as TxType
      const next = TYPE_CYCLE[(TYPE_CYCLE.indexOf(current) + 1) % TYPE_CYCLE.length]!
      return new Map(prev).set(i, next)
    })
  }

  function toggleAll() {
    if (selected.size === transactions.length) setSelected(new Set())
    else setSelected(new Set(transactions.map((_, i) => i)))
  }

  function toggleOne(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function handleImport() {
    if (!selectedCard || selected.size === 0) return
    setPhase('importing')
    setError(null)
    try {
      const toImport = [...selected].flatMap(i => {
        const tx = transactions[i]
        if (!tx) return []
        const isInstallment = tx.installmentCurrent != null && tx.installmentTotal != null
        return [{
          ...tx,
          installmentTotal: isInstallment ? (totalPayments.get(i) ?? tx.installmentTotal) : tx.installmentTotal,
          itemType: isInstallment ? undefined : (typeOverrideState.get(i) ?? 'one_time'),
        }]
      })
      const { imported } = await bulkImportStatementAction(toImport, selectedCard, year, month, dueDate)
      onDone(selectedCard, imported)
    } catch {
      setError(t('importError'))
      setPhase('preview')
    }
  }

  const arsTotal = [...selected].reduce((s, i) => s + (transactions[i]?.currency === 'ARS' ? (transactions[i]?.amountARS ?? 0) : 0), 0)
  const usdTotal = [...selected].reduce((s, i) => s + (transactions[i]?.currency === 'USD' ? (transactions[i]?.amountUSD ?? 0) : 0), 0)

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden text-xs w-full">
      {/* Card selector */}
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-2">
        <span className="text-[var(--muted-fg)] flex-shrink-0">{t('selectCard')}</span>
        {cards.length === 0 ? (
          <span className="flex-1 text-rose-400">{t('noCards')}</span>
        ) : (
          <select
            value={selectedCard}
            onChange={e => setSelectedCard(e.target.value)}
            className="flex-1 bg-transparent text-[var(--fg)] outline-none cursor-pointer"
          >
            {cards.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button onClick={onCancel} className="text-[var(--muted-fg)] hover:text-rose-400 transition-colors flex-shrink-0 ml-1">✕</button>
      </div>

      {/* List header */}
      <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-[var(--muted-fg)]">{t('importPreviewTitle')} ({transactions.length})</span>
        <button onClick={toggleAll} className="text-[var(--accent)] hover:opacity-80 transition-opacity">
          {t('importSelectAll')}
        </button>
      </div>

      {/* Transaction list */}
      <div className="max-h-44 overflow-y-auto divide-y divide-[var(--border)]">
        {transactions.length === 0 && (
          <p className="px-3 py-3 text-[var(--muted-fg)] text-center">{t('noExpenses')}</p>
        )}
        {transactions.map((tx, i) => (
          <label key={i} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--accent-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(i)}
              onChange={() => toggleOne(i)}
              className="accent-[var(--accent)] h-3 w-3 flex-shrink-0"
            />
            <span className="flex-1 min-w-0 truncate text-[var(--fg)]">{tx.description}</span>
            {tx.installmentCurrent != null && tx.installmentTotal != null ? (
              <span className="flex items-center gap-1 flex-shrink-0" onClick={e => e.preventDefault()}>
                <span className="text-[var(--muted-fg)] tabular-nums">{tx.installmentCurrent}/</span>
                <input
                  type="number"
                  min={tx.installmentCurrent}
                  value={totalPayments.get(i) ?? tx.installmentTotal}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v) && v >= (tx.installmentCurrent ?? 1)) setTotalPayments(prev => new Map(prev).set(i, v))
                  }}
                  className="w-10 text-center rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] px-1 tabular-nums"
                />
              </span>
            ) : (
              <button
                onClick={e => cycleType(i, e)}
                className={`px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 transition-colors ${TYPE_STYLE[(typeOverrideState.get(i) ?? 'one_time') as TxType].className}`}
              >
                {TYPE_STYLE[(typeOverrideState.get(i) ?? 'one_time') as TxType].label}
              </button>
            )}
            <span className="flex-shrink-0 font-medium tabular-nums text-[var(--fg)]">{formatAmount(tx)}</span>
          </label>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[var(--border)] flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {error && <span className="text-rose-400">{error}</span>}
          {!error && selected.size === 0 && (
            <span className="text-[var(--muted-fg)]">{t('importNoneSelected')}</span>
          )}
          {!error && selected.size > 0 && (
            <>
              {arsTotal > 0 && <span className="text-[var(--muted-fg)] tabular-nums">$ {arsTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>}
              {usdTotal > 0 && <span className="text-[var(--muted-fg)] tabular-nums">USD {usdTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>}
            </>
          )}
        </div>
        <button
          onClick={handleImport}
          disabled={selected.size === 0 || !selectedCard || phase === 'importing'}
          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
        >
          {phase === 'importing' ? t('importImporting') : t('importConfirm', { count: selected.size })}
        </button>
      </div>
    </div>
  )
}
