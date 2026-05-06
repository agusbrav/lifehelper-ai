import type { ModuleManifest } from './types'
import { manifest as budgetManifest } from '@lifehelper/budget'

export type { ModuleManifest, ModuleTool } from './types'

const modules: ModuleManifest[] = [
  budgetManifest,
]

export default modules
