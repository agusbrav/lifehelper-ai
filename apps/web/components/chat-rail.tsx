'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

type ChatMessage = { role: 'user' | 'assistant'; text: string }

export function ChatRail() {
  const pathname = usePathname()
  const context = pathname.startsWith('/m/') ? 'pocket' : 'dashboard'

  const [open, setOpen] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])

  function handleSend() {
    if (!input.trim()) return
    setMessages(prev => [
      ...prev,
      { role: 'user', text: input },
      { role: 'assistant', text: 'AI responses coming soon.' },
    ])
    setInput('')
  }

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center h-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        aria-label={open ? 'Collapse chat' : 'Expand chat'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col h-[180px]">
          <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
            {messages.length === 0 && (
              <p className="text-xs text-zinc-400 mt-auto">
                {context === 'dashboard'
                  ? 'Try: "add an expenses pocket"'
                  : 'Ask me anything or say "undo" to reverse your last change.'}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs px-3 py-1.5 rounded-lg max-w-[80%] ${
                  m.role === 'user'
                    ? 'ml-auto bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-100 dark:border-zinc-800">
            <input
              type="text"
              aria-label="Chat input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 text-sm bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send"
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
