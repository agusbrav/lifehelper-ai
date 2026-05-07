export type ItemType = 'recurring' | 'subscription' | 'one_time'

export type SourceItem = {
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
  children: SourceItem[]
}

export type CarryItem = {
  name: string
  category: string | null
  amount: number | null
  currency: string
  amountCarried: boolean
  recurring: boolean
  itemType: string
  isCard: boolean
  installmentTotal: number | null
  installmentNumber: number | null
  installmentGroupId: string | null
  children: CarryItem[]
}
