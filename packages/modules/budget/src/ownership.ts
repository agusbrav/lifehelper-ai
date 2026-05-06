import { db } from '@lifehelper/core'

export class ForbiddenError extends Error {
  constructor() { super('Forbidden') }
}

export async function assertOwnsMonth(userId: string, monthId: string) {
  const month = await db.budgetMonth.findUnique({ where: { id: monthId } })
  if (!month || month.userId !== userId) throw new ForbiddenError()
  return month
}

export async function assertOwnsItem(userId: string, itemId: string) {
  const item = await db.budgetItem.findUnique({ where: { id: itemId } })
  if (!item || item.userId !== userId) throw new ForbiddenError()
  return item
}
