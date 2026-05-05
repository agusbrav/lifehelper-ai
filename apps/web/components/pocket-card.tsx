import Link from 'next/link'

type PocketCardProps = {
  id: string
  name: string
}

export function PocketCard({ id, name }: PocketCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center text-xs font-bold text-[var(--accent)]">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-[var(--fg)]">{name}</span>
        </div>
        <Link
          href={`/m/${id}`}
          className="text-xs font-medium text-[var(--accent)] hover:opacity-80 transition-opacity"
        >
          Open →
        </Link>
      </div>
      <p className="text-xs text-[var(--muted-fg)]">No summary yet</p>
    </div>
  )
}
