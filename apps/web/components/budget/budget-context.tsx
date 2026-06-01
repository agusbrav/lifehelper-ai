'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'

type BudgetContextValue = {
  configOpen: boolean
  setConfigOpen: (open: boolean) => void
}

const BudgetCtx = createContext<BudgetContextValue>({
  configOpen: false,
  setConfigOpen: () => {},
})

export function BudgetContextProvider({ children }: { children: ReactNode }) {
  const [configOpen, setConfigOpen] = useState(false)
  return (
    <BudgetCtx.Provider value={{ configOpen, setConfigOpen }}>
      {children}
    </BudgetCtx.Provider>
  )
}

export function useBudgetContext() {
  return useContext(BudgetCtx)
}
