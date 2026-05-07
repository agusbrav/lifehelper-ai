import { db } from '@lifehelper/core'

export type CardRecord = {
  id: string
  userId: string
  name: string
  category: string | null
  createdAt: Date
}

export async function getCardsForUser(userId: string): Promise<CardRecord[]> {
  return db.card.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function addCard(input: { userId: string; name: string }): Promise<CardRecord> {
  return db.card.create({
    data: {
      userId: input.userId,
      name: input.name,
      category: 'tarjetas',
    },
  })
}

export async function renameCard(input: { userId: string; cardId: string; name: string }): Promise<void> {
  const card = await db.card.findUnique({ where: { id: input.cardId } })
  if (!card || card.userId !== input.userId) throw new Error('Forbidden')
  await db.card.update({ where: { id: input.cardId }, data: { name: input.name } })
}

export async function removeCard(input: { userId: string; cardId: string }): Promise<void> {
  const card = await db.card.findUnique({ where: { id: input.cardId } })
  if (!card || card.userId !== input.userId) throw new Error('Forbidden')
  await db.card.delete({ where: { id: input.cardId } })
}
