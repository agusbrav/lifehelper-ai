import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'

type Pocket = { id: string; name: string }

type SidebarProps = {
  pockets: Pocket[]
  currentPocketId?: string
}

export function Sidebar({ pockets, currentPocketId }: SidebarProps) {
  return (
    <nav className="flex flex-col items-center w-14 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-[var(--sidebar-bg)] py-3 gap-1">
      <Link
        href="/dashboard"
        className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-900 dark:text-zinc-100 font-bold text-sm mb-3"
        aria-label="Dashboard"
      >
        L
      </Link>

      {pockets.map(p => (
        <Link
          key={p.id}
          href={`/m/${p.id}`}
          aria-label={p.name}
          className={`flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium transition-colors ${
            currentPocketId === p.id
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {p.name.slice(0, 2).toUpperCase()}
        </Link>
      ))}

      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeToggle />
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
