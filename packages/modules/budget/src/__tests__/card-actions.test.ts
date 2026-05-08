import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@lifehelper/core', () => ({
  db: {
    card: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    budgetItem: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}))

import { getCardsForUser, addCard, setCurrency, renameCard, removeCard } from '../card-actions'
import { db } from '@lifehelper/core'

const mockDb = db as unknown as {
  card: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
  budgetItem: {
    updateMany: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => vi.clearAllMocks())

describe('getCardsForUser', () => {
  it('returns cards ordered by createdAt', async () => {
    const cards = [
      { id: 'c1', userId: 'u1', name: 'Visa', category: 'tarjetas', currency: 'ARS', createdAt: new Date() },
    ]
    mockDb.card.findMany.mockResolvedValue(cards)
    const result = await getCardsForUser('u1')
    expect(result).toEqual(cards)
    expect(mockDb.card.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'asc' },
    })
  })
})

describe('addCard', () => {
  it('creates an ARS card with hardcoded tarjetas category', async () => {
    const card = { id: 'c1', userId: 'u1', name: 'Visa', category: 'tarjetas', currency: 'ARS', createdAt: new Date() }
    mockDb.card.create.mockResolvedValue(card)
    const result = await addCard({ userId: 'u1', name: 'Visa' })
    expect(result).toEqual(card)
    expect(mockDb.card.create).toHaveBeenCalledWith({
      data: { userId: 'u1', name: 'Visa', category: 'tarjetas', currency: 'ARS' },
    })
  })

  it('creates a USD card when currency is specified', async () => {
    const card = { id: 'c1', userId: 'u1', name: 'Amex', category: 'tarjetas', currency: 'USD', createdAt: new Date() }
    mockDb.card.create.mockResolvedValue(card)
    await addCard({ userId: 'u1', name: 'Amex', currency: 'USD' })
    expect(mockDb.card.create).toHaveBeenCalledWith({
      data: { userId: 'u1', name: 'Amex', category: 'tarjetas', currency: 'USD' },
    })
  })
})

describe('renameCard', () => {
  it('updates the card name and propagates to budget items', async () => {
    mockDb.card.findUnique.mockResolvedValue({ id: 'c1', userId: 'u1', name: 'Visa', currency: 'ARS', createdAt: new Date() })
    mockDb.card.update.mockResolvedValue({})
    await renameCard({ userId: 'u1', cardId: 'c1', name: 'Visa Galicia' })
    expect(mockDb.card.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { name: 'Visa Galicia' } })
    expect(mockDb.budgetItem.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', isCard: true, name: 'Visa' },
      data: { name: 'Visa Galicia' },
    })
  })

  it('throws if the card does not belong to the user', async () => {
    mockDb.card.findUnique.mockResolvedValue({ id: 'c1', userId: 'other', name: 'Visa', currency: 'ARS', createdAt: new Date() })
    await expect(renameCard({ userId: 'u1', cardId: 'c1', name: 'Visa Galicia' })).rejects.toThrow('Forbidden')
  })
})

describe('setCurrency', () => {
  it('updates the card currency and propagates to budget items', async () => {
    mockDb.card.findUnique.mockResolvedValue({ id: 'c1', userId: 'u1', name: 'Amex', currency: 'ARS', createdAt: new Date() })
    mockDb.card.update.mockResolvedValue({})
    await setCurrency({ userId: 'u1', cardId: 'c1', currency: 'USD' })
    expect(mockDb.card.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { currency: 'USD' } })
    expect(mockDb.budgetItem.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', isCard: true, name: 'Amex' },
      data: { currency: 'USD' },
    })
  })

  it('throws if the card does not belong to the user', async () => {
    mockDb.card.findUnique.mockResolvedValue({ id: 'c1', userId: 'other', currency: 'ARS', createdAt: new Date() })
    await expect(setCurrency({ userId: 'u1', cardId: 'c1', currency: 'USD' })).rejects.toThrow('Forbidden')
  })
})

describe('removeCard', () => {
  it('deletes the card by id after verifying ownership', async () => {
    mockDb.card.findUnique.mockResolvedValue({ id: 'c1', userId: 'u1', name: 'Visa', category: null, currency: 'ARS', createdAt: new Date() })
    mockDb.card.delete.mockResolvedValue({})
    await removeCard({ userId: 'u1', cardId: 'c1' })
    expect(mockDb.card.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })

  it('throws if the card does not belong to the user', async () => {
    mockDb.card.findUnique.mockResolvedValue({ id: 'c1', userId: 'other', name: 'Visa', category: null, currency: 'ARS', createdAt: new Date() })
    await expect(removeCard({ userId: 'u1', cardId: 'c1' })).rejects.toThrow('Forbidden')
  })

  it('throws if the card does not exist', async () => {
    mockDb.card.findUnique.mockResolvedValue(null)
    await expect(removeCard({ userId: 'u1', cardId: 'c1' })).rejects.toThrow('Forbidden')
  })
})
