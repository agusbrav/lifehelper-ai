import { db } from './db'

export async function getRawLinksForEntities(
  userId: string,
  moduleId: string,
  entityIds: string[],
) {
  if (entityIds.length === 0) return []
  return db.moduleLink.findMany({
    where: {
      userId,
      OR: [
        { sourceModuleId: moduleId, sourceEntityId: { in: entityIds } },
        { targetModuleId: moduleId, targetEntityId: { in: entityIds } },
      ],
    },
  })
}

export async function createLink(
  userId: string,
  sourceModuleId: string,
  sourceEntityId: string,
  targetModuleId: string,
  targetEntityId: string,
): Promise<void> {
  await db.moduleLink.create({
    data: { userId, sourceModuleId, sourceEntityId, targetModuleId, targetEntityId },
  })
}

export async function deleteLink(userId: string, linkId: string): Promise<void> {
  await db.moduleLink.deleteMany({
    where: { id: linkId, userId },
  })
}
