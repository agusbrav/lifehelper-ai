'use client'
import { useRef, useState, useTransition, useId } from 'react'
import { useTranslations } from 'next-intl'
import { addExpenseAction } from '@/app/(app)/m/budget/actions'

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

export function AddExpenseRow({ monthId, keywordMap, categories }: Props) {
  const t = useTranslations('budget')
  const [open, setOpen] = useState(false)
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
    fd.set('itemType', 'one_time')
    fd.set('category', category)
    startTransition(async () => {
      await addExpenseAction(fd)
      formRef.current?.reset()
      setOpen(false)
      setCategory('')
      categoryRef.current = ''
      wasAutoFilled.current = false
    })
  }

  function handleCancel() {
    setOpen(false)
    setCategory('')
    categoryRef.current = ''
    wasAutoFilled.current = false
  }

  if (!open) {
    return (
      <tr className="border-t border-[var(--border)]">
        <td colSpan={5} className="py-2 pl-5">
          <button
            onClick={() => setOpen(true)}
            className="text-sm text-[var(--muted-fg)] hover:text-[var(--accent)] transition-colors"
          >
            + {t('addExpense')}
          </button>
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
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder={t('amount')}
            className={`${inputCls} w-24 flex-shrink-0`}
          />
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
