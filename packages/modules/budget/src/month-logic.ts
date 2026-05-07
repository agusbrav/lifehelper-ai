import type { SourceItem, CarryItem } from './types'

function shouldCarry(item: SourceItem, gap: number): boolean {
  if (item.isCard) return false
  if (item.recurring) return true
  if (item.installmentTotal !== null && item.installmentNumber !== null) {
    if (gap === 1) return true  // gap-1 path: carry including the final-payment → one-time conversion
    // Larger gaps: only carry if a payment actually lands in the target month
    return item.installmentNumber + gap <= item.installmentTotal
  }
  return false
}

function carryItem(item: SourceItem, gap: number): CarryItem {
  const nextNumber = item.installmentNumber !== null ? item.installmentNumber + gap : null
  // nextNumber overshoots installmentTotal when the last payment was already this period
  const isLastPayment = item.installmentTotal !== null && nextNumber !== null && nextNumber > item.installmentTotal

  return {
    name: item.name,
    category: item.category,
    amount: item.amount,
    amountCarried: item.amount !== null,
    recurring: item.recurring,
    itemType: item.itemType,
    isCard: item.isCard,
    installmentTotal: isLastPayment ? null : item.installmentTotal,
    installmentNumber: isLastPayment ? null : nextNumber,
    installmentGroupId: isLastPayment ? null : item.installmentGroupId,
    children: item.children
      .filter(child => shouldCarry(child, gap))
      .map(child => carryItem(child, gap)),
  }
}

export function computeCarryItems(previousItems: SourceItem[], gap = 1): CarryItem[] {
  return previousItems.filter(item => shouldCarry(item, gap)).map(item => carryItem(item, gap))
}
