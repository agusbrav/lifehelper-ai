'use server'
import { cookies } from 'next/headers'
import { getSession, db } from '@lifehelper/core'
import { addExpense, addInstallment, getOrCreateMonth, getCategoryKeywords, fetchCategoryHistory, buildKeywordMap, buildTypeMap, matchCategory, matchItemType, setDueDate } from '@lifehelper/budget'
import { revalidatePath } from 'next/cache'
import type { ParsedTransaction } from './parse-statement-action'

async function getAuthedSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session
}

type TransactionWithMeta = ParsedTransaction & { remainingPayments?: number; itemType?: string }

export async function bulkImportStatementAction(
  transactions: TransactionWithMeta[],
  cardName: string,
  year: number,
  month: number,
  dueDate?: string | null,
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

  await db.budgetItem.deleteMany({
    where: { userId, monthId: budgetMonth.id, parentId: card.id },
  })

  const [historyMap, userKeywordRecords] = await Promise.all([
    fetchCategoryHistory(userId),
    getCategoryKeywords(userId),
  ])
  const userKeywords = Object.fromEntries(
    userKeywordRecords.filter(r => r.category != null).map(r => [r.keyword, r.category as string])
  )
  const keywordMap = buildKeywordMap(historyMap, userKeywords)
  const typeMapFromKeywords = buildTypeMap(userKeywordRecords)

  const validTransactions = transactions.filter(tx => {
    const amount = tx.currency === 'ARS' ? tx.amountARS : tx.amountUSD
    return amount != null && amount > 0
  })

  let imported = 0
  for (const tx of validTransactions) {
    const amountCents = tx.currency === 'ARS'
      ? Math.round((tx.amountARS ?? 0) * 100)
      : Math.round((tx.amountUSD ?? 0) * 100)
    const category = matchCategory(tx.description, keywordMap) ?? undefined
    const expenseDate = tx.date ? new Date(tx.date) : undefined

    if (tx.remainingPayments && tx.remainingPayments > 1) {
      await addInstallment({
        userId,
        monthId: budgetMonth.id,
        parentId: card.id,
        name: tx.description,
        amountCents,
        totalPayments: tx.remainingPayments,
        currency: tx.currency,
        category,
        expenseDate,
      })
    } else {
      await addExpense({
        userId,
        monthId: budgetMonth.id,
        parentId: card.id,
        name: tx.description,
        amount: amountCents,
        currency: tx.currency,
        itemType: tx.itemType ?? matchItemType(tx.description, typeMapFromKeywords) ?? 'one_time',
        category,
        expenseDate,
      })
    }
    imported++
  }

  if (dueDate) {
    await setDueDate({ userId, itemId: card.id, dueDate: new Date(dueDate) })
  }

  revalidatePath('/m/budget')
  return { imported }
}
