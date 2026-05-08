// packages/modules/budget/src/tools.ts
import { db } from '@lifehelper/core'
import { addExpense, addInstallment, setAmount, getOrCreateMonth, getItemsForAnalytics, deleteItem } from './actions'
import { computeCategoryTotals, computeUsdCategoryTotals, computeInflationAlerts } from './analytics'

export type ToolContext = { year: number; month: number }

export async function executeBudgetTool(
  name: string,
  input: Record<string, unknown>,
  userId: string,
  context: ToolContext,
): Promise<string> {
  switch (name) {
    case 'add_expense':       return toolAddExpense(userId, context, input)
    case 'add_installment':   return toolAddInstallment(userId, context, input)
    case 'set_amount':        return toolSetAmount(userId, context, input)
    case 'add_month':         return toolAddMonth(userId, input)
    case 'get_summary':       return toolGetSummary(userId, context, input)
    case 'get_inflation_report': return toolGetInflationReport(userId, context, input)
    case 'remove_expense':       return toolRemoveExpense(userId, context, input)
    case 'add_card_expense':     return toolAddCardExpense(userId, context, input)
    case 'change_type':          return toolChangeType(userId, context, input)
    default: throw new Error(`Unknown budget tool: ${name}`)
  }
}

async function toolAddExpense(
  userId: string,
  context: ToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const month = await getOrCreateMonth(userId, context.year, context.month)
  if (!month) throw new Error('Could not get or create month')
  const name = input.name as string
  const rawAmount = input.amount as number
  const category = input.category as string
  const currency = (input.currency as string | undefined) ?? 'ARS'
  await addExpense({
    userId,
    monthId: month.id,
    name,
    amount: Math.round(rawAmount * 100),
    category,
    currency,
  })
  return `Added ${name} — $${rawAmount.toLocaleString()} ${currency} in ${category}`
}

async function toolAddInstallment(
  userId: string,
  context: ToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const month = await getOrCreateMonth(userId, context.year, context.month)
  if (!month) throw new Error('Could not get or create month')
  const name = input.name as string
  const rawAmount = input.amount as number
  const totalPayments = input.totalPayments as number
  const category = input.category as string
  const currency = (input.currency as string | undefined) ?? 'ARS'
  await addInstallment({
    userId,
    monthId: month.id,
    name,
    amountCents: Math.round(rawAmount * 100),
    totalPayments,
    category,
    currency,
  })
  return `Added ${name} — $${rawAmount.toLocaleString()} ${currency} x ${totalPayments} installments in ${category}`
}

async function toolSetAmount(
  userId: string,
  context: ToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const name = input.name as string
  const rawAmount = input.amount as number
  const budgetMonth = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year: context.year, month: context.month } },
    select: { id: true },
  })
  if (!budgetMonth) return `Month ${context.year}-${context.month} not found`
  const item = await db.budgetItem.findFirst({
    where: { userId, monthId: budgetMonth.id, name: { contains: name, mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  if (!item) return `Could not find an expense matching "${name}" in this month`
  await setAmount({ userId, itemId: item.id, amountCents: Math.round(rawAmount * 100) })
  return `Updated ${item.name} to $${rawAmount.toLocaleString()}`
}

async function toolAddMonth(userId: string, input: Record<string, unknown>): Promise<string> {
  const year = input.year as number
  const month = input.month as number
  await getOrCreateMonth(userId, year, month)
  return `Created ${year}-${String(month).padStart(2, '0')}`
}

async function toolGetSummary(
  userId: string,
  context: ToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const year = (input.year as number | undefined) ?? context.year
  const month = (input.month as number | undefined) ?? context.month
  const allItems = await getItemsForAnalytics(userId)
  const monthItems = allItems.filter(i => i.month.year === year && i.month.month === month)
  const arsTotals = computeCategoryTotals(monthItems).sort((a, b) => b.total - a.total)
  const usdTotals = computeUsdCategoryTotals(monthItems).sort((a, b) => b.total - a.total)
  const arsTotal = arsTotals.reduce((s, c) => s + c.total, 0)
  const usdTotal = usdTotals.reduce((s, c) => s + c.total, 0)
  const topArs = arsTotals
    .slice(0, 4)
    .map(c => `${c.category ?? 'uncategorized'}: $${(c.total / 100).toLocaleString()}`)
    .join(', ')
  const usdLine = usdTotal > 0 ? ` | USD: $${(usdTotal / 100).toFixed(2)}` : ''
  return `ARS: $${(arsTotal / 100).toLocaleString()}${usdLine} | Top: ${topArs}`
}

async function toolGetInflationReport(
  userId: string,
  context: ToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const year = (input.year as number | undefined) ?? context.year
  const month = (input.month as number | undefined) ?? context.month
  const allItems = await getItemsForAnalytics(userId)
  const currentItems = allItems.filter(i => i.month.year === year && i.month.month === month)
  let prevMonth = month - 3
  let prevYear = year
  while (prevMonth <= 0) { prevMonth += 12; prevYear-- }
  const prevItems = allItems.filter(i => i.month.year === prevYear && i.month.month === prevMonth)
  const alerts = computeInflationAlerts(currentItems, prevItems)
  if (alerts.length === 0) return 'No significant price changes vs 3 months ago'
  return alerts
    .map(a => `${a.name}: ${a.changePct > 0 ? '+' : ''}${a.changePct}% (was $${(a.previousAmount / 100).toLocaleString()}, now $${(a.currentAmount / 100).toLocaleString()})`)
    .join('; ')
}

async function toolAddCardExpense(
  userId: string,
  context: ToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const cardName = input.cardName as string
  const name = input.name as string
  const rawAmount = input.amount as number
  const category = input.category as string

  const budgetMonth = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year: context.year, month: context.month } },
    select: { id: true },
  })
  if (!budgetMonth) return `Month ${context.year}-${context.month} not found`

  const card = await db.budgetItem.findFirst({
    where: { userId, monthId: budgetMonth.id, isCard: true, name: { contains: cardName, mode: 'insensitive' } },
    select: { id: true, name: true, currency: true },
  })
  if (!card) return `Could not find a card matching "${cardName}" in this month`

  const currency = (input.currency as string | undefined) ?? card.currency
  await addExpense({
    userId,
    monthId: budgetMonth.id,
    parentId: card.id,
    name,
    amount: Math.round(rawAmount * 100),
    category,
    currency,
  })
  return `Added ${name} — $${rawAmount.toLocaleString()} ${currency} to ${card.name}`
}

async function toolChangeType(
  userId: string,
  context: ToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const name = input.name as string
  const newType = input.newType as string

  const budgetMonth = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year: context.year, month: context.month } },
    select: { id: true },
  })
  if (!budgetMonth) return `Month ${context.year}-${context.month} not found`

  const item = await db.budgetItem.findFirst({
    where: { userId, monthId: budgetMonth.id, name: { contains: name, mode: 'insensitive' } },
    select: { id: true, name: true, recurring: true },
  })
  if (!item) return `Could not find an expense matching "${name}" in this month`

  const wasRecurring = item.recurring
  const nowRecurring = newType === 'recurring' || newType === 'subscription'

  await db.budgetItem.update({
    where: { id: item.id },
    data: { itemType: newType, recurring: nowRecurring },
  })

  // If switching away from recurring, remove future occurrences
  if (wasRecurring && !nowRecurring) {
    await db.budgetItem.deleteMany({
      where: {
        userId,
        name: item.name,
        recurring: true,
        parentId: null,
        month: {
          OR: [
            { year: { gt: context.year } },
            { year: context.year, month: { gt: context.month } },
          ],
        },
      },
    })
    return `Changed ${item.name} to ${newType} and removed future occurrences`
  }

  return `Changed ${item.name} to ${newType}${nowRecurring && !wasRecurring ? ' — will carry forward to future months when accessed' : ''}`
}

async function toolRemoveExpense(
  userId: string,
  context: ToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const name = input.name as string
  const budgetMonth = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year: context.year, month: context.month } },
    select: { id: true },
  })
  if (!budgetMonth) return `Month ${context.year}-${context.month} not found`
  const item = await db.budgetItem.findFirst({
    where: { userId, monthId: budgetMonth.id, name: { contains: name, mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  if (!item) return `Could not find an expense matching "${name}" in this month`
  await deleteItem({ userId, itemId: item.id })
  return `Removed ${item.name}`
}
