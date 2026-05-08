'use client'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type ChatContext = {
  module: string | null
  metadata: Record<string, unknown>
}

type ChatContextValue = {
  context: ChatContext
  setContext: (ctx: ChatContext) => void
}

const ChatContextCtx = createContext<ChatContextValue>({
  context: { module: null, metadata: {} },
  setContext: () => {},
})

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<ChatContext>({ module: null, metadata: {} })
  const setContext = useCallback((ctx: ChatContext) => setContextState(ctx), [])
  return (
    <ChatContextCtx.Provider value={{ context, setContext }}>
      {children}
    </ChatContextCtx.Provider>
  )
}

export function useChatContext() {
  return useContext(ChatContextCtx)
}

export function useSetChatContext() {
  return useContext(ChatContextCtx).setContext
}
