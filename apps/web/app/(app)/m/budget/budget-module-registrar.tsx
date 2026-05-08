'use client'
import { useEffect } from 'react'
import { useSetChatContext } from '@/components/chat/chat-context'

export function BudgetModuleRegistrar() {
  const setContext = useSetChatContext()
  useEffect(() => {
    setContext({ module: 'budget', metadata: {} })
    return () => setContext({ module: null, metadata: {} })
  }, [setContext])
  return null
}
