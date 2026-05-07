import { describe, it, expect } from 'vitest'
import {
  computeCategoryTotals,
  computeRollingAverage,
  computeInflationAlerts,
  computeInstallmentOverview,
} from '../analytics'

type ItemSlim = {
  id?: string
  name: string
  category: string | null
  amount: number | null
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
  it('sums amounts by category, skipping nulls and sub-items', () => {
    const items: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: 120000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
      { name: 'Sub', category: 'Housing', amount: 5000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: 'parent-1' },
      { name: 'Car', category: 'Transport', amount: 30000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
      { name: 'Unknown', category: null, amount: 10000, recurring: false, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    const result = computeCategoryTotals(items)
    expect(result.find(c => c.category === 'housing')?.total).toBe(120000)
    expect(result.find(c => c.category === 'transport')?.total).toBe(30000)
    expect(result.find(c => c.category === null)?.total).toBe(10000)
  })

  it('returns empty array for no items', () => {
    expect(computeCategoryTotals([])).toEqual([])
  })

  it('skips items with null amount', () => {
    const items: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: null, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    expect(computeCategoryTotals(items)).toEqual([])
  })
})

describe('computeRollingAverage', () => {
  it('computes average from the last N months', () => {
    const months: MonthItems[] = [
      { year: 2025, month: 1, items: [{ name: 'Rent', category: 'Housing', amount: 100000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
      { year: 2025, month: 2, items: [{ name: 'Rent', category: 'Housing', amount: 110000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
      { year: 2025, month: 3, items: [{ name: 'Rent', category: 'Housing', amount: 120000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
    ]
    const result = computeRollingAverage(months, 3)
    expect(result.find(c => c.category === 'housing')?.avg).toBe(110000)
  })

  it('uses only the last N months when more are provided', () => {
    const months: MonthItems[] = [
      { year: 2025, month: 1, items: [{ name: 'Rent', category: 'Housing', amount: 50000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
      { year: 2025, month: 2, items: [{ name: 'Rent', category: 'Housing', amount: 100000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
      { year: 2025, month: 3, items: [{ name: 'Rent', category: 'Housing', amount: 110000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
      { year: 2025, month: 4, items: [{ name: 'Rent', category: 'Housing', amount: 120000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }] },
    ]
    // Only last 3: 100k, 110k, 120k → avg 110k (month 1 excluded)
    const result = computeRollingAverage(months, 3)
    expect(result.find(c => c.category === 'housing')?.avg).toBe(110000)
  })
})

describe('computeInflationAlerts', () => {
  it('flags recurring items where amount changed vs 3 months ago', () => {
    const current: ItemSlim[] = [{ name: 'Rent', category: 'Housing', amount: 150000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }]
    const previous: ItemSlim[] = [{ name: 'Rent', category: 'Housing', amount: 120000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }]
    const alerts = computeInflationAlerts(current, previous)
    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.name).toBe('Rent')
    expect(alerts[0]!.changePct).toBeCloseTo(25)
  })

  it('returns empty when amounts are unchanged', () => {
    const items: ItemSlim[] = [{ name: 'Netflix', category: 'Subscriptions', amount: 1800, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null }]
    expect(computeInflationAlerts(items, items)).toEqual([])
  })

  it('ignores sub-items and one-offs', () => {
    const current: ItemSlim[] = [
      { name: 'Netflix', category: null, amount: 2000, recurring: false, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
      { name: 'Netflix', category: null, amount: 2000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: 'p1' },
    ]
    const previous: ItemSlim[] = [
      { name: 'Netflix', category: null, amount: 1800, recurring: false, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    expect(computeInflationAlerts(current, previous)).toEqual([])
  })
})

describe('computeInstallmentOverview', () => {
  it('summarises active installment groups', () => {
    const items: ItemSlim[] = [
      { name: 'Phone', category: 'Tech', amount: 10000, recurring: false, installmentTotal: 12, installmentNumber: 3, installmentGroupId: 'grp-1', parentId: null },
    ]
    const result = computeInstallmentOverview(items)
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('Phone')
    expect(result[0]!.amountPerMonth).toBe(10000)
    expect(result[0]!.paymentsRemaining).toBe(9)
    expect(result[0]!.totalRemaining).toBe(90000)
  })

  it('deduplicates by installmentGroupId', () => {
    const items: ItemSlim[] = [
      { name: 'Phone', category: 'Tech', amount: 10000, recurring: false, installmentTotal: 12, installmentNumber: 3, installmentGroupId: 'grp-1', parentId: null },
      { name: 'Phone', category: 'Tech', amount: 10000, recurring: false, installmentTotal: 12, installmentNumber: 3, installmentGroupId: 'grp-1', parentId: null },
    ]
    expect(computeInstallmentOverview(items)).toHaveLength(1)
  })

  it('ignores items with no installmentGroupId', () => {
    const items: ItemSlim[] = [
      { name: 'Rent', category: 'Housing', amount: 120000, recurring: true, installmentTotal: null, installmentNumber: null, installmentGroupId: null, parentId: null },
    ]
    expect(computeInstallmentOverview(items)).toEqual([])
  })
})
