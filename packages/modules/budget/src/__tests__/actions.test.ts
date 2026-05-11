import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@lifehelper/core', () => ({
  db: {
    budgetMonth: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    budgetItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    card: {
      findMany: vi.fn(),
    },
    categoryKeyword: {
      findUnique: vi.fn().mockResolvedValue({ keyword: '__seeded__' }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
  },
}))

vi.mock('@lifehelper/integrations', () => ({
  resolveContributions: vi.fn().mockResolvedValue([]),
}))

import { assertOwnsMonth, assertOwnsItem } from '../ownership'
import { getOrCreateMonth, addExpense, togglePaid, setAmount, fetchCategoryHistory, setExpenseDate } from '../actions'
import { db } from '@lifehelper/core'

const MONTH = { id: 'm1', userId: 'u1', year: 2025, month: 5, compacted: false, compactedSummary: null, createdAt: new Date() }
const ITEM = { id: 'i1', userId: 'u1', monthId: 'm1', parentId: null, name: 'Rent', category: null, amount: null, amountCarried: false, paid: false, paidAt: null, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, notes: null, linkedPocketId: null, expenseDate: null, createdAt: new Date() }

describe('assertOwnsMonth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the month when userId matches', async () => {
    vi.mocked(db.budgetMonth.findUnique).mockResolvedValue(MONTH as never)
    const result = await assertOwnsMonth('u1', 'm1')
    expect(result.id).toBe('m1')
  })

  it('throws Forbidden when userId does not match', async () => {
    vi.mocked(db.budgetMonth.findUnique).mockResolvedValue({ ...MONTH, userId: 'other' } as never)
    await expect(assertOwnsMonth('u1', 'm1')).rejects.toThrow('Forbidden')
  })

  it('throws Forbidden when month not found', async () => {
    vi.mocked(db.budgetMonth.findUnique).mockResolvedValue(null)
    await expect(assertOwnsMonth('u1', 'm1')).rejects.toThrow('Forbidden')
  })
})

describe('assertOwnsItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the item when userId matches', async () => {
    vi.mocked(db.budgetItem.findUnique).mockResolvedValue(ITEM as never)
    const result = await assertOwnsItem('u1', 'i1')
    expect(result.id).toBe('i1')
  })

  it('throws Forbidden when userId does not match', async () => {
    vi.mocked(db.budgetItem.findUnique).mockResolvedValue({ ...ITEM, userId: 'other' } as never)
    await expect(assertOwnsItem('u1', 'i1')).rejects.toThrow('Forbidden')
  })
})

describe('addExpense', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a top-level expense item', async () => {
    vi.mocked(db.budgetMonth.findUnique).mockResolvedValue(MONTH as never)
    vi.mocked(db.budgetItem.create).mockResolvedValue({ id: 'i1' } as never)
    await addExpense({ userId: 'u1', monthId: 'm1', name: 'Rent', category: 'Housing', recurring: true })
    expect(db.budgetItem.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'Rent', userId: 'u1', monthId: 'm1' }),
    }))
  })
})

describe('togglePaid', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets paid=true and paidAt when currently unpaid', async () => {
    vi.mocked(db.budgetItem.findUnique).mockResolvedValue({ ...ITEM, paid: false } as never)
    vi.mocked(db.budgetItem.update).mockResolvedValue({ id: 'i1' } as never)
    await togglePaid({ userId: 'u1', itemId: 'i1' })
    expect(db.budgetItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paid: true }),
    }))
  })

  it('sets paid=false and clears paidAt when currently paid', async () => {
    vi.mocked(db.budgetItem.findUnique).mockResolvedValue({ ...ITEM, paid: true } as never)
    vi.mocked(db.budgetItem.update).mockResolvedValue({ id: 'i1' } as never)
    await togglePaid({ userId: 'u1', itemId: 'i1' })
    expect(db.budgetItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paid: false, paidAt: null }),
    }))
  })
})

describe('setAmount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates amount and clears amountCarried', async () => {
    vi.mocked(db.budgetItem.findUnique).mockResolvedValue({ ...ITEM, amountCarried: true } as never)
    vi.mocked(db.budgetItem.update).mockResolvedValue({ id: 'i1' } as never)
    await setAmount({ userId: 'u1', itemId: 'i1', amountCents: 120000 })
    expect(db.budgetItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { amount: 120000, amountCarried: false },
    }))
  })
})

describe('fetchCategoryHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a map of lowercase name to most recent category', async () => {
    vi.mocked(db.budgetItem.findMany).mockResolvedValue([
      { name: 'Rappi', category: 'comida', createdAt: new Date('2025-05-01') },
      { name: 'rappi', category: 'viajes', createdAt: new Date('2025-04-01') },
      { name: 'Gym', category: 'salud', createdAt: new Date('2025-05-01') },
    ] as never)
    const result = await fetchCategoryHistory('u1')
    expect(result['rappi']).toBe('comida')
    expect(result['gym']).toBe('salud')
  })

  it('skips items with null category', async () => {
    vi.mocked(db.budgetItem.findMany).mockResolvedValue([
      { name: 'Unknown', category: null, createdAt: new Date() },
    ] as never)
    const result = await fetchCategoryHistory('u1')
    expect(Object.keys(result)).toHaveLength(0)
  })
})

describe('getOrCreateMonth - card sync', () => {
  beforeEach(() => vi.clearAllMocks())

  const month = { id: 'm1', userId: 'u1', year: 2025, month: 5, compacted: false, compactedSummary: null, createdAt: new Date(), items: [] }

  it('creates a BudgetItem for each Card not yet in the month', async () => {
    vi.mocked(db.budgetMonth.findUnique)
      .mockResolvedValueOnce({ ...month, items: [] } as never)
      .mockResolvedValueOnce({ ...month, items: [] } as never)
    vi.mocked((db as any).card.findMany).mockResolvedValue([
      { id: 'card1', userId: 'u1', name: 'Visa', category: 'tarjeta', createdAt: new Date() },
    ])
    vi.mocked(db.budgetItem.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.budgetItem.create).mockResolvedValue({} as never)

    await getOrCreateMonth('u1', 2025, 5)

    expect(db.budgetItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Visa', isCard: true, recurring: true }) })
    )
  })

  it('does not duplicate a Card already present in the month', async () => {
    vi.mocked(db.budgetMonth.findUnique)
      .mockResolvedValueOnce({ ...month, items: [] } as never)
      .mockResolvedValueOnce({ ...month, items: [] } as never)
    vi.mocked((db as any).card.findMany).mockResolvedValue([
      { id: 'card1', userId: 'u1', name: 'Visa', category: 'tarjeta', createdAt: new Date() },
    ])
    vi.mocked(db.budgetItem.findFirst).mockResolvedValue({ id: 'item1' } as never)

    await getOrCreateMonth('u1', 2025, 5)

    expect(db.budgetItem.create).not.toHaveBeenCalled()
  })
})

describe('addExpense with expenseDate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves expenseDate when provided', async () => {
    vi.mocked(db.budgetMonth.findUnique).mockResolvedValue({ ...MONTH, userId: 'u1' } as never)
    vi.mocked(db.budgetMonth.update).mockResolvedValue(MONTH as never)
    vi.mocked(db.budgetItem.create).mockResolvedValue({ ...ITEM, expenseDate: new Date('2026-05-15') } as never)
    vi.mocked(db.card.findMany).mockResolvedValue([])

    const date = new Date('2026-05-15')
    await addExpense({ userId: 'u1', monthId: 'm1', name: 'Coffee', expenseDate: date })

    expect(db.budgetItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ expenseDate: date }) })
    )
  })

  it('stores null expenseDate when not provided', async () => {
    vi.mocked(db.budgetMonth.findUnique).mockResolvedValue({ ...MONTH, userId: 'u1' } as never)
    vi.mocked(db.budgetMonth.update).mockResolvedValue(MONTH as never)
    vi.mocked(db.budgetItem.create).mockResolvedValue({ ...ITEM } as never)
    vi.mocked(db.card.findMany).mockResolvedValue([])

    await addExpense({ userId: 'u1', monthId: 'm1', name: 'Coffee' })

    const createCall = vi.mocked(db.budgetItem.create).mock.calls[0]![0]
    expect(createCall.data).toHaveProperty('expenseDate', null)
  })
})

describe('setExpenseDate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates expenseDate on the item', async () => {
    vi.mocked(db.budgetItem.findUnique).mockResolvedValue({ ...ITEM, userId: 'u1' } as never)
    vi.mocked(db.budgetItem.update).mockResolvedValue({ ...ITEM, expenseDate: new Date('2026-05-10') } as never)

    const date = new Date('2026-05-10')
    await setExpenseDate({ userId: 'u1', itemId: 'i1', expenseDate: date })

    expect(db.budgetItem.update).toHaveBeenCalledWith({
      where: { id: 'i1' },
      data: { expenseDate: date },
    })
  })

  it('clears expenseDate when null is passed', async () => {
    vi.mocked(db.budgetItem.findUnique).mockResolvedValue({ ...ITEM, userId: 'u1' } as never)
    vi.mocked(db.budgetItem.update).mockResolvedValue({ ...ITEM, expenseDate: null } as never)

    await setExpenseDate({ userId: 'u1', itemId: 'i1', expenseDate: null })

    expect(db.budgetItem.update).toHaveBeenCalledWith({
      where: { id: 'i1' },
      data: { expenseDate: null },
    })
  })
})
