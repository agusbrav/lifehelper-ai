import { db } from '@lifehelper/core'
import { resolveContributions } from '@lifehelper/integrations'
import { assertOwnsMonth, assertOwnsItem } from './ownership'
import { computeCarryItems } from './month-logic'
import { seedDefaultCategoryKeywords } from './category-keyword-actions'

const DEFAULT_SEED = [
  { name: 'Alquiler', category: 'vivienda', recurring: true, itemType: 'recurring' },
  { name: 'Expensas', category: 'vivienda', recurring: true, itemType: 'recurring' },
  { name: 'Cochera', category: 'vivienda', recurring: true, itemType: 'recurring' },
  { name: 'Luz', category: 'servicios', recurring: true, itemType: 'recurring' },
  { name: 'Internet', category: 'servicios', recurring: true, itemType: 'subscription' },
  { name: 'Tarjeta de crédito (Visa)', category: 'tarjeta', recurring: true, itemType: 'recurring', isCard: true },
  { name: 'Tarjeta de crédito (American Express)', category: 'tarjeta', recurring: true, itemType: 'recurring', isCard: true },
] as const

async function syncCardsToMonth(userId: string, monthId: string): Promise<void> {
  const cards = await db.card.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  for (const card of cards) {
    const exists = await db.budgetItem.findFirst({
      where: { monthId, userId, isCard: true, name: card.name },
    })
    if (exists) {
      if (exists.currency !== card.currency) {
        await db.budgetItem.update({ where: { id: exists.id }, data: { currency: card.currency } })
      }
      continue
    }
    await db.budgetItem.create({
      data: {
        monthId,
        userId,
        name: card.name,
        category: card.category,
        currency: card.currency,
        amount: null,
        recurring: true,
        itemType: 'recurring',
        isCard: true,
      },
    })
  }
}

const ITEM_ORDER = [
  { expenseDate: { sort: 'asc' as const, nulls: 'last' as const } },
  { createdAt: 'asc' as const },
  { id: 'asc' as const },
]

const MONTH_INCLUDE = {
  items: {
    where: { parentId: null },
    include: { children: { orderBy: ITEM_ORDER } },
    orderBy: ITEM_ORDER,
  },
}

export async function getOrCreateMonth(userId: string, year: number, month: number) {
  await seedDefaultCategoryKeywords(userId)

  const existing = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year, month } },
    include: MONTH_INCLUDE,
  })
  if (existing) {
    await syncCardsToMonth(userId, existing.id)
    return db.budgetMonth.findUnique({
      where: { userId_year_month: { userId, year, month } },
      include: MONTH_INCLUDE,
    })
  }

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
        currency: i.currency,
        recurring: i.recurring,
        itemType: i.itemType,
        isCard: i.isCard,
        installmentTotal: i.installmentTotal,
        installmentNumber: i.installmentNumber,
        installmentGroupId: i.installmentGroupId,
        children: i.children.map(c => ({
          name: c.name,
          category: c.category,
          amount: c.amount,
          currency: c.currency,
          recurring: c.recurring,
          itemType: c.itemType,
          isCard: c.isCard,
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
          currency: item.currency,
          amount: item.amount,
          amountCarried: item.amountCarried,
          recurring: item.recurring,
          itemType: item.itemType,
          isCard: item.isCard,
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
            currency: child.currency,
            amount: child.amount,
            amountCarried: child.amountCarried,
            recurring: child.recurring,
            itemType: child.itemType,
            isCard: child.isCard,
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

  await syncCardsToMonth(userId, newMonth.id)

  return db.budgetMonth.findUnique({
    where: { id: newMonth.id },
    include: MONTH_INCLUDE,
  })
}

type AddExpenseInput = {
  userId: string
  monthId: string
  name: string
  category?: string
  amount?: number
  currency?: string
  recurring?: boolean
  itemType?: string
  parentId?: string
  expenseDate?: Date
}

type CarryableItem = {
  name: string
  category: string | null
  amount: number | null
  currency: string
  recurring: boolean
  itemType: string
  isCard: boolean
  installmentTotal: number | null
  installmentNumber: number | null
  installmentGroupId: string | null
  parentId: string | null
}

// Walks forward through all already-existing months, placing the carried item in each one.
// This handles the case where future months were created before the item was added.
async function propagateToNextMonth(userId: string, monthId: string, item: CarryableItem) {
  let currentMonthId = monthId
  let currentItem: CarryableItem = item

  while (true) {
    const currentMonth = await db.budgetMonth.findUnique({
      where: { id: currentMonthId },
      select: { year: true, month: true },
    })
    if (!currentMonth) break

    const nextYear = currentMonth.month === 12 ? currentMonth.year + 1 : currentMonth.year
    const nextMonthNum = currentMonth.month === 12 ? 1 : currentMonth.month + 1

    const nextMonthRecord = await db.budgetMonth.findUnique({
      where: { userId_year_month: { userId, year: nextYear, month: nextMonthNum } },
      select: { id: true },
    })
    if (!nextMonthRecord) break

    const [carried] = computeCarryItems([{ ...currentItem, children: [] }], 1)
    if (!carried) break

    const alreadyExists = await db.budgetItem.findFirst({
      where: currentItem.installmentGroupId
        ? { monthId: nextMonthRecord.id, installmentGroupId: carried.installmentGroupId }
        : { monthId: nextMonthRecord.id, name: carried.name, recurring: true },
    })
    if (alreadyExists) break

    let nextParentId: string | null = null
    if (currentItem.parentId) {
      const currentParent = await db.budgetItem.findUnique({
        where: { id: currentItem.parentId },
        select: { name: true },
      })
      if (currentParent) {
        const nextParent = await db.budgetItem.findFirst({
          where: { monthId: nextMonthRecord.id, name: currentParent.name, parentId: null },
          select: { id: true },
        })
        nextParentId = nextParent?.id ?? null
      }
    }

    const created = await db.budgetItem.create({
      data: {
        monthId: nextMonthRecord.id,
        userId,
        parentId: nextParentId,
        name: carried.name,
        category: carried.category,
        currency: carried.currency,
        amount: carried.amount,
        amountCarried: carried.amountCarried,
        recurring: carried.recurring,
        itemType: carried.itemType,
        isCard: carried.isCard,
        installmentTotal: carried.installmentTotal,
        installmentNumber: carried.installmentNumber,
        installmentGroupId: carried.installmentGroupId,
      },
    })

    currentMonthId = nextMonthRecord.id
    currentItem = { ...carried, parentId: created.parentId }
  }
}

export async function addExpense(input: AddExpenseInput) {
  await assertOwnsMonth(input.userId, input.monthId)
  await db.budgetMonth.update({ where: { id: input.monthId }, data: { resetAt: null } })
  const itemType = input.itemType ?? 'one_time'
  const recurring = input.recurring ?? (itemType === 'recurring' || itemType === 'subscription')
  const item = await db.budgetItem.create({
    data: {
      monthId: input.monthId,
      userId: input.userId,
      parentId: input.parentId ?? null,
      name: input.name,
      category: input.category?.toLowerCase().trim() ?? null,
      currency: input.currency ?? 'ARS',
      amount: input.amount ?? null,
      recurring,
      itemType,
      expenseDate: input.expenseDate ?? null,
    },
  })
  if (item.recurring) {
    await propagateToNextMonth(input.userId, input.monthId, { ...item, itemType: item.itemType, isCard: item.isCard })
  }
  return item
}

type AddInstallmentInput = {
  userId: string
  monthId: string
  name: string
  category?: string
  amountCents: number
  totalPayments: number
  // The payment number this import starts at. Imports pass the statement's real current
  // payment (e.g. 5 for "5/12") so the expense shows true progress; manual/AI adds omit it
  // and start at 1.
  startNumber?: number
  parentId?: string
  currency?: string
  expenseDate?: Date
}

export async function addInstallment(input: AddInstallmentInput) {
  await assertOwnsMonth(input.userId, input.monthId)
  const { randomBytes } = await import('crypto')
  const installmentGroupId = randomBytes(12).toString('hex')
  const item = await db.budgetItem.create({
    data: {
      monthId: input.monthId,
      userId: input.userId,
      parentId: input.parentId ?? null,
      name: input.name,
      category: input.category?.toLowerCase().trim() ?? null,
      amount: input.amountCents,
      recurring: false,
      installmentTotal: input.totalPayments,
      installmentNumber: input.startNumber ?? 1,
      installmentGroupId,
      currency: input.currency ?? 'ARS',
      expenseDate: input.expenseDate ?? null,
    },
  })
  await propagateToNextMonth(input.userId, input.monthId, item)
  return item
}

// Re-importing a statement recreates this card's installments with fresh installmentGroupIds.
// Their previously-propagated copies in future months keep the OLD groupId, so the groupId-based
// dedup in propagateToNextMonth can't recognize them and would create duplicates. Purge those
// forward copies before recreating. Scoped to future months only; a prior month's series origin
// (and the current month, which the caller's own deleteMany handles) must stay intact.
export async function purgeForwardInstallments(input: { userId: string; monthId: string; cardId: string }) {
  const existing = await db.budgetItem.findMany({
    where: { userId: input.userId, monthId: input.monthId, parentId: input.cardId, installmentGroupId: { not: null } },
    select: { installmentGroupId: true },
  })
  const groupIds = [...new Set(existing.map(e => e.installmentGroupId).filter((g): g is string => g !== null))]
  if (groupIds.length === 0) return

  const month = await db.budgetMonth.findUnique({
    where: { id: input.monthId },
    select: { year: true, month: true },
  })
  if (!month) return

  await db.budgetItem.deleteMany({
    where: {
      userId: input.userId,
      installmentGroupId: { in: groupIds },
      month: {
        OR: [
          { year: { gt: month.year } },
          { year: month.year, month: { gt: month.month } },
        ],
      },
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

export async function setExpenseDate(input: { userId: string; itemId: string; expenseDate: Date | null }) {
  await assertOwnsItem(input.userId, input.itemId)
  return db.budgetItem.update({
    where: { id: input.itemId },
    data: { expenseDate: input.expenseDate },
  })
}

export async function setDueDate(input: { userId: string; itemId: string; dueDate: Date | null }) {
  await assertOwnsItem(input.userId, input.itemId)
  return db.budgetItem.update({
    where: { id: input.itemId },
    data: { dueDate: input.dueDate },
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
  const item = await assertOwnsItem(input.userId, input.itemId)

  const currentMonth = await db.budgetMonth.findUnique({
    where: { id: item.monthId },
    select: { year: true, month: true },
  })

  // Fetch parent name before deleting the item (needed for sub-item propagation)
  let parentName: string | null = null
  if (item.parentId && item.recurring) {
    const parent = await db.budgetItem.findUnique({
      where: { id: item.parentId },
      select: { name: true },
    })
    parentName = parent?.name ?? null
  }

  await db.budgetItem.delete({ where: { id: input.itemId } })

  if (!currentMonth) return

  const futureMonths = {
    OR: [
      { year: { gt: currentMonth.year } },
      { year: currentMonth.year, month: { gt: currentMonth.month } },
    ],
  }

  if (item.installmentGroupId) {
    await db.budgetItem.deleteMany({
      where: { userId: input.userId, installmentGroupId: item.installmentGroupId, month: futureMonths },
    })
  } else if (item.recurring) {
    if (parentName !== null) {
      await db.budgetItem.deleteMany({
        where: { userId: input.userId, name: item.name, recurring: true, parent: { name: parentName }, month: futureMonths },
      })
    } else {
      await db.budgetItem.deleteMany({
        where: { userId: input.userId, name: item.name, recurring: true, parentId: null, month: futureMonths },
      })
    }
  }
}

export async function getMonthsForUser(userId: string) {
  return db.budgetMonth.findMany({
    where: { userId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select: { id: true, year: true, month: true, compacted: true },
  })
}

export async function getFirstMonth(userId: string): Promise<{ year: number; month: number } | null> {
  // Earliest CALENDAR month that holds real data; anchors how far back the user can navigate.
  // Order by month, not createdAt: a statement for an old month can be imported after newer
  // months already exist, so the oldest-created item is not necessarily in the oldest month.
  // Card containers (isCard true) are auto-synced into every visited month, so they don't count;
  // any non-card item (a top-level expense or a card charge) does. Matches the analytics floor.
  return db.budgetMonth.findFirst({
    where: { userId, items: { some: { isCard: false } } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
    select: { year: true, month: true },
  })
}

export async function resetMonth(userId: string, year: number, month: number): Promise<void> {
  const existing = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year, month } },
    select: { id: true },
  })
  if (!existing) return
  await assertOwnsMonth(userId, existing.id)
  await db.budgetItem.deleteMany({ where: { monthId: existing.id } })
  await db.budgetMonth.update({
    where: { id: existing.id },
    data: { resetAt: new Date() },
  })

  // Delete future months that contain only recurring carry-forward items — these are
  // navigation artifacts from this month's data and would now carry stale entries.
  // Leave any future month alone if it has at least one explicitly-added one_time item.
  const futureMonths = await db.budgetMonth.findMany({
    where: {
      userId,
      resetAt: null,
      OR: [{ year: { gt: year } }, { year, month: { gt: month } }],
    },
    select: {
      id: true,
      items: { select: { itemType: true } },
    },
  })
  for (const fm of futureMonths) {
    const hasOneTime = fm.items.some(i => i.itemType === 'one_time')
    if (!hasOneTime) {
      await db.budgetMonth.delete({ where: { id: fm.id } })
    }
  }
}

export async function getItemsForAnalytics(userId: string) {
  return db.budgetItem.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      category: true,
      amount: true,
      currency: true,
      recurring: true,
      itemType: true,
      isCard: true,
      installmentTotal: true,
      installmentNumber: true,
      installmentGroupId: true,
      parentId: true,
      month: { select: { year: true, month: true } },
    },
  })
}

export async function setAmountNextMonth(input: { userId: string; itemId: string; amountCents: number }) {
  const item = await assertOwnsItem(input.userId, input.itemId)
  const currentMonth = await db.budgetMonth.findUnique({
    where: { id: item.monthId },
    select: { year: true, month: true },
  })
  if (!currentMonth) return

  const nextYear = currentMonth.month === 12 ? currentMonth.year + 1 : currentMonth.year
  const nextMonth = currentMonth.month === 12 ? 1 : currentMonth.month + 1

  let nextMonthRecord = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId: input.userId, year: nextYear, month: nextMonth } },
    select: { id: true },
  })
  if (!nextMonthRecord) {
    const created = await getOrCreateMonth(input.userId, nextYear, nextMonth)
    nextMonthRecord = created ? { id: created.id } : null
  }
  if (!nextMonthRecord) return

  let nextItem: { id: string } | null = null

  if (item.installmentGroupId) {
    nextItem = await db.budgetItem.findFirst({
      where: { monthId: nextMonthRecord.id, installmentGroupId: item.installmentGroupId },
      select: { id: true },
    })
  } else if (item.parentId) {
    const parent = await db.budgetItem.findUnique({
      where: { id: item.parentId },
      select: { name: true },
    })
    if (parent) {
      const nextParent = await db.budgetItem.findFirst({
        where: { monthId: nextMonthRecord.id, name: parent.name, parentId: null },
        select: { id: true },
      })
      if (nextParent) {
        nextItem = await db.budgetItem.findFirst({
          where: { monthId: nextMonthRecord.id, parentId: nextParent.id, name: item.name, recurring: true },
          select: { id: true },
        })
      }
    }
  } else {
    nextItem = await db.budgetItem.findFirst({
      where: { monthId: nextMonthRecord.id, name: item.name, recurring: true, parentId: null },
      select: { id: true },
    })
  }

  if (!nextItem) return
  await db.budgetItem.update({
    where: { id: nextItem.id },
    data: { amount: input.amountCents, amountCarried: false },
  })
}

export async function deletePastMonths(userId: string): Promise<void> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  await db.budgetMonth.deleteMany({
    where: {
      userId,
      OR: [
        { year: { lt: currentYear } },
        { year: currentYear, month: { lt: currentMonth } },
      ],
    },
  })
}

const TYPE_CYCLE: Record<string, string> = {
  one_time: 'subscription',
  subscription: 'recurring',
  recurring: 'one_time',
}

export async function setItemType(input: { userId: string; itemId: string }) {
  const item = await assertOwnsItem(input.userId, input.itemId)
  if (item.installmentTotal !== null || item.isCard) return

  const nextType = TYPE_CYCLE[item.itemType] ?? 'one_time'
  const wasRecurring = item.recurring
  const willBeRecurring = nextType === 'subscription' || nextType === 'recurring'

  const updated = await db.budgetItem.update({
    where: { id: item.id },
    data: { itemType: nextType, recurring: willBeRecurring },
  })

  const currentMonth = await db.budgetMonth.findUnique({
    where: { id: item.monthId },
    select: { year: true, month: true },
  })
  if (!currentMonth) return updated

  const futureFilter = {
    OR: [
      { year: { gt: currentMonth.year } },
      { year: currentMonth.year, month: { gt: currentMonth.month } },
    ],
  }

  const parentName = item.parentId
    ? (await db.budgetItem.findUnique({ where: { id: item.parentId }, select: { name: true } }))?.name ?? null
    : null

  const futureWhere = parentName !== null
    ? { userId: input.userId, name: item.name, recurring: true, parent: { name: parentName }, month: futureFilter }
    : { userId: input.userId, name: item.name, recurring: true, parentId: null as null, month: futureFilter }

  if (wasRecurring && !willBeRecurring) {
    await db.budgetItem.deleteMany({ where: futureWhere })
  } else if (!wasRecurring && willBeRecurring) {
    await propagateToNextMonth(input.userId, item.monthId, {
      ...updated,
      itemType: nextType,
      isCard: updated.isCard,
      parentId: item.parentId,
    })
  } else if (wasRecurring && willBeRecurring) {
    await db.budgetItem.updateMany({ where: futureWhere, data: { itemType: nextType } })
  }

  return updated
}

export async function setCategory(input: { userId: string; itemId: string; category: string | null }) {
  await assertOwnsItem(input.userId, input.itemId)
  return db.budgetItem.update({
    where: { id: input.itemId },
    data: { category: input.category ? input.category.toLowerCase().trim() : null },
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
      map[key] = item.category.toLowerCase().trim()
    }
  }
  return map
}
