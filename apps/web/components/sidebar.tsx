'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from './theme-toggle'

type Pocket = { id: string; name: string }

function initials(str: string): string {
  const words = str.trim().split(/\s+/)
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase()
  return words.slice(0, 2).map(w => (w[0] ?? '').toUpperCase()).join('')
}

export function Sidebar({ pockets, userName }: { pockets: Pocket[]; userName: string }) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const currentPocketId = pathname.startsWith('/m/')
    ? pathname.split('/')[2]
    : undefined

  return (
    <nav className="flex flex-col items-center w-14 shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] py-3 gap-1">
      <Link
        href="/dashboard"
        className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-bold text-sm mb-3 shadow-sm"
        aria-label={t('dashboard')}
      >
        {initials(userName)}
      </Link>

      {pockets.map(p => (
        <Link
          key={p.id}
          href={`/m/${p.id}`}
          aria-label={p.name}
          className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
            currentPocketId === p.id
              ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
              : 'text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--accent-muted)]'
          }`}
        >
          {initials(p.name)}
        </Link>
      ))}

      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeToggle />
        <Link
          href="/settings"
          aria-label={t('settings')}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--accent-muted)] transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
      </div>
    </nav>
  )
}
