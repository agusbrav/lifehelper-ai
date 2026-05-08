'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSetChatContext } from '@/components/chat/chat-context'

export function ChatRegistrar() {
  const setContext = useSetChatContext()
  const searchParams = useSearchParams()

  const now = new Date()
  const year = parseInt(searchParams.get('year') ?? '') || now.getFullYear()
  const month = parseInt(searchParams.get('month') ?? '') || now.getMonth() + 1

  useEffect(() => {
    setContext({ module: 'budget', metadata: { year, month } })
    return () => setContext({ module: null, metadata: {} })
  }, [year, month, setContext])

  return null
}
