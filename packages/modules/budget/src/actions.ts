import { db } from '@lifehelper/core'
import { resolveContributions } from '@lifehelper/integrations'
import { assertOwnsMonth, assertOwnsItem } from './ownership'
import { computeCarryItems } from './month-logic'

const DEFAULT_SEED = [
  { name: 'Alquiler', category: 'vivienda', recurring: true },
  { name: 'Expensas', category: 'vivienda', recurring: true },
  { name: 'Cochera', category: 'vivienda', recurring: true },
  { name: 'Luz', category: 'servicios', recurring: true },
  { name: 'Internet', category: 'servicios', recurring: true },
  { name: 'Tarjeta de crédito (Visa)', category: 'tarjeta', recurring: true },
  { name: 'Tarjeta de crédito (American Express)', category: 'tarjeta', recurring: true },
] as const

export async function getOrCreateMonth(userId: string, year: number, month: number) {
  const existing = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year, month } },
    include: {
      items: {
        where: { parentId: null },
        include: { children: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (existing) return existing

  const prev = await db.budgetMonth.findFirst({
    where: {
      userId,
      items: { some: {} },
      OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      items: {
        where: { parentId: null },
        include: { children: true },
      },
    },
  })

  const newMonth = await db.budgetMonth.create({ data: { userId, year, month } })

  if (!prev) {
    // Only seed when the user has absolutely no data anywhere — navigating to an
    // old empty month should produce a genuinely empty month, not a copy of the defaults.
    const hasAnyData = await db.budgetMonth.count({ where: { userId, items: { some: {} } } })
    if (hasAnyData === 0) {
      for (const seed of DEFAULT_SEED) {
        await db.budgetItem.create({ data: { monthId: newMonth.id, userId, ...seed } })
      }
    }
  }

  if (prev) {
    const monthGap = (year * 12 + month) - (prev.year * 12 + prev.month)
    const toCarry = computeCarryItems(
      prev.items.map(i => ({
        name: i.name,
        category: i.category,
        amount: i.amount,
        recurring: i.recurring,
        installmentTotal: i.installmentTotal,
        installmentNumber: i.installmentNumber,
        installmentGroupId: i.installmentGroupId,
        children: i.children.map(c => ({
          name: c.name,
          category: c.category,
          amount: c.amount,
          recurring: c.recurring,
          installmentTotal: c.installmentTotal,
          installmentNumber: c.installmentNumber,
          installmentGroupId: c.installmentGroupId,
          children: [],
        })),
      })),
      monthGap,
    )

    for (const item of toCarry) {
      const created = await db.budgetItem.create({
        data: {
          monthId: newMonth.id,
          userId,
          name: item.name,
          category: item.category,
          amount: item.amount,
          amountCarried: item.amountCarried,
          recurring: item.recurring,
          installmentTotal: item.installmentTotal,
          installmentNumber: item.installmentNumber,
          installmentGroupId: item.installmentGroupId,
        },
      })
      for (const child of item.children) {
        await db.budgetItem.create({
          data: {
            monthId: newMonth.id,
            userId,
            parentId: created.id,
            name: child.name,
            category: child.category,
            amount: child.amount,
            amountCarried: child.amountCarried,
            recurring: child.recurring,
            installmentTotal: child.installmentTotal,
            installmentNumber: child.installmentNumber,
            installmentGroupId: child.installmentGroupId,
          },
        })
      }
    }
  }

  // Pull contributions from any registered module bridges (e.g. trips, shared-expenses).
  // Each contribution item becomes a BudgetItem with linkedPocketId pointing back to the source record.
  // Skips items already linked (idempotent on re-open).
  const contributions = await resolveContributions('budget', userId, { year, month })
  for (const contribution of contributions) {
    for (const item of contribution.items) {
      const alreadyLinked = await db.budgetItem.findFirst({
        where: { userId, monthId: newMonth.id, linkedPocketId: item.id },
      })
      if (alreadyLinked) continue
      await db.budgetItem.create({
        data: {
          monthId: newMonth.id,
          userId,
          name: item.label,
          category: item.category ?? null,
          amount: item.amount ?? null,
          recurring: false,
          linkedPocketId: item.id,
        },
      })
    }
  }

  return db.budgetMonth.findUnique({
    where: { id: newMonth.id },
    include: {
      items: {
        where: { parentId: null },
        include: { children: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

type AddExpenseInput = {
  userId: string
  monthId: string
  name: string
  category?: string
  amount?: number
  recurring?: boolean
  parentId?: string
}

export async function addExpense(input: AddExpenseInput) {
  await assertOwnsMonth(input.userId, input.monthId)
  return db.budgetItem.create({
    data: {
      monthId: input.monthId,
      userId: input.userId,
      parentId: input.parentId ?? null,
      name: input.name,
      category: input.category ?? null,
      amount: input.amount ?? null,
      recurring: input.recurring ?? false,
    },
  })
}

type AddInstallmentInput = {
  userId: string
  monthId: string
  name: string
  category?: string
  amountCents: number
  totalPayments: number
  parentId?: string
}

export async function addInstallment(input: AddInstallmentInput) {
  await assertOwnsMonth(input.userId, input.monthId)
  const { randomBytes } = await import('crypto')
  const installmentGroupId = randomBytes(12).toString('hex')
  return db.budgetItem.create({
    data: {
      monthId: input.monthId,
      userId: input.userId,
      parentId: input.parentId ?? null,
      name: input.name,
      category: input.category ?? null,
      amount: input.amountCents,
      recurring: false,
      installmentTotal: input.totalPayments,
      installmentNumber: 1,
      installmentGroupId,
    },
  })
}

export async function setAmount(input: { userId: string; itemId: string; amountCents: number }) {
  await assertOwnsItem(input.userId, input.itemId)
  return db.budgetItem.update({
    where: { id: input.itemId },
    data: { amount: input.amountCents, amountCarried: false },
  })
}

export async function togglePaid(input: { userId: string; itemId: string }) {
  const item = await assertOwnsItem(input.userId, input.itemId)
  return db.budgetItem.update({
    where: { id: input.itemId },
    data: {
      paid: !item.paid,
      paidAt: !item.paid ? new Date() : null,
    },
  })
}

export async function deleteItem(input: { userId: string; itemId: string }) {
  await assertOwnsItem(input.userId, input.itemId)
  return db.budgetItem.delete({ where: { id: input.itemId } })
}

export async function getMonthsForUser(userId: string) {
  return db.budgetMonth.findMany({
    where: { userId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select: { id: true, year: true, month: true, compacted: true },
  })
}

export async function getFirstMonth(userId: string): Promise<{ year: number; month: number } | null> {
  const row = await db.budgetMonth.findFirst({
    where: { userId, items: { some: {} } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
    select: { year: true, month: true },
  })
  return row ?? null
}

export async function resetMonth(userId: string, year: number, month: number): Promise<void> {
  const existing = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year, month } },
    select: { id: true },
  })
  if (!existing) return
  await assertOwnsMonth(userId, existing.id)
  await db.budgetItem.deleteMany({ where: { monthId: existing.id } })
  await db.budgetMonth.delete({ where: { id: existing.id } })
}

export async function getItemsForAnalytics(userId: string) {
  return db.budgetItem.findMany({
    where: { userId },
    select: {
      name: true,
      category: true,
      amount: true,
      recurring: true,
      installmentTotal: true,
      installmentNumber: true,
      installmentGroupId: true,
      parentId: true,
      month: { select: { year: true, month: true } },
    },
  })
}

export async function fetchCategoryHistory(userId: string): Promise<Record<string, string>> {
  const items = await db.budgetItem.findMany({
    where: { userId, category: { not: null } },
    select: { name: true, category: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  const map: Record<string, string> = {}
  for (const item of items) {
    const key = item.name.toLowerCase()
    if (map[key] === undefined && item.category) {
      map[key] = item.category
    }
  }
  return map
}
