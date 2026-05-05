import { notFound } from 'next/navigation'
import modules from '@lifehelper/registry'

type Props = { params: Promise<{ pocketId: string }> }

export default async function PocketPage({ params }: Props) {
  const { pocketId } = await params
  const manifest = modules.find(m => m.id === pocketId)
  if (!manifest) notFound()

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{manifest.name}</h1>
      <p className="text-sm text-zinc-500 mt-1">Pocket coming soon.</p>
    </div>
  )
}
