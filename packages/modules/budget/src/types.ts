export type ItemType = 'recurring' | 'subscription' | 'one_time'

export type SourceItem = {
  name: string
  category: string | null
  amount: number | null
  recurring: boolean
  itemType: string
  installmentTotal: number | null
  installmentNumber: number | null
  installmentGroupId: string | null
  children: SourceItem[]
}

export type CarryItem = {
  name: string
  category: string | null
  amount: number | null
  amountCarried: boolean
  recurring: boolean
  itemType: string
  installmentTotal: number | null
  installmentNumber: number | null
  installmentGroupId: string | null
  children: CarryItem[]
}
