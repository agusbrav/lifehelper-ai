'use server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getSession } from '@lifehelper/core'
import { addExpense, addInstallment, setAmount, setAmountNextMonth, togglePaid, deleteItem, resetMonth } from '@lifehelper/budget'

async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session.user.id
}

export async function addExpenseAction(formData: FormData) {
  const userId = await getUserId()
  const monthId = formData.get('monthId') as string
  const name = formData.get('name') as string
  const category = (formData.get('category') as string) || undefined
  const itemType = (formData.get('itemType') as string) || 'one_time'
  const recurring = itemType === 'recurring' || itemType === 'subscription'
  const parentId = (formData.get('parentId') as string) || undefined
  const rawAmount = formData.get('amount') as string
  const amount = rawAmount ? Math.round(parseFloat(rawAmount) * 100) : undefined
  await addExpense({ userId, monthId, name, category, recurring, itemType, parentId, amount })
  revalidatePath('/m/budget')
}

export async function addInstallmentAction(formData: FormData) {
  const userId = await getUserId()
  const monthId = formData.get('monthId') as string
  const name = formData.get('name') as string
  const amountCents = Math.round(parseFloat(formData.get('amount') as string) * 100)
  const totalPayments = parseInt(formData.get('totalPayments') as string)
  const category = (formData.get('category') as string) || undefined
  const parentId = (formData.get('parentId') as string) || undefined
  await addInstallment({ userId, monthId, name, amountCents, totalPayments, category, parentId })
  revalidatePath('/m/budget')
}

export async function setAmountAction(itemId: string, amountCents: number) {
  const userId = await getUserId()
  await setAmount({ userId, itemId, amountCents })
  revalidatePath('/m/budget')
}

export async function togglePaidAction(itemId: string) {
  const userId = await getUserId()
  await togglePaid({ userId, itemId })
  revalidatePath('/m/budget')
}

export async function deleteItemAction(itemId: string) {
  const userId = await getUserId()
  await deleteItem({ userId, itemId })
  revalidatePath('/m/budget')
}

export async function resetMonthAction(year: number, month: number) {
  const userId = await getUserId()
  await resetMonth(userId, year, month)
  revalidatePath('/m/budget')
}

export async function setAmountNextMonthAction(itemId: string, amountCents: number) {
  const userId = await getUserId()
  await setAmountNextMonth({ userId, itemId, amountCents })
  revalidatePath('/m/budget')
}
