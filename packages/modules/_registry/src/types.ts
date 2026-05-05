export type ModuleTool = {
  id: string
  consumesContext: string[]
}

export type ModuleManifest = {
  id: string
  name: string
  icon: string
  exposesContext: boolean
  consumesContext: string[]
  interactionTier: 1 | 2 | 3
  tools: ModuleTool[]
  systemPrompt?: string
}
