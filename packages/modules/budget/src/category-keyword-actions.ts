import { db } from '@lifehelper/core'

export type CategoryKeywordRecord = {
  id: string
  keyword: string
  category: string
}

export async function getCategoryKeywords(userId: string): Promise<CategoryKeywordRecord[]> {
  return db.categoryKeyword.findMany({
    where: { userId },
    select: { id: true, keyword: true, category: true },
    orderBy: [{ category: 'asc' }, { keyword: 'asc' }],
  })
}

export async function addCategoryKeyword(input: {
  userId: string
  keyword: string
  category: string
}): Promise<void> {
  const keyword = input.keyword.toLowerCase().trim()
  const category = input.category.toLowerCase().trim()
  if (!keyword || !category) return
  await db.categoryKeyword.upsert({
    where: { userId_keyword: { userId: input.userId, keyword } },
    create: { userId: input.userId, keyword, category },
    update: { category },
  })
}

export async function removeCategoryKeyword(input: {
  userId: string
  keywordId: string
}): Promise<void> {
  const record = await db.categoryKeyword.findUnique({ where: { id: input.keywordId } })
  if (!record || record.userId !== input.userId) throw new Error('Forbidden')
  await db.categoryKeyword.delete({ where: { id: input.keywordId } })
}
