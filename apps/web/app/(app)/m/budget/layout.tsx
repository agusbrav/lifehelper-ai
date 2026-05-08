import { BudgetModuleRegistrar } from './budget-module-registrar'

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BudgetModuleRegistrar />
      {children}
    </>
  )
}
