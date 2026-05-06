'use client'
import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateLocaleAction } from './actions'

export function LanguageSelector({ currentLocale }: { currentLocale: 'en' | 'es' }) {
  const t = useTranslations('settings')
  const [, startTransition] = useTransition()

  function handleSelect(locale: 'en' | 'es') {
    startTransition(() => updateLocaleAction(locale))
  }

  return (
    <div className="flex gap-2">
      {(['en', 'es'] as const).map(locale => (
        <button
          key={locale}
          onClick={() => handleSelect(locale)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentLocale === locale
              ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
              : 'border border-[var(--border)] text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--accent-muted)]'
          }`}
        >
          {locale === 'en' ? t('english') : t('spanish')}
        </button>
      ))}
    </div>
  )
}
