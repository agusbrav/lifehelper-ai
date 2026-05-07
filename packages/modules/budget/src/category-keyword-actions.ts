import { db } from '@lifehelper/core'
import { CATEGORY_SEEDS } from './category-seeds'

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

const SEED_MARKER = '__seeded_v1__'

// Seeds all CATEGORY_SEEDS (excluding 'tarjetas') as the user's default keyword rules.
// Uses a marker record to run only once per user; existing user records are never overwritten.
export async function seedDefaultCategoryKeywords(userId: string): Promise<void> {
  const marker = await db.categoryKeyword.findUnique({
    where: { userId_keyword: { userId, keyword: SEED_MARKER } },
  })
  if (marker) return

  const defaults = Object.entries(CATEGORY_SEEDS)
    .filter(([, cat]) => cat !== 'tarjetas')
    .map(([keyword, category]) => ({ userId, keyword, category }))

  await db.categoryKeyword.createMany({
    data: [...defaults, { userId, keyword: SEED_MARKER, category: 'system' }],
    skipDuplicates: true,
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
