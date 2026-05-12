import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession, db } from '@lifehelper/core'
import { Sidebar } from '@/components/sidebar'
import { ChatRail } from '@/components/chat-rail'
import { ChatContextProvider } from '@/components/chat/chat-context'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null

  if (!session) redirect('/login')

  const userModules = await db.userModule.findMany({
    where: { userId: session.user.id },
    include: { module: true },
  })

  const pockets = userModules.map(um => ({
    id: um.moduleId,
    name: um.module.name,
  }))

  return (
    <ChatContextProvider>
      <div className="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
        <Sidebar pockets={pockets} userName={session.user.name ?? session.user.email} />
        <div className="flex flex-col flex-1 min-w-0">
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
          <div className="hidden md:block">
            <ChatRail />
          </div>
        </div>
      </div>
      <ChatRail mobile />
    </ChatContextProvider>
  )
}
