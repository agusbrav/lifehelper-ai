'use server'
import { cookies } from 'next/headers'
import { getSession, db } from '@lifehelper/core'
import { addExpense, getOrCreateMonth } from '@lifehelper/budget'
import { revalidatePath } from 'next/cache'
import type { ParsedTransaction } from './parse-statement-action'

async function getAuthedSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function bulkImportStatementAction(
  transactions: ParsedTransaction[],
  cardName: string,
  year: number,
  month: number,
): Promise<{ imported: number }> {
  const session = await getAuthedSession()
  const userId = session.user.id

  const budgetMonth = await getOrCreateMonth(userId, year, month)
  if (!budgetMonth) throw new Error('Could not get or create month')

  const card = await db.budgetItem.findFirst({
    where: {
      userId,
      monthId: budgetMonth.id,
      isCard: true,
      name: { equals: cardName, mode: 'insensitive' },
    },
    select: { id: true, currency: true },
  })
  if (!card) throw new Error(`Card "${cardName}" not found in month ${year}-${month}`)

  const validTransactions = transactions.filter(tx => {
    const amount = tx.currency === 'ARS' ? tx.amountARS : tx.amountUSD
    return amount != null && amount > 0
  })

  let imported = 0
  for (const tx of validTransactions) {
    await addExpense({
      userId,
      monthId: budgetMonth.id,
      parentId: card.id,
      name: tx.description,
      amount: tx.currency === 'ARS'
        ? Math.round((tx.amountARS ?? 0) * 100)
        : Math.round((tx.amountUSD ?? 0) * 100),
      currency: tx.currency,
      itemType: 'one_time',
    })
    imported++
  }

  revalidatePath('/m/budget')
  return { imported }
}
