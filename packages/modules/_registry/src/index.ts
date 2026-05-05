import type { ModuleManifest } from './types'

export type { ModuleManifest, ModuleSkill } from './types'

// Register modules here by importing and adding their manifest.
// Each entry = one line. The shell reads this to build nav, routes, and context.
const modules: ModuleManifest[] = [
  // { ...expensesManifest },
]

export default modules
