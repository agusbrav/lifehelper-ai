import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@lifehelper/core', () => ({
  db: {
    budgetMonth: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    budgetItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@lifehelper/integrations', () => ({
  resolveContributions: vi.fn().mockResolvedValue([]),
}))

import { assertOwnsMonth, assertOwnsItem } from '../ownership'
import { getOrCreateMonth, addExpense, togglePaid, setAmount } from '../actions'
import { db } from '@lifehelper/core'

const MONTH = { id: 'm1', userId: 'u1', year: 2025, month: 5, compacted: false, compactedSummary: null, createdAt: new Date() }
const ITEM = { id: 'i1', userId: 'u1', monthId: 'm1', parentId: null, name: 'Rent', category: null, amount: null, amountCarried: false, paid: false, paidAt: null, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, notes: null, linkedPocketId: null, createdAt: new Date() }

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
