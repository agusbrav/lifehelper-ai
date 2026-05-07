import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@lifehelper/core'
import { getCardsForUser } from '@lifehelper/budget'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { addCardAction } from './actions'
import { DeleteCardButton } from './delete-card-button'

export default async function BudgetSettingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) redirect('/login')

  const [cards, t] = await Promise.all([
    getCardsForUser(session.user.id),
    getTranslations('budget'),
  ])

  const inputCls = 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] min-w-0'

  return (
    <div className="p-4 sm:p-6 w-full max-w-lg">
      <div className="mb-6">
        <Link href="/m/budget" className="text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors">
          ← {t('backToBudget')}
        </Link>
      </div>

      <h1 className="text-lg font-semibold text-[var(--fg)] mb-1">{t('settingsTitle')}</h1>
      <p className="text-sm text-[var(--muted-fg)] mb-6">{t('settingsCardHint')}</p>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden mb-6">
        {cards.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-fg)]">{t('noCards')}</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <tbody>
              {cards.map(card => (
                <tr key={card.id} className="border-t border-[var(--border)] first:border-t-0 group">
                  <td className="py-3 pl-4 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                      <span className="font-medium text-[var(--fg)]">{card.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[var(--muted-fg)] capitalize text-sm">
                    {card.category ?? ''}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <DeleteCardButton
                      cardId={card.id}
                      cardName={card.name}
                      label={t('delete')}
                      confirm={t('removeCardConfirm', { name: card.name })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="text-sm font-medium text-[var(--muted-fg)] uppercase tracking-wide mb-3">{t('addCard')}</h2>
      <form action={addCardAction} className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          placeholder={t('cardName')}
          className={`${inputCls} flex-[2_1_10rem]`}
        />
        <input
          name="category"
          placeholder={t('category')}
          className={`${inputCls} flex-[1_1_7rem]`}
        />
        <button
          type="submit"
          className="bg-[var(--accent)] text-[var(--accent-fg)] rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
        >
          {t('add')}
        </button>
      </form>
      <p className="mt-3 text-xs text-[var(--muted-fg)]">{t('settingsRemoveHint')}</p>
    </div>
  )
}
