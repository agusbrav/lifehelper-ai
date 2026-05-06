export type SourceItem = {
  name: string
  category: string | null
  amount: number | null
  recurring: boolean
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
  installmentTotal: number | null
  installmentNumber: number | null
  installmentGroupId: string | null
  children: CarryItem[]
}
