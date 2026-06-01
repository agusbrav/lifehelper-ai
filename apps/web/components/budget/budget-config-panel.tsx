'use client'
import { useState, useTransition, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useBudgetContext } from './budget-context'
import { addCardAction, renameCardAction, setCardCurrencyAction } from '@/app/(app)/m/budget/settings/actions'
import { addCategoryKeywordAction, removeCategoryKeywordAction, addTypeKeywordAction, setKeywordItemTypeAction } from '@/app/(app)/m/budget/config/actions'
import { resetMonthAction, deletePastMonthsAction } from '@/app/(app)/m/budget/actions'
import { RenameCardInput } from '@/app/(app)/m/budget/settings/rename-card-input'
import { CATEGORY_SEEDS } from '@lifehelper/budget/client'
import { StatementImportDialog } from './statement-import-dialog'

type Card = { id: string; name: string; currency: string }
type KeywordRecord = { id: string; keyword: string; category: string | null; itemType: string | null }

type Props = {
  year: number
  month: number
  cards: Card[]
  userKeywords: KeywordRecord[]
}

type Tab = 'general' | 'tarjetas' | 'categorias' | 'tipos'
type TxType = 'one_time' | 'subscription' | 'recurring'

export function BudgetConfigPanel({ year, month, cards, userKeywords }: Props) {
  const t = useTranslations('budget')
  const router = useRouter()
  const { configOpen: open, setConfigOpen: setOpen } = useBudgetContext()
  const [tab, setTab] = useState<Tab>('tarjetas')
  const [, startTransition] = useTransition()
  const [resetConfirming, setResetConfirming] = useState(false)
  const [resetPending, startResetTransition] = useTransition()
  const [deletePastConfirming, setDeletePastConfirming] = useState(false)
  const [deletePastPending, startDeletePastTransition] = useTransition()
  const [importingCard, setImportingCard] = useState<string | null>(null)

  // Add card state
  const [newCardName, setNewCardName] = useState('')

  // Add keyword state
  const [newKeyword, setNewKeyword] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null)
  const addKwInputRef = useRef<HTMLInputElement>(null)

  const typeMap = Object.fromEntries(
    userKeywords.filter(r => r.itemType != null).map(r => [r.keyword, r.itemType!])
  )

  // Type rules state
  const [addingToType, setAddingToType] = useState<TxType | null>(null)
  const addTypeKwInputRef = useRef<HTMLInputElement>(null)

  const HIDDEN_CATEGORIES = new Set(['system', 'tarjetas'])

  // Derived: all known categories (seeds + user), excluding internal/managed ones
  const seedCategories = [...new Set(Object.values(CATEGORY_SEEDS))].filter(c => !HIDDEN_CATEGORIES.has(c)).sort()
  const visibleKeywords = userKeywords.filter(r => r.category != null && !HIDDEN_CATEGORIES.has(r.category))
  const userCategories = [...new Set(visibleKeywords.map(r => r.category as string))].sort()
  const allCategories = [...new Set([...seedCategories, ...userCategories])].sort()

  // Group user keywords by category
  const byCategory = visibleKeywords.reduce<Record<string, KeywordRecord[]>>((acc, r) => {
    ;(acc[r.category!] ??= []).push(r)
    return acc
  }, {})


  function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    const name = newCardName.trim()
    if (!name) return
    const fd = new FormData()
    fd.append('name', name)
    setNewCardName('')
    startTransition(() => addCardAction(fd))
  }

  function handleToggleCurrency(cardId: string, current: string) {
    const next = current === 'USD' ? 'ARS' : 'USD'
    startTransition(() => setCardCurrencyAction(cardId, next as 'ARS' | 'USD'))
  }

  function handleAddKeywordToCategory(category: string, raw: string) {
    const keywords = raw.split(',').map(k => k.trim()).filter(Boolean)
    if (!keywords.length || !category) return
    startTransition(async () => { await Promise.all(keywords.map(kw => addCategoryKeywordAction(kw, category))) })
    setAddingToCategory(null)
  }

  function handleAddNewCategoryKeyword(e: React.FormEvent) {
    e.preventDefault()
    const keywords = newKeyword.split(',').map(k => k.trim()).filter(Boolean)
    const cat = (selectedCategory || newCategory).trim()
    if (!keywords.length || !cat) return
    startTransition(async () => { await Promise.all(keywords.map(kw => addCategoryKeywordAction(kw, cat))) })
    setNewKeyword('')
    setNewCategory('')
    setSelectedCategory('')
  }

  function handleRemoveKeyword(id: string) {
    startTransition(() => removeCategoryKeywordAction(id))
  }

  function handleReset() {
    startResetTransition(async () => {
      await resetMonthAction(year, month)
      setOpen(false)
      setResetConfirming(false)
      router.push('/m/budget')
    })
  }

  function handleDeletePast() {
    startDeletePastTransition(async () => {
      await deletePastMonthsAction()
      setOpen(false)
      setDeletePastConfirming(false)
      router.push('/m/budget')
    })
  }

  const inputCls = 'rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] min-w-0'
  const tabCls = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
        : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'
    }`

  return (
    <>
      {/* Gear button - hidden on mobile (bottom nav provides the trigger there) */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex p-1.5 rounded-lg text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--border)] transition-colors"
        title={t('configTitle')}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
          <path fillRule="evenodd" d="M8 0a1 1 0 0 1 .97.757l.49 1.938a5.52 5.52 0 0 1 1.168.675l1.904-.604a1 1 0 0 1 1.146.48l1 1.732a1 1 0 0 1-.217 1.248l-1.505 1.257c.03.239.044.48.044.717s-.015.478-.044.717l1.505 1.257a1 1 0 0 1 .217 1.248l-1 1.732a1 1 0 0 1-1.146.48l-1.904-.604a5.52 5.52 0 0 1-1.168.675L8.97 15.243A1 1 0 0 1 7.03 15.243l-.49-1.938a5.52 5.52 0 0 1-1.168-.675l-1.904.604a1 1 0 0 1-1.146-.48l-1-1.732a1 1 0 0 1 .217-1.248l1.505-1.257A5.48 5.48 0 0 1 2 8c0-.237.015-.478.044-.717L.539 6.026a1 1 0 0 1-.217-1.248l1-1.732a1 1 0 0 1 1.146-.48l1.904.604A5.52 5.52 0 0 1 5.54 2.495L6.03.757A1 1 0 0 1 8 0Zm0 4a4 4 0 1 0 0 8A4 4 0 0 0 8 4Z"/>
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setOpen(false); setResetConfirming(false); setDeletePastConfirming(false) }}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl flex flex-col h-[520px] max-h-[85dvh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--fg)]">{t('configTitle')}</h2>
              <button
                onClick={() => { setOpen(false); setResetConfirming(false); setDeletePastConfirming(false) }}
                className="text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 px-5 pt-3">
              <button className={tabCls(tab === 'general')} onClick={() => { setTab('general'); setResetConfirming(false); setDeletePastConfirming(false) }}>
                {t('generalTab')}
              </button>
              <button className={tabCls(tab === 'tarjetas')} onClick={() => setTab('tarjetas')}>
                {t('settingsTitle')}
              </button>
              <button className={tabCls(tab === 'categorias')} onClick={() => setTab('categorias')}>
                {t('categoriesTitle')}
              </button>
              <button className={tabCls(tab === 'tipos')} onClick={() => setTab('tipos')}>
                {t('typesTab')}
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-5 py-4">

              {/* ── General tab ── */}
              {tab === 'general' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <p className="text-sm font-medium text-[var(--fg)] mb-1">{t('resetMonth')}</p>
                    <p className="text-xs text-[var(--muted-fg)] mb-3">{t('resetMonthConfirm')}</p>
                    {!resetConfirming ? (
                      <button
                        onClick={() => setResetConfirming(true)}
                        className="text-xs text-rose-400 hover:text-rose-300 border border-rose-400/30 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        {t('resetMonth')}
                      </button>
                    ) : (
                      <span className="flex items-center gap-2 text-xs">
                        <button
                          onClick={handleReset}
                          disabled={resetPending}
                          className="text-rose-400 hover:text-rose-300 border border-rose-400/30 rounded-lg px-3 py-1.5 font-medium transition-colors"
                        >
                          {resetPending ? '…' : t('resetMonth') + ' ✓'}
                        </button>
                        <button
                          onClick={() => setResetConfirming(false)}
                          className="text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <p className="text-sm font-medium text-[var(--fg)] mb-1">{t('deletePastMonths')}</p>
                    <p className="text-xs text-[var(--muted-fg)] mb-3">{t('deletePastMonthsConfirm')}</p>
                    {!deletePastConfirming ? (
                      <button
                        onClick={() => setDeletePastConfirming(true)}
                        className="text-xs text-rose-400 hover:text-rose-300 border border-rose-400/30 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        {t('deletePastMonths')}
                      </button>
                    ) : (
                      <span className="flex items-center gap-2 text-xs">
                        <button
                          onClick={handleDeletePast}
                          disabled={deletePastPending}
                          className="text-rose-400 hover:text-rose-300 border border-rose-400/30 rounded-lg px-3 py-1.5 font-medium transition-colors"
                        >
                          {deletePastPending ? '…' : t('deletePastMonths') + ' ✓'}
                        </button>
                        <button
                          onClick={() => setDeletePastConfirming(false)}
                          className="text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tarjetas tab ── */}
              {tab === 'tarjetas' && (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--muted-fg)]">{t('settingsCardHint')}</p>

                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    {cards.length === 0 ? (
                      <p className="py-6 text-center text-sm text-[var(--muted-fg)]">{t('noCards')}</p>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {cards.map(card => (
                            <tr key={card.id} className="border-t border-[var(--border)] first:border-t-0 group">
                              <td className="py-2.5 pl-4 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                                  <RenameCardInput cardId={card.id} initialName={card.name} />
                                </div>
                              </td>
                              <td className="py-2.5 pr-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleToggleCurrency(card.id, card.currency)}
                                    className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors flex-shrink-0 ${
                                      card.currency === 'USD'
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                        : 'bg-[var(--muted)] text-[var(--muted-fg)] border-[var(--border)] hover:text-[var(--fg)]'
                                    }`}
                                  >
                                    {card.currency === 'USD' ? 'USD' : 'ARS'}
                                  </button>
                                  <button
                                    onClick={() => setImportingCard(card.name)}
                                    className="text-xs text-[var(--muted-fg)] hover:text-[var(--accent)] transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    {t('importStatement')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <form onSubmit={handleAddCard} className="flex gap-2">
                    <input
                      value={newCardName}
                      onChange={e => setNewCardName(e.target.value)}
                      placeholder={t('cardName')}
                      required
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="submit"
                      className="bg-[var(--accent)] text-[var(--accent-fg)] rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                    >
                      {t('add')}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Categorías tab ── */}
              {tab === 'categorias' && (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--muted-fg)]">{t('categoriesHint')}</p>

                  {/* User-defined keywords grouped by category */}
                  {allCategories.map(cat => {
                    const keywords = byCategory[cat] ?? []
                    const isAdding = addingToCategory === cat
                    return (
                      <div key={cat} className="rounded-xl border border-[var(--border)] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg)]">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-fg)] capitalize">{cat}</span>
                          <button
                            onClick={() => {
                              setAddingToCategory(isAdding ? null : cat)
                              setTimeout(() => addKwInputRef.current?.focus(), 50)
                            }}
                            className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity"
                          >
                            + palabra
                          </button>
                        </div>
                        {keywords.length > 0 && (
                          <div className="px-4 py-2 flex flex-wrap gap-1.5">
                            {keywords.map(r => (
                              <span
                                key={r.id}
                                className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--border)] text-[var(--fg)]"
                              >
                                {r.keyword}
                                <button
                                  onClick={() => handleRemoveKeyword(r.id)}
                                  className="opacity-0 group-hover:opacity-100 text-[var(--muted-fg)] hover:text-rose-400 transition-all leading-none"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {isAdding && (
                          <div className="px-4 pb-3 flex gap-2">
                            <InlineKeywordInput
                              inputRef={addKwInputRef}
                              onConfirm={kw => handleAddKeywordToCategory(cat, kw)}
                              onCancel={() => setAddingToCategory(null)}
                              inputCls={inputCls}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add keyword to new or existing category */}
                  <div className="rounded-xl border border-[var(--border)] p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-fg)] mb-3">
                      {t('addKeyword')}
                    </p>
                    <form onSubmit={handleAddNewCategoryKeyword} className="space-y-2">
                      <input
                        value={newKeyword}
                        onChange={e => setNewKeyword(e.target.value)}
                        placeholder={t('keywordPlaceholder')}
                        required
                        className={`${inputCls} w-full`}
                      />
                      <div className="flex gap-2">
                        <select
                          value={selectedCategory}
                          onChange={e => { setSelectedCategory(e.target.value); setNewCategory('') }}
                          className={`${inputCls} flex-1`}
                        >
                          <option value="">{t('selectCategory')}</option>
                          {allCategories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <span className="self-center text-xs text-[var(--muted-fg)]">{t('or')}</span>
                        <input
                          value={newCategory}
                          onChange={e => { setNewCategory(e.target.value); setSelectedCategory('') }}
                          placeholder={t('newCategoryPlaceholder')}
                          className={`${inputCls} flex-1`}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!newKeyword.trim() || (!selectedCategory && !newCategory.trim())}
                        className="w-full bg-[var(--accent)] text-[var(--accent-fg)] rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                      >
                        {t('add')}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── Tipos tab ── */}
              {tab === 'tipos' && (() => {
                const TYPES: TxType[] = ['subscription', 'recurring', 'one_time']
                const TYPE_STYLE: Record<TxType, { label: string; className: string }> = {
                  one_time:     { label: t('oneTimeBadge'),      className: 'bg-cyan-500/15 text-cyan-400' },
                  subscription: { label: t('subscriptionBadge'), className: 'bg-pink-500/15 text-pink-400' },
                  recurring:    { label: t('recurringBadge'),    className: 'bg-blue-500/15 text-blue-400' },
                }
                const byType = userKeywords
                  .filter(r => r.itemType != null)
                  .reduce<Record<string, KeywordRecord[]>>((acc, r) => {
                    ;(acc[r.itemType!] ??= []).push(r)
                    return acc
                  }, {})
                return (
                  <div className="space-y-4">
                    <p className="text-sm text-[var(--muted-fg)]">{t('typesHint')}</p>
                    {TYPES.map(type => {
                      const keywords = byType[type] ?? []
                      const isAdding = addingToType === type
                      const style = TYPE_STYLE[type]
                      return (
                        <div key={type} className="rounded-xl border border-[var(--border)] overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg)]">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${style.className}`}>
                              {style.label}
                            </span>
                            <button
                              onClick={() => {
                                setAddingToType(isAdding ? null : type)
                                setTimeout(() => addTypeKwInputRef.current?.focus(), 50)
                              }}
                              className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity"
                            >
                              + palabra
                            </button>
                          </div>
                          {keywords.length > 0 && (
                            <div className="px-4 py-2 flex flex-wrap gap-1.5">
                              {keywords.map(r => (
                                <span
                                  key={r.id}
                                  className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--border)] text-[var(--fg)]"
                                >
                                  {r.keyword}
                                  <button
                                    onClick={() => startTransition(() => setKeywordItemTypeAction(r.id, null))}
                                    className="opacity-0 group-hover:opacity-100 text-[var(--muted-fg)] hover:text-rose-400 transition-all leading-none"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          {isAdding && (
                            <div className="px-4 pb-3 flex gap-2">
                              <InlineKeywordInput
                                inputRef={addTypeKwInputRef}
                                onConfirm={kw => {
                                  startTransition(() => addTypeKeywordAction(kw, type))
                                  setAddingToType(null)
                                }}
                                onCancel={() => setAddingToType(null)}
                                inputCls={inputCls}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

          </div>
        </div>
      )}

      {importingCard && (
        <StatementImportDialog
          cardName={importingCard}
          year={year}
          month={month}
          typeMap={typeMap}
          onClose={() => setImportingCard(null)}
        />
      )}

    </>
  )
}

function InlineKeywordInput({
  inputRef,
  onConfirm,
  onCancel,
  inputCls,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  onConfirm: (kw: string) => void
  onCancel: () => void
  inputCls: string
}) {
  const [value, setValue] = useState('')

  function commit() {
    const trimmed = value.trim()
    if (trimmed) onConfirm(trimmed)
    else onCancel()
  }

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') onCancel() }}
        placeholder="palabra, otra, más..."
        className={`${inputCls} flex-1`}
      />
      <button
        onClick={commit}
        className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity px-2 py-1.5 font-medium"
      >
        OK
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors px-1 py-1.5"
      >
        ✕
      </button>
    </>
  )
}
