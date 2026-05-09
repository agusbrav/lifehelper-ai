// apps/web/components/budget/statement-import-dialog.tsx
'use client'
import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { parseStatementAction, type ParsedTransaction } from '@/app/(app)/m/budget/config/parse-statement-action'
import { bulkImportStatementAction } from '@/app/(app)/m/budget/config/bulk-import-action'

type Phase = 'idle' | 'parsing' | 'preview' | 'importing' | 'done'

type Props = {
  cardName: string
  year: number
  month: number
  onClose: () => void
}

function formatAmount(tx: ParsedTransaction): string {
  if (tx.currency === 'USD') return `USD ${tx.amountUSD?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  return `$ ${tx.amountARS?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

export function StatementImportDialog({ cardName, year, month, onClose }: Props) {
  const t = useTranslations('budget')
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setPhase('parsing')
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const parsed = await parseStatementAction(fd)
      setTransactions(parsed)
      setSelected(new Set(parsed.map((_, i) => i)))
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
      const toImport = [...selected].map(i => transactions[i]).filter((tx): tx is ParsedTransaction => tx !== undefined)
      await bulkImportStatementAction(toImport, cardName, year, month)
      setPhase('done')
    } catch {
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

          {phase === 'idle' && (
            <div className="flex flex-col items-center gap-4 py-6">
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {t('importStatement')}
              </button>
              <p className="text-xs text-[var(--muted-fg)]">PDF</p>
            </div>
          )}

          {phase === 'parsing' && (
            <div className="py-10 text-center text-sm text-[var(--muted-fg)]">
              {t('importParsing')}
            </div>
          )}

          {(phase === 'preview' || phase === 'importing') && (
            <div className="space-y-3">
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
                    {tx.installmentCurrent && tx.installmentTotal && (
                      <span className="text-xs text-[var(--muted-fg)] flex-shrink-0">
                        {tx.installmentCurrent}/{tx.installmentTotal}
                      </span>
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
        {(phase === 'preview' || phase === 'importing') && (
          <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--muted-fg)]">
              {selected.size === 0 ? t('importNoneSelected') : ''}
            </span>
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || phase === 'importing'}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {phase === 'importing' ? t('importImporting') : t('importConfirm', { count: selected.size })}
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="px-5 py-4 border-t border-[var(--border)] flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t('cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
