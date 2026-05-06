'use client'
import { useRef, useState, useTransition, useId } from 'react'
import { useTranslations } from 'next-intl'
import { addExpenseAction, addInstallmentAction } from '@/app/(app)/m/budget/actions'

type Props = {
  monthId: string
  keywordMap: Record<string, string>
  categories: string[]
}

function autoMatchCategory(name: string, keywordMap: Record<string, string>): string | null {
  const lower = name.toLowerCase().trim()
  if (!lower) return null
  if (lower in keywordMap) return keywordMap[lower]!
  const keys = Object.keys(keywordMap).sort((a, b) => b.length - a.length)
  for (const kw of keys) {
    const pattern = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (pattern.test(lower)) return keywordMap[kw]!
  }
  return null
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export function AddExpenseRow({ monthId, keywordMap, categories }: Props) {
  const t = useTranslations('budget')
  const [mode, setMode] = useState<'idle' | 'expense' | 'installment'>('idle')
  const [recurring, setRecurring] = useState(false)
  const [category, setCategory] = useState('')
  const categoryRef = useRef('')
  const wasAutoFilled = useRef(false)
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const datalistId = useId()

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (wasAutoFilled.current || categoryRef.current === '') {
      const matched = autoMatchCategory(value, keywordMap)
      if (matched !== null) {
        const cap = capitalize(matched)
        setCategory(cap)
        categoryRef.current = cap
        wasAutoFilled.current = true
      } else if (wasAutoFilled.current) {
        setCategory('')
        categoryRef.current = ''
        wasAutoFilled.current = false
      }
    }
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCategory(e.target.value)
    categoryRef.current = e.target.value
    wasAutoFilled.current = false
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('monthId', monthId)
    fd.set('recurring', recurring ? 'true' : 'false')
    fd.set('category', category)
    startTransition(async () => {
      if (mode === 'expense') await addExpenseAction(fd)
      else await addInstallmentAction(fd)
      formRef.current?.reset()
      setMode('idle')
      setRecurring(false)
      setCategory('')
      categoryRef.current = ''
      wasAutoFilled.current = false
    })
  }

  function handleCancel() {
    setMode('idle')
    setRecurring(false)
    setCategory('')
    categoryRef.current = ''
    wasAutoFilled.current = false
  }

  if (mode === 'idle') {
    return (
      <tr className="border-t border-[var(--border)]">
        <td colSpan={5} className="py-2 pl-5">
          <div className="flex gap-4">
            <button
              onClick={() => setMode('expense')}
              className="text-sm text-[var(--muted-fg)] hover:text-[var(--accent)] transition-colors"
            >
              + {t('addExpense')}
            </button>
            <button
              onClick={() => setMode('installment')}
              className="text-sm text-[var(--muted-fg)] hover:text-[var(--accent)] transition-colors"
            >
              + {t('addInstallment')}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-[var(--border)] bg-[var(--muted)]">
      <td colSpan={5} className="py-3 px-5">
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
          <input
            name="name"
            required
            placeholder={t('name')}
            onChange={handleNameChange}
            className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] w-40"
          />
          <input
            name="category"
            placeholder={t('category')}
            list={datalistId}
            value={category}
            onChange={handleCategoryChange}
            className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] w-36 capitalize"
          />
          <datalist id={datalistId}>
            {categories.map(cat => (
              <option key={cat} value={capitalize(cat)} />
            ))}
          </datalist>

          {mode === 'expense' && (
            <>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder={t('amount')}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] w-28"
              />
              <label className="flex items-center gap-1.5 text-sm text-[var(--muted-fg)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={e => setRecurring(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                {t('recurring')}
              </label>
            </>
          )}

          {mode === 'installment' && (
            <>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder={t('perMonth')}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] w-28"
              />
              <input
                name="totalPayments"
                type="number"
                min="2"
                required
                placeholder={t('paymentsCount')}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] w-28"
              />
            </>
          )}

          <button
            type="submit"
            className="bg-[var(--accent)] text-[var(--accent-fg)] rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t('add')}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors"
          >
            {t('cancel')}
          </button>
        </form>
      </td>
    </tr>
  )
}
