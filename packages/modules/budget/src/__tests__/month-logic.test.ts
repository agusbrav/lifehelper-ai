import { describe, it, expect } from 'vitest'
import { computeCarryItems } from '../month-logic'
import type { SourceItem } from '../types'

const base: SourceItem = {
  name: 'Rent',
  category: 'Housing',
  amount: 120000,
  recurring: true,
  installmentTotal: null,
  installmentNumber: null,
  installmentGroupId: null,
  children: [],
}

describe('computeCarryItems', () => {
  it('carries a recurring item with its amount', () => {
    const result = computeCarryItems([base])
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('Rent')
    expect(result[0]!.amount).toBe(120000)
    expect(result[0]!.amountCarried).toBe(true)
  })

  it('does not carry a one-off item', () => {
    const result = computeCarryItems([{ ...base, recurring: false }])
    expect(result).toHaveLength(0)
  })

  it('carries sub-items nested under their parent', () => {
    const parent: SourceItem = {
      ...base,
      name: 'Credit Card Visa',
      children: [
        { name: 'Netflix', category: 'Subscriptions', amount: 1800, recurring: true,
          installmentTotal: null, installmentNumber: null, installmentGroupId: null, children: [] },
      ],
    }
    const result = computeCarryItems([parent])
    expect(result[0]!.children).toHaveLength(1)
    expect(result[0]!.children[0]!.name).toBe('Netflix')
    expect(result[0]!.children[0]!.amountCarried).toBe(true)
  })

  it('does not carry a one-off sub-item', () => {
    const parent: SourceItem = {
      ...base,
      children: [
        { name: 'One-off charge', category: null, amount: 500, recurring: false,
          installmentTotal: null, installmentNumber: null, installmentGroupId: null, children: [] },
      ],
    }
    const result = computeCarryItems([parent])
    expect(result[0]!.children).toHaveLength(0)
  })

  it('increments installmentNumber on carry', () => {
    const item: SourceItem = {
      name: 'Phone', category: 'Tech', amount: 10000, recurring: false,
      installmentTotal: 12, installmentNumber: 3, installmentGroupId: 'grp-1', children: [],
    }
    const result = computeCarryItems([item])
    expect(result[0]!.installmentNumber).toBe(4)
    expect(result[0]!.installmentTotal).toBe(12)
  })

  it('carries the final installment once and then stops (sets installmentTotal null)', () => {
    const item: SourceItem = {
      name: 'Phone', category: 'Tech', amount: 10000, recurring: false,
      installmentTotal: 12, installmentNumber: 12, installmentGroupId: 'grp-1', children: [],
    }
    const result = computeCarryItems([item])
    expect(result).toHaveLength(1)
    expect(result[0]!.installmentNumber).toBeNull()
    expect(result[0]!.installmentTotal).toBeNull()
    expect(result[0]!.installmentGroupId).toBeNull()
  })

  it('preserves installmentGroupId on non-final carry', () => {
    const item: SourceItem = {
      name: 'Phone', category: 'Tech', amount: 10000, recurring: false,
      installmentTotal: 12, installmentNumber: 3, installmentGroupId: 'grp-1', children: [],
    }
    const result = computeCarryItems([item])
    expect(result[0]!.installmentGroupId).toBe('grp-1')
  })

  it('full installment lifecycle: last payment carry is not re-carried', () => {
    const lastPayment: SourceItem = {
      name: 'Phone', category: 'Tech', amount: 10000, recurring: false,
      installmentTotal: 12, installmentNumber: 12, installmentGroupId: 'grp-1', children: [],
    }
    // Month N: carry the last payment
    const carried = computeCarryItems([lastPayment])
    expect(carried).toHaveLength(1)
    // Month N+1: the carried item should NOT be carried again
    const nextCarry = computeCarryItems(carried.map(c => ({
      ...c,
      children: [],
    })))
    expect(nextCarry).toHaveLength(0)
  })

  it('does not carry an installment after its last payment', () => {
    const item: SourceItem = {
      name: 'Phone', category: 'Tech', amount: 10000, recurring: false,
      installmentTotal: null, installmentNumber: 12, installmentGroupId: 'grp-1', children: [],
    }
    const result = computeCarryItems([item])
    expect(result).toHaveLength(0)
  })

  it('carries a null-amount recurring item', () => {
    const result = computeCarryItems([{ ...base, amount: null }])
    expect(result[0]!.amount).toBeNull()
    expect(result[0]!.amountCarried).toBe(false)
  })
})
