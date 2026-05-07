'use client'
import { useRef, useState, useTransition, useId } from 'react'
import { useTranslations } from 'next-intl'
import { addExpenseAction, addInstallmentAction } from '@/app/(app)/m/budget/actions'

type Props = {
  monthId: string
  keywordMap: Record<string, string>
  categories: string[]
  cards: { id: string; name: string }[]
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

export function AddExpenseRow({ monthId, keywordMap, categories, cards }: Props) {
  const t = useTranslations('budget')
  const [mode, setMode] = useState<'idle' | 'expense' | 'installment'>('idle')
  const [itemType, setItemType] = useState<'one_time' | 'recurring' | 'subscription'>('one_time')
  const [category, setCategory] = useState('')
  const [cardId, setCardId] = useState('')
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
    fd.set('itemType', itemType)
    fd.set('category', category)
    startTransition(async () => {
      if (mode === 'expense') await addExpenseAction(fd)
      else await addInstallmentAction(fd)
      formRef.current?.reset()
      setMode('idle')
      setItemType('one_time')
      setCategory('')
      setCardId('')
      categoryRef.current = ''
      wasAutoFilled.current = false
    })
  }

  function handleCancel() {
    setMode('idle')
    setItemType('one_time')
    setCategory('')
    setCardId('')
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
              onClick={() => { setMode('installment'); setCardId(cards[0]?.id ?? '') }}
              className="text-sm text-[var(--muted-fg)] hover:text-[var(--accent)] transition-colors"
            >
              + {t('addInstallment')}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const inputCls = 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] min-w-0'

  return (
    <tr className="border-t border-[var(--border)] bg-[var(--muted)]">
      <td colSpan={5} className="py-3 px-4">
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
          <input
            name="name"
            required
            placeholder={t('name')}
            onChange={handleNameChange}
            className={`${inputCls} flex-[2_1_8rem]`}
          />
          <input
            name="category"
            placeholder={t('category')}
            list={datalistId}
            value={category}
            onChange={handleCategoryChange}
            className={`${inputCls} flex-[1_1_6rem] capitalize`}
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
                className={`${inputCls} w-24 flex-shrink-0`}
              />
              <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-xs flex-shrink-0">
                {(['one_time', 'recurring', 'subscription'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setItemType(type)}
                    className={`px-2.5 py-1.5 font-medium transition-colors border-l border-[var(--border)] first:border-l-0 ${
                      itemType === type
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'text-[var(--muted-fg)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    {t(`${type}Badge` as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === 'installment' && (
            <>
              <select
                name="parentId"
                required
                value={cardId}
                onChange={e => setCardId(e.target.value)}
                className={`${inputCls} flex-[1_1_8rem]`}
              >
                {cards.length === 0 ? (
                  <option value="" disabled>{t('noCards')}</option>
                ) : (
                  cards.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                )}
              </select>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder={t('perMonth')}
                className={`${inputCls} w-24 flex-shrink-0`}
              />
              <input
                name="totalPayments"
                type="number"
                min="2"
                required
                placeholder={t('paymentsCount')}
                className={`${inputCls} w-24 flex-shrink-0`}
              />
            </>
          )}

          <button
            type="submit"
            className="bg-[var(--accent)] text-[var(--accent-fg)] rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
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
