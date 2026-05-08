import { db } from '@lifehelper/core'
import type { LinkableModule } from '@lifehelper/integrations'

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleString('en', { month: 'long', year: 'numeric' })
}

export const budgetLinkableModule: LinkableModule = {
  moduleId: 'budget',

  async getContexts(userId) {
    const months = await db.budgetMonth.findMany({
      where: { userId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { id: true, year: true, month: true },
    })
    return months.map(m => ({ id: m.id, label: monthLabel(m.year, m.month) }))
  },

  async search(userId, contextId, query) {
    const items = await db.budgetItem.findMany({
      where: {
        monthId: contextId,
        month: { userId },
        name: { contains: query, mode: 'insensitive' },
        isCard: false,
      },
      take: 10,
      select: { id: true, name: true, category: true },
    })
    return items.map(i => ({ entityId: i.id, label: i.name, sublabel: i.category ?? undefined }))
  },

  async resolve(userId, entityId) {
    const item = await db.budgetItem.findFirst({
      where: { id: entityId, month: { userId } },
      select: { name: true, month: { select: { year: true, month: true } } },
    })
    if (!item) return null
    const { year, month } = item.month
    return { label: item.name, url: `/m/budget?year=${year}&month=${month}` }
  },
}
