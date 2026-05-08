import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@lifehelper/core'
import { getTranslations } from 'next-intl/server'
import { LanguageSelector } from './language-selector'
import { NameInput } from './name-input'

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) redirect('/login')

  const t = await getTranslations('settings')

  return (
    <div className="p-6 max-w-md space-y-4">
      <h1 className="text-lg font-semibold text-[var(--fg)] mb-6">{t('title')}</h1>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
        <h2 className="text-sm font-medium text-[var(--fg)] mb-1">{t('yourName')}</h2>
        <p className="text-xs text-[var(--muted-fg)] mb-3">{t('yourNameHint')}</p>
        <NameInput currentName={session.user.name ?? null} />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
        <h2 className="text-sm font-medium text-[var(--fg)] mb-3">{t('language')}</h2>
        <LanguageSelector currentLocale={session.user.locale as 'en' | 'es'} />
      </div>
    </div>
  )
}
