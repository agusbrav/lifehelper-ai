import type { ModuleBridge, ModuleContext, ModuleContribution } from './types'

const bridges: ModuleBridge[] = []

export function registerBridge(bridge: ModuleBridge): void {
  bridges.push(bridge)
}

export async function resolveContributions(
  targetModuleId: string,
  userId: string,
  context: ModuleContext,
): Promise<ModuleContribution[]> {
  const relevant = bridges.filter(b => b.targetModuleId === targetModuleId)
  const results: ModuleContribution[] = []
  for (const bridge of relevant) {
    try {
      const exported = await bridge.getExportable(userId, context)
      results.push(bridge.translate(exported, context))
    } catch {
      // one failing bridge should not block the whole month from loading
    }
  }
  return results
}
