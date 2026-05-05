import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession, db } from '@lifehelper/core'
import { PocketCard } from '@/components/pocket-card'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) redirect('/login')

  const userModules = await db.userModule.findMany({
    where: { userId: session.user.id },
    include: { module: true },
    orderBy: { enabledAt: 'desc' },
  })

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-6 text-[var(--fg)]">Your Pockets</h1>

      {userModules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-10 text-center">
          <p className="text-sm font-medium text-[var(--fg)]">No pockets yet</p>
          <p className="text-xs text-[var(--muted-fg)] mt-1">
            Try typing &quot;add an expenses pocket&quot; in the chat below.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {userModules.map(um => (
            <PocketCard key={um.moduleId} id={um.moduleId} name={um.module.name} />
          ))}
        </div>
      )}
    </div>
  )
}
