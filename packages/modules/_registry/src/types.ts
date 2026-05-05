export type ModuleSkill = {
  id: string
  name: string
  description: string
  consumesContext: string[]
}

export type ModuleManifest = {
  id: string
  name: string
  icon: string
  exposesContext: boolean
  consumesContext: string[]
  interactionTier: 1 | 2 | 3
  skills: ModuleSkill[]
}
