'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from './theme-toggle'
import { useChatContext } from './chat/chat-context'
import { useBudgetContext } from './budget/budget-context'

type Pocket = { id: string; name: string }

function initials(str: string): string {
  const words = str.trim().split(/\s+/)
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase()
  return words.slice(0, 2).map(w => (w[0] ?? '').toUpperCase()).join('')
}

function HomeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function AnalyticsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

export function Sidebar({ pockets, userName }: { pockets: Pocket[]; userName: string }) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const { mobileChatOpen, setMobileChatOpen } = useChatContext()
  const { setConfigOpen } = useBudgetContext()
  const currentPocketId = pathname.startsWith('/m/')
    ? pathname.split('/')[2]
    : undefined
  const isBudget = currentPocketId === 'budget'

  const mobileItemCls = (active: boolean) =>
    `flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors rounded-lg ${
      active
        ? 'text-[var(--accent)]'
        : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'
    }`

  return (
    <>
      {/* Desktop left sidebar */}
      <nav className="hidden md:flex flex-col items-center w-14 shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] py-3 gap-1">
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
            <SettingsIcon />
          </Link>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--sidebar-bg)] border-t border-[var(--border)] flex items-stretch px-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <Link href="/dashboard" aria-label={t('dashboard')} className={mobileItemCls(pathname === '/dashboard')}>
          <HomeIcon />
        </Link>

        {pockets.filter(p => p.id !== currentPocketId).map(p => (
          <Link
            key={p.id}
            href={`/m/${p.id}`}
            aria-label={p.name}
            className={mobileItemCls(false)}
          >
            <span className="text-base font-semibold">{initials(p.name)}</span>
          </Link>
        ))}

        {isBudget && (
          <button
            onClick={() => setMobileChatOpen(true)}
            aria-label="Chat"
            className={mobileItemCls(mobileChatOpen)}
          >
            <ChatIcon />
          </button>
        )}

        {isBudget && (
          <Link
            href="/m/budget/analytics"
            aria-label="Analytics"
            className={mobileItemCls(pathname === '/m/budget/analytics')}
          >
            <AnalyticsIcon />
          </Link>
        )}

        {isBudget && (
          <button
            onClick={() => setConfigOpen(true)}
            aria-label="Budget settings"
            className={mobileItemCls(false)}
          >
            <SlidersIcon />
          </button>
        )}

        <Link href="/settings" aria-label={t('settings')} className={mobileItemCls(pathname === '/settings')}>
          <SettingsIcon />
        </Link>
      </nav>
    </>
  )
}
