import { getRawLinksForEntities } from '@lifehelper/core'
import { getLinkableModule } from '@lifehelper/integrations'

export type ResolvedLink = {
  linkId: string
  label: string
  url: string
}

export async function getLinksForItems(
  userId: string,
  moduleId: string,
  entityIds: string[],
): Promise<Record<string, ResolvedLink[]>> {
  if (entityIds.length === 0) return {}

  const rows = await getRawLinksForEntities(userId, moduleId, entityIds)
  const result: Record<string, ResolvedLink[]> = {}

  for (const row of rows) {
    const isSource = row.sourceModuleId === moduleId && entityIds.includes(row.sourceEntityId)
    const myEntityId = isSource ? row.sourceEntityId : row.targetEntityId
    const otherModuleId = isSource ? row.targetModuleId : row.sourceModuleId
    const otherEntityId = isSource ? row.targetEntityId : row.sourceEntityId

    const mod = getLinkableModule(otherModuleId)
    if (!mod) continue

    const resolved = await mod.resolve(userId, otherEntityId)
    if (!resolved) continue

    if (!result[myEntityId]) result[myEntityId] = []
    result[myEntityId]!.push({ linkId: row.id, label: resolved.label, url: resolved.url })
  }

  return result
}
