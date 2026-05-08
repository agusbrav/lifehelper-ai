'use server'
import { cookies } from 'next/headers'
import { getSession, db } from '@lifehelper/core'
import { revalidatePath } from 'next/cache'

async function getAuthedSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function updateLocaleAction(locale: 'en' | 'es') {
  const session = await getAuthedSession()
  await db.user.update({ where: { id: session.user.id }, data: { locale } })
  revalidatePath('/', 'layout')
}

export async function setUserNameAction(name: string): Promise<void> {
  const session = await getAuthedSession()
  await db.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() || null },
  })
}
