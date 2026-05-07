import { describe, it, expect } from 'vitest'
import {
  computeCategoryTotals,
  computeUsdCategoryTotals,
  computeRollingAverage,
  computeInflationAlerts,
  computeInstallmentOverview,
  computeTypeTotals,
} from '../analytics'

type ItemSlim = {
  id?: string
  name: string
  category: string | null
  amount: number | null
  currency?: string
  recurring: boolean
  itemType?: string
  isCard?: boolean
  installmentTotal: number | null
  installmentNumber: number | null
  installmentGroupId: string | null
  parentId: string | null
}

type MonthItems = {
  year: number
  month: number
  items: ItemSlim[]
}

describe('computeCategoryTotals', () => {
  it('sums ARS amounts by category, skipping nulls and sub-items', () => {
    const items: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: 120000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
      { name: 'Sub', category: 'Housing', amount: 5000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: 'parent-1' },
      { name: 'Car', category: 'Transport', amount: 30000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
      { name: 'Unknown', category: null, amount: 10000, currency: 'ARS', recurring: false, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    const result = computeCategoryTotals(items)
    expect(result.find(c => c.category === 'housing')?.total).toBe(120000)
    expect(result.find(c => c.category === 'transport')?.total).toBe(30000)
    expect(result.find(c => c.category === null)?.total).toBe(10000)
  })

  it('excludes USD items', () => {
    const items: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: 120000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
      { name: 'Netflix', category: 'Subscription', amount: 1599, currency: 'USD', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    const result = computeCategoryTotals(items)
    expect(result.find(c => c.category === 'housing')?.total).toBe(120000)
    expect(result.find(c => c.category === 'subscription')).toBeUndefined()
  })

  it('treats items without currency as ARS', () => {
    const items: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: 120000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    const result = computeCategoryTotals(items)
    expect(result.find(c => c.category === 'housing')?.total).toBe(120000)
  })

  it('returns empty array for no items', () => {
    expect(computeCategoryTotals([])).toEqual([])
  })

  it('skips items with null amount', () => {
    const items: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: null, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    expect(computeCategoryTotals(items)).toEqual([])
  })
})

describe('computeUsdCategoryTotals', () => {
  it('sums USD amounts by category, including card children', () => {
    const items: ItemSlim[] = [
      { id: 'amex-id', name: 'Amex', category: 'tarjetas', amount: null, currency: 'USD', isCard: true, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
      { name: 'Netflix', category: 'Subscription', amount: 1599, currency: 'USD', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: 'amex-id' },
      { name: 'Spotify', category: 'Subscription', amount: 599, currency: 'USD', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: 'amex-id' },
      { name: 'Rent', category: 'Housing', amount: 120000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    const result = computeUsdCategoryTotals(items)
    expect(result.find(c => c.category === 'subscription')?.total).toBe(2198)
    expect(result.find(c => c.category === 'housing')).toBeUndefined()
    expect(result.find(c => c.category === 'tarjetas')).toBeUndefined()
  })

  it('returns empty array when no USD items', () => {
    const items: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: 120000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    expect(computeUsdCategoryTotals(items)).toEqual([])
  })
})

describe('computeRollingAverage', () => {
  it('computes average from the last N months', () => {
    const months: MonthItems[] = [
      { year: 2025, month: 1, items: [{ name: 'Rent', category: 'Housing', amount: 100000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
      { year: 2025, month: 2, items: [{ name: 'Rent', category: 'Housing', amount: 110000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
      { year: 2025, month: 3, items: [{ name: 'Rent', category: 'Housing', amount: 120000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
    ]
    const result = computeRollingAverage(months, 3)
    expect(result.find(r => r.category === 'housing')?.avg).toBe(110000)
  })

  it('accepts a custom totalizer for USD averages', () => {
    const months: MonthItems[] = [
      { year: 2025, month: 1, items: [{ name: 'Netflix', category: 'Subscription', amount: 1599, currency: 'USD', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
      { year: 2025, month: 2, items: [{ name: 'Netflix', category: 'Subscription', amount: 1599, currency: 'USD', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
    ]
    const result = computeRollingAverage(months, 2, computeUsdCategoryTotals)
    expect(result.find(r => r.category === 'subscription')?.avg).toBe(1599)
  })
})

describe('computeTypeTotals', () => {
  it('excludes USD items from type totals', () => {
    const items: ItemSlim[] = [
      { id: 'card-1', name: 'Amex', category: 'tarjetas', amount: null, currency: 'USD', isCard: true, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
      { name: 'Netflix', category: 'Subscription', amount: 1599, currency: 'USD', isCard: false, itemType: 'subscription', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: 'card-1' },
      { name: 'Rent', category: 'Housing', amount: 120000, currency: 'ARS', isCard: false, itemType: 'recurring', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    const result = computeTypeTotals(items)
    const cardTotal = result.find(t => t.type === 'card')
    expect(cardTotal).toBeUndefined()
    const recurringTotal = result.find(t => t.type === 'recurring')
    expect(recurringTotal?.total).toBe(120000)
  })
})

describe('computeInflationAlerts', () => {
  it('detects price changes for recurring items', () => {
    const current: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: 130000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    const previous: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: 100000, currency: 'ARS', recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    const result = computeInflationAlerts(current, previous)
    expect(result[0]?.changePct).toBe(30)
  })
})

describe('computeInstallmentOverview', () => {
  it('summarizes active installments', () => {
    const items: ItemSlim[] = [
      { name: 'TV', category: 'Electronics', amount: 10000, currency: 'ARS', recurring: false, installmentTotal: 12, installmentNumber: 3, installmentGroupId: 'grp-1', parentId: null },
    ]
    const result = computeInstallmentOverview(items)
    expect(result[0]?.paymentsRemaining).toBe(9)
    expect(result[0]?.totalRemaining).toBe(90000)
  })
})
