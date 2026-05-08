export type ItemSlim = {
  id: string
  name: string
  category: string | null
  amount: number | null
  currency: string
  recurring: boolean
  itemType?: string
  isCard?: boolean
  installmentTotal: number | null
  installmentNumber: number | null
  installmentGroupId: string | null
  parentId: string | null
}

export type MonthData = {
  year: number
  month: number
  items: ItemSlim[]
}

export type CategoryTotal = {
  category: string | null
  total: number
}

export type RollingAvgResult = {
  category: string | null
  avg: number
}

export type InflationAlert = {
  name: string
  currentAmount: number
  previousAmount: number
  changePct: number
}

export type InstallmentSummary = {
  groupId: string
  name: string
  amountPerMonth: number
  currentPayment: number
  totalPayments: number
  paymentsRemaining: number
  totalRemaining: number
}

// Returns the effective currency of an item, accounting for card children that may have been
// created before explicit USD tracking (schema default 'ARS'). A card's currency is
// authoritative: all its charges are treated as that currency unless explicitly overridden to USD.
function effectiveCurrency(item: ItemSlim, cardCurrencyMap: Map<string, string>): 'ARS' | 'USD' {
  if (item.currency === 'USD') return 'USD'
  if (item.parentId !== null) {
    const parentCurrency = cardCurrencyMap.get(item.parentId)
    if (parentCurrency === 'USD') return 'USD'
  }
  return 'ARS'
}

function buildCardCurrencyMap(items: ItemSlim[]): Map<string, string> {
  return new Map(
    items.filter(i => i.isCard && i.parentId === null).map(i => [i.id, i.currency ?? 'ARS']),
  )
}

// ARS expenses: top-level non-card items + ARS card charges
export function computeCategoryTotals(items: ItemSlim[]): CategoryTotal[] {
  const cardCurrencyMap = buildCardCurrencyMap(items)
  const map = new Map<string, number>()
  for (const item of items) {
    if (item.amount === null || item.isCard) continue
    if (item.parentId !== null && !cardCurrencyMap.has(item.parentId)) continue
    if (effectiveCurrency(item, cardCurrencyMap) === 'USD') continue
    const key = item.category?.toLowerCase() ?? '__null__'
    map.set(key, (map.get(key) ?? 0) + item.amount)
  }
  return Array.from(map.entries()).map(([key, total]) => ({
    category: key === '__null__' ? null : key,
    total,
  }))
}

// USD expenses: top-level USD items + USD card charges
export function computeUsdCategoryTotals(items: ItemSlim[]): CategoryTotal[] {
  const cardCurrencyMap = buildCardCurrencyMap(items)
  const map = new Map<string, number>()
  for (const item of items) {
    if (item.amount === null || item.isCard) continue
    if (item.parentId !== null && !cardCurrencyMap.has(item.parentId)) continue
    if (effectiveCurrency(item, cardCurrencyMap) !== 'USD') continue
    const key = item.category?.toLowerCase() ?? '__null__'
    map.set(key, (map.get(key) ?? 0) + item.amount)
  }
  return Array.from(map.entries()).map(([key, total]) => ({
    category: key === '__null__' ? null : key,
    total,
  }))
}

export function computeRollingAverage(
  months: MonthData[],
  windowSize: number,
  totalize: (items: ItemSlim[]) => CategoryTotal[] = computeCategoryTotals,
): RollingAvgResult[] {
  const recent = months.slice(-windowSize)
  const map = new Map<string, number[]>()
  for (const m of recent) {
    for (const { category, total } of totalize(m.items)) {
      const key = category ?? '__null__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(total)
    }
  }
  return Array.from(map.entries()).map(([key, values]) => ({
    category: key === '__null__' ? null : key,
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  }))
}

export function computeInflationAlerts(
  currentItems: ItemSlim[],
  previousItems: ItemSlim[],
): InflationAlert[] {
  const prevMap = new Map(
    previousItems
      .filter(i => i.recurring && i.amount !== null && i.parentId === null)
      .map(i => [i.name, i.amount!]),
  )
  const alerts: InflationAlert[] = []
  for (const item of currentItems) {
    if (!item.recurring || item.amount === null || item.parentId !== null) continue
    const prev = prevMap.get(item.name)
    if (prev === undefined || prev === item.amount) continue
    alerts.push({
      name: item.name,
      currentAmount: item.amount,
      previousAmount: prev,
      changePct: Math.round(((item.amount - prev) / prev) * 100),
    })
  }
  return alerts
}

export type TypeTotal = {
  type: 'recurring' | 'subscription' | 'installment' | 'card' | 'one-time'
  total: number
}

const TYPE_ORDER: TypeTotal['type'][] = ['recurring', 'subscription', 'installment', 'card', 'one-time']

export function computeTypeTotals(items: ItemSlim[]): TypeTotal[] {
  const idIsCard = new Map(
    items.filter(i => i.parentId === null).map(i => [i.id, i.isCard]),
  )

  const map = new Map<string, number>()
  for (const item of items) {
    if (item.amount === null) continue
    if ((item.currency ?? 'ARS') === 'USD') continue

    let type: TypeTotal['type']
    if (item.parentId !== null) {
      if (!idIsCard.get(item.parentId)) continue
      type = 'card'
    } else {
      if (item.isCard) continue
      if (item.installmentTotal !== null) { type = 'installment' }
      else if (item.itemType === 'subscription') { type = 'subscription' }
      else if (item.itemType === 'recurring') { type = 'recurring' }
      else { type = 'one-time' }
    }
    map.set(type, (map.get(type) ?? 0) + item.amount)
  }
  return TYPE_ORDER.filter(t => map.has(t)).map(type => ({ type, total: map.get(type)! }))
}

export function computeUsdTypeTotals(items: ItemSlim[]): TypeTotal[] {
  const cardCurrencyMap = buildCardCurrencyMap(items)
  const idIsCard = new Map(
    items.filter(i => i.parentId === null).map(i => [i.id, i.isCard]),
  )
  const map = new Map<string, number>()
  for (const item of items) {
    if (item.amount === null) continue
    if (effectiveCurrency(item, cardCurrencyMap) !== 'USD') continue
    let type: TypeTotal['type']
    if (item.parentId !== null) {
      if (!idIsCard.get(item.parentId)) continue
      type = 'card'
    } else {
      if (item.isCard) continue
      if (item.installmentTotal !== null) { type = 'installment' }
      else if (item.itemType === 'subscription') { type = 'subscription' }
      else if (item.itemType === 'recurring') { type = 'recurring' }
      else { type = 'one-time' }
    }
    map.set(type, (map.get(type) ?? 0) + item.amount)
  }
  return TYPE_ORDER.filter(t => map.has(t)).map(type => ({ type, total: map.get(type)! }))
}

export function computeInstallmentOverview(items: ItemSlim[]): InstallmentSummary[] {
  const seen = new Set<string>()
  const result: InstallmentSummary[] = []
  for (const item of items) {
    if (
      item.installmentGroupId === null ||
      item.installmentTotal === null ||
      item.installmentNumber === null ||
      item.amount === null ||
      seen.has(item.installmentGroupId)
    ) continue
    seen.add(item.installmentGroupId)
    const remaining = item.installmentTotal - item.installmentNumber
    result.push({
      groupId: item.installmentGroupId,
      name: item.name,
      amountPerMonth: item.amount,
      currentPayment: item.installmentNumber,
      totalPayments: item.installmentTotal,
      paymentsRemaining: remaining,
      totalRemaining: remaining * item.amount,
    })
  }
  return result
}
