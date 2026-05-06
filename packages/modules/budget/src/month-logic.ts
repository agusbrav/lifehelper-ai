import type { SourceItem, CarryItem } from './types'

function shouldCarry(item: SourceItem): boolean {
  if (item.recurring) return true
  // active installment: has a total and hasn't been marked as "last payment done"
  if (item.installmentTotal !== null && item.installmentNumber !== null) return true
  return false
}

function carryItem(item: SourceItem): CarryItem {
  const isLastPayment =
    item.installmentTotal !== null &&
    item.installmentNumber === item.installmentTotal

  return {
    name: item.name,
    category: item.category,
    amount: item.amount,
    amountCarried: item.amount !== null,
    recurring: item.recurring,
    installmentTotal: isLastPayment ? null : item.installmentTotal,
    installmentNumber: isLastPayment ? null : (item.installmentNumber !== null ? item.installmentNumber + 1 : null),
    installmentGroupId: isLastPayment ? null : item.installmentGroupId,
    children: item.children
      .filter(shouldCarry)
      .map(carryItem),
  }
}

export function computeCarryItems(previousItems: SourceItem[]): CarryItem[] {
  return previousItems.filter(shouldCarry).map(carryItem)
}
