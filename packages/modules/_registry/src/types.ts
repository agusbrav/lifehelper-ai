export type ModuleTool = {
  id: string
  consumesContext: string[]
}

export type ModuleManifest = {
  id: string
  name: string
  icon: string
  exposesContext: boolean
  accepts: string[]           // module IDs that can contribute data to this module via bridges
  interactionTier: 1 | 2 | 3
  tools: ModuleTool[]
  systemPrompt?: string
}
