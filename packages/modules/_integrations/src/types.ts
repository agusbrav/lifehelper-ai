export type ModuleContext = {
  year?: number
  month?: number
  [key: string]: unknown
}

export type ModuleExport = {
  moduleId: string
  data: unknown
}

export interface ModuleExporter {
  getExportable(userId: string, context: ModuleContext): Promise<ModuleExport>
}

export type ContributedItem = {
  id: string
  sourceModuleId: string
  label: string
  amount?: number
  category?: string
  date?: Date
  metadata: Record<string, unknown>
}

export type ContributedAction = {
  id: string
  label: string
  payload: Record<string, unknown>
}

export type ModuleContribution = {
  sourceModuleId: string
  items: ContributedItem[]
  actions: ContributedAction[]
}

export type ModuleBridge = {
  sourceModuleId: string
  targetModuleId: string
  getExportable: (userId: string, context: ModuleContext) => Promise<ModuleExport>
  translate(exported: ModuleExport, context: ModuleContext): ModuleContribution
}
