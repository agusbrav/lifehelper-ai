'use server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getSession } from '@lifehelper/core'
import { addCard, removeCard, renameCard, setCurrency } from '@lifehelper/budget'

async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session.user.id
}

export async function addCardAction(formData: FormData) {
  const userId = await getUserId()
  const name = (formData.get('name') as string).trim()
  await addCard({ userId, name })
  revalidatePath('/m/budget/settings')
  revalidatePath('/m/budget')
}

export async function renameCardAction(cardId: string, name: string) {
  const userId = await getUserId()
  const trimmed = name.trim()
  if (!trimmed) return
  await renameCard({ userId, cardId, name: trimmed })
  revalidatePath('/m/budget/settings')
  revalidatePath('/m/budget')
}

export async function setCardCurrencyAction(cardId: string, currency: 'ARS' | 'USD'): Promise<void> {
  const userId = await getUserId()
  await setCurrency({ userId, cardId, currency })
  revalidatePath('/m/budget/settings')
  revalidatePath('/m/budget')
}

export async function removeCardAction(cardId: string) {
  const userId = await getUserId()
  await removeCard({ userId, cardId })
  revalidatePath('/m/budget/settings')
  revalidatePath('/m/budget')
}
