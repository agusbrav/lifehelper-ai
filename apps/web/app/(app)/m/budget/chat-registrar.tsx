'use client'
import { useEffect } from 'react'
import { useSetChatContext } from '@/components/chat/chat-context'

export function ChatRegistrar({ year, month }: { year: number; month: number }) {
  const setContext = useSetChatContext()

  useEffect(() => {
    setContext({ module: 'budget', metadata: { year, month } })
    return () => setContext({ module: 'budget', metadata: {} })
  }, [year, month, setContext])

  return null
}
