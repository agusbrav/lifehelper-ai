// ModuleManifest type is inlined here to avoid a circular dependency:
// @lifehelper/registry imports @lifehelper/budget, so @lifehelper/budget
// must NOT import @lifehelper/registry.
type ModuleTool = {
  id: string
  consumesContext: string[]
}

type ModuleManifest = {
  id: string
  name: string
  icon: string
  exposesContext: boolean
  accepts: string[]
  interactionTier: 1 | 2 | 3
  tools: ModuleTool[]
  systemPrompt?: string
}

export const manifest: ModuleManifest = {
  id: 'budget',
  name: 'Monthly Budget',
  icon: 'wallet',
  exposesContext: true,
  accepts: [],   // future: ['shared_expenses', 'trips'] — add as those modules are built
  interactionTier: 1,
  tools: [
    { id: 'add_expense', consumesContext: [] },
    { id: 'add_installment', consumesContext: [] },
    { id: 'set_amount', consumesContext: [] },
    { id: 'mark_paid', consumesContext: [] },
    { id: 'add_month', consumesContext: [] },
    { id: 'get_summary', consumesContext: [] },
    { id: 'get_inflation_report', consumesContext: [] },
  ],
}
