'use server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getSession } from '@lifehelper/core'
import { addCategoryKeyword, removeCategoryKeyword } from '@lifehelper/budget'

async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session.user.id
}

export async function addCategoryKeywordAction(keyword: string, category: string) {
  const userId = await getUserId()
  await addCategoryKeyword({ userId, keyword, category })
  revalidatePath('/m/budget')
}

export async function removeCategoryKeywordAction(keywordId: string) {
  const userId = await getUserId()
  await removeCategoryKeyword({ userId, keywordId })
  revalidatePath('/m/budget')
}
