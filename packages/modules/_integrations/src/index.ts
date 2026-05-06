// No bridges registered yet.
// When a new module (e.g. trips) is built that contributes to budget, add it here:
//   import { tripsToBudgetBridge } from './bridges/trips-to-budget'
//   registerBridge(tripsToBudgetBridge)

export { registerBridge, resolveContributions } from './registry'
export type {
  ModuleBridge,
  ModuleContribution,
  ContributedItem,
  ContributedAction,
  ModuleContext,
  ModuleExport,
  ModuleExporter,
} from './types'
