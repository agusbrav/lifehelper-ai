import { ChatRegistrar } from './chat-registrar'

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ChatRegistrar />
      {children}
    </>
  )
}
