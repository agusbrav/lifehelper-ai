export type LinkContext = { id: string; label: string }
export type LinkSearchResult = { entityId: string; label: string; sublabel?: string }
export type LinkResolveResult = { label: string; url: string }

export interface LinkableModule {
  moduleId: string
  getContexts(userId: string): Promise<LinkContext[]>
  search(userId: string, contextId: string, query: string): Promise<LinkSearchResult[]>
  resolve(userId: string, entityId: string): Promise<LinkResolveResult | null>
}

const registry = new Map<string, LinkableModule>()

export function registerLinkableModule(mod: LinkableModule): void {
  registry.set(mod.moduleId, mod)
}

export function getLinkableModule(id: string): LinkableModule | undefined {
  return registry.get(id)
}

export function getLinkableModuleIds(): string[] {
  return [...registry.keys()]
}
