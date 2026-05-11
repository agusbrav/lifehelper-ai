// apps/web/components/budget/statement-import-dialog.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { parseStatementAction, type ParsedTransaction } from '@/app/(app)/m/budget/config/parse-statement-action'
import { bulkImportStatementAction } from '@/app/(app)/m/budget/config/bulk-import-action'
import { matchItemType } from '@lifehelper/budget'

type Phase = 'idle' | 'parsing' | 'preview' | 'importing' | 'done'

type Props = {
  cardName: string
  year: number
  month: number
  typeMap?: Record<string, string>
  onClose: () => void
}

function formatAmount(tx: ParsedTransaction): string {
  if (tx.currency === 'USD') return `USD ${tx.amountUSD?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  return `$ ${tx.amountARS?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

export function StatementImportDialog({ cardName, year, month, typeMap = {}, onClose }: Props) {
  const t = useTranslations('budget')
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    const input = fileRef.current
    if (!input) return
    input.click()
    function handleCancel() { onClose() }
    input.addEventListener('cancel', handleCancel)
    return () => input.removeEventListener('cancel', handleCancel)
  }, [onClose])
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [remainingPayments, setRemainingPayments] = useState<Map<number, number>>(new Map())
  const [typeOverrides, setTypeOverrides] = useState<Map<number, string>>(new Map())
  const [error, setError] = useState<string | null>(null)

  const TYPE_CYCLE = ['one_time', 'subscription', 'recurring'] as const
  type TxType = typeof TYPE_CYCLE[number]

  const TYPE_STYLE: Record<TxType, { label: string; className: string }> = {
    one_time:     { label: t('oneTimeBadge'),     className: 'bg-cyan-500/15 text-cyan-400' },
    subscription: { label: t('subscriptionBadge'), className: 'bg-pink-500/15 text-pink-400' },
    recurring:    { label: t('recurringBadge'),    className: 'bg-blue-500/15 text-blue-400' },
  }

  function cycleType(i: number, e: React.MouseEvent) {
    e.preventDefault()
    setTypeOverrides(prev => {
      const current = (prev.get(i) ?? 'one_time') as TxType
      const next = TYPE_CYCLE[(TYPE_CYCLE.indexOf(current) + 1) % TYPE_CYCLE.length]!
      return new Map(prev).set(i, next)
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setPhase('parsing')
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const { transactions: parsed, dueDate: parsedDueDate } = await parseStatementAction(fd)
      setTransactions(parsed)
      setDueDate(parsedDueDate)
      setSelected(new Set(parsed.map((_, i) => i)))
      const initRemaining = new Map<number, number>()
      parsed.forEach((tx, i) => {
        if (tx.installmentCurrent != null && tx.installmentTotal != null) {
          initRemaining.set(i, tx.installmentTotal - tx.installmentCurrent + 1)
        }
      })
      setRemainingPayments(initRemaining)
      const initTypes = new Map<number, string>()
      parsed.forEach((tx, i) => {
        const detected = matchItemType(tx.description, typeMap)
        if (detected) initTypes.set(i, detected)
      })
      setTypeOverrides(initTypes)
      setPhase('preview')
    } catch {
      setError(t('importError'))
      setPhase('idle')
    }
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
    if (selected.size === 0) return
    setPhase('importing')
    try {
      const toImport = [...selected].flatMap(i => {
        const tx = transactions[i]
        if (!tx) return []
        const isInstallment = tx.installmentCurrent != null && tx.installmentTotal != null
        return [{ ...tx, remainingPayments: remainingPayments.get(i), itemType: isInstallment ? undefined : (typeOverrides.get(i) ?? 'one_time') }]
      })
      await bulkImportStatementAction(toImport, cardName, year, month, dueDate)
      localStorage.setItem(`budget:import:${cardName}:${year}-${month}`, 'true')
      setPhase('done')
    } catch (err) {
      console.error('[bulkImport]', err)
      setError(t('importError'))
      setPhase('preview')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl flex flex-col max-h-[85dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--fg)] text-sm">{t('importStatementTitle', { card: cardName })}</h3>
          <button onClick={onClose} className="text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors text-lg leading-none">&#x2715;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {phase === 'parsing' && (
            <div className="py-10 flex flex-col items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
              <p className="text-sm text-[var(--muted-fg)]">{t('importParsing')}</p>
            </div>
          )}

          {(phase === 'preview' || phase === 'importing') && (
            <div className="space-y-3">
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--fg)]">{t('importPreviewTitle')}</p>
                <button onClick={toggleAll} className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity">
                  {t('importSelectAll')}
                </button>
              </div>

              <div className="rounded-xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
                {transactions.map((tx, i) => (
                  <label key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--muted)]/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleOne(i)}
                      className="accent-[var(--accent)] h-3.5 w-3.5 flex-shrink-0"
                    />
                    <span className="flex-1 text-sm text-[var(--fg)] min-w-0 truncate">{tx.description}</span>
                    {tx.installmentCurrent != null && tx.installmentTotal != null ? (
                      <span className="flex items-center gap-1 flex-shrink-0" onClick={e => e.preventDefault()}>
                        <span className="text-xs text-[var(--muted-fg)]">{tx.installmentCurrent}/{tx.installmentTotal}</span>
                        <input
                          type="number"
                          min={1}
                          max={tx.installmentTotal}
                          value={remainingPayments.get(i) ?? (tx.installmentTotal - tx.installmentCurrent + 1)}
                          onChange={e => {
                            const v = parseInt(e.target.value, 10)
                            if (!isNaN(v) && v >= 1) {
                              setRemainingPayments(prev => new Map(prev).set(i, v))
                            }
                          }}
                          className="w-12 text-xs text-center rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] px-1 py-0.5 tabular-nums"
                          title="Remaining payments"
                        />
                      </span>
                    ) : (
                      <button
                        onClick={e => cycleType(i, e)}
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 transition-colors ${TYPE_STYLE[(typeOverrides.get(i) ?? 'one_time') as TxType].className}`}
                      >
                        {TYPE_STYLE[(typeOverrides.get(i) ?? 'one_time') as TxType].label}
                      </button>
                    )}
                    <span className="text-sm text-[var(--fg)] flex-shrink-0 font-medium tabular-nums">
                      {formatAmount(tx)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="py-10 text-center text-sm text-[var(--fg)]">
              {t('importDone')}
            </div>
          )}
        </div>

        {/* Footer */}
        {(phase === 'preview' || phase === 'importing') && (() => {
          const arsTotal = [...selected].reduce((s, i) => s + (transactions[i]?.currency === 'ARS' ? (transactions[i]?.amountARS ?? 0) : 0), 0)
          const usdTotal = [...selected].reduce((s, i) => s + (transactions[i]?.currency === 'USD' ? (transactions[i]?.amountUSD ?? 0) : 0), 0)
          return (
          <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              {selected.size === 0
                ? <span className="text-xs text-[var(--muted-fg)]">{t('importNoneSelected')}</span>
                : <>
                    {arsTotal > 0 && <span className="text-xs text-[var(--muted-fg)] tabular-nums">$ {arsTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>}
                    {usdTotal > 0 && <span className="text-xs text-[var(--muted-fg)] tabular-nums">USD {usdTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>}
                  </>
              }
            </div>
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || phase === 'importing'}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {phase === 'importing' ? t('importImporting') : t('importConfirm', { count: selected.size })}
            </button>
          </div>
          )
        })()}

        {phase === 'done' && (
          <div className="px-5 py-4 border-t border-[var(--border)] flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t('importClose')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
