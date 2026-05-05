import Link from 'next/link'

type PocketCardProps = {
  id: string
  name: string
}

export function PocketCard({ id, name }: PocketCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
        </div>
        <Link
          href={`/m/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          Open
        </Link>
      </div>
      <p className="text-xs text-zinc-400">No summary yet</p>
    </div>
  )
}
