'use server'
import { cookies } from 'next/headers'
import { getSession, db } from '@lifehelper/core'
import { revalidatePath } from 'next/cache'

export async function updateLocaleAction(locale: 'en' | 'es') {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  await db.user.update({ where: { id: session.user.id }, data: { locale } })
  revalidatePath('/', 'layout')
}
