'use client'
import { useState, useRef, useTransition, useId } from 'react'
import { useTranslations } from 'next-intl'
import { addExpenseAction, addInstallmentAction } from '@/app/(app)/m/budget/actions'

type ItemType = 'one_time' | 'recurring' | 'subscription' | 'installment'

const BASE_TYPES: ItemType[] = ['one_time', 'recurring', 'subscription']

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function matchCategory(name: string, keywordMap: Record<string, string>): string | null {
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

type Props = {
  monthId: string
  keywordMap: Record<string, string>
  categories: string[]
  parentId?: string
  defaultCurrency?: 'ARS' | 'USD'
  withInstallment?: boolean
  theme?: 'default' | 'purple'
  namePlaceholder?: string
  nameAutoComplete?: string
  onDone: () => void
}

export function ExpenseForm({
  monthId,
  keywordMap,
  categories,
  parentId,
  defaultCurrency = 'ARS',
  withInstallment = false,
  theme = 'default',
  namePlaceholder,
  nameAutoComplete,
  onDone,
}: Props) {
  const t = useTranslations('budget')
  const types = withInstallment ? [...BASE_TYPES, 'installment' as ItemType] : BASE_TYPES
  const [itemType, setItemType] = useState<ItemType>('one_time')
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(defaultCurrency)
  const [category, setCategory] = useState('')
  const categoryRef = useRef('')
  const wasAutoFilled = useRef(false)
  const [totalPayments, setTotalPayments] = useState('')
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const datalistId = useId()

  const isPurple = theme === 'purple'
  const inputCls = `rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 ${
    isPurple ? 'focus:ring-purple-400' : 'focus:ring-[var(--accent)]'
  } min-w-0`

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (wasAutoFilled.current || categoryRef.current === '') {
      const matched = matchCategory(value, keywordMap)
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

  function reset() {
    formRef.current?.reset()
    setItemType('one_time')
    setCurrency(defaultCurrency)
    setCategory('')
    categoryRef.current = ''
    wasAutoFilled.current = false
    setTotalPayments('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('monthId', monthId)
    if (parentId) fd.set('parentId', parentId)
    fd.set('currency', currency)
    fd.set('category', category)
    startTransition(async () => {
      if (itemType === 'installment') {
        fd.set('totalPayments', totalPayments)
        await addInstallmentAction(fd)
      } else {
        fd.set('itemType', itemType)
        await addExpenseAction(fd)
      }
      reset()
      onDone()
    })
  }

  function handleCancel() {
    reset()
    onDone()
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={e => { if (e.key === 'Escape') handleCancel() }}
      className="flex flex-wrap gap-2 items-center"
    >
      <input
        name="name"
        required
        placeholder={namePlaceholder ?? t('name')}
        autoFocus
        autoComplete={nameAutoComplete}
        onChange={handleNameChange}
        className={`${inputCls} flex-[2_1_8rem]`}
      />
      <input
        name="category"
        list={datalistId}
        placeholder={t('category')}
        value={category}
        onChange={handleCategoryChange}
        className={`${inputCls} flex-[1_1_6rem] capitalize`}
      />
      <datalist id={datalistId}>
        {categories.map(cat => (
          <option key={cat} value={capitalize(cat)} />
        ))}
      </datalist>
      <input
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        placeholder={itemType === 'installment' ? t('perMonth') : t('amount')}
        className={`${inputCls} w-24 flex-shrink-0`}
      />
      {itemType === 'installment' && (
        <input
          type="number"
          min="2"
          required
          value={totalPayments}
          onChange={e => setTotalPayments(e.target.value)}
          placeholder={t('paymentsCount')}
          className={`${inputCls} w-20 flex-shrink-0`}
        />
      )}
      <div className={`inline-flex rounded-lg border overflow-hidden text-xs flex-shrink-0 ${
        isPurple ? 'border-purple-500/40' : 'border-[var(--border)]'
      }`}>
        {types.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setItemType(type)}
            className={`px-2.5 py-1.5 font-medium transition-colors border-l first:border-l-0 ${
              isPurple ? 'border-purple-500/20' : 'border-[var(--border)]'
            } ${
              itemType === type
                ? isPurple ? 'bg-purple-500 text-white' : 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'
            }`}
          >
            {t(`${type}Badge` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>
      <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-xs flex-shrink-0">
        {(['ARS', 'USD'] as const).map(cur => (
          <button
            key={cur}
            type="button"
            onClick={() => setCurrency(cur)}
            className={`px-2.5 py-1.5 font-medium transition-colors border-l border-[var(--border)] first:border-l-0 ${
              currency === cur ? 'bg-blue-500/20 text-blue-300' : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'
            }`}
          >
            {t(cur === 'ARS' ? 'currencyARS' : 'currencyUSD')}
          </button>
        ))}
      </div>
      <button
        type="submit"
        className={`rounded-lg px-3 py-1.5 text-sm font-medium flex-shrink-0 ${
          isPurple
            ? 'bg-purple-500 text-white hover:bg-purple-600 transition-colors'
            : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 transition-opacity'
        }`}
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
  )
}
