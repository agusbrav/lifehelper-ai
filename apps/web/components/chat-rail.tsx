'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useChatContext } from '@/components/chat/chat-context'
import { sendChatMessage, type ChatMessage } from '@/app/(app)/chat-actions'
import Markdown from 'react-markdown'

const WELCOME_PROMPT =
  'Please greet me and share one specific data-driven insight about my spending this month.'

const SPINNER_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(add|agregar?|nueva?|nuevo|gasto)\b/i, label: 'Adding…' },
  { pattern: /\b(update|cambi|modific|set|actuali)\b/i, label: 'Updating…' },
  { pattern: /\b(create|crear|nuevo mes|nueva? mes)\b/i, label: 'Creating…' },
  { pattern: /\b(cuánto|cuanto|total|resumen|inflaci|summary|how much)\b/i, label: 'Checking…' },
]

function getSpinnerLabel(text: string): string {
  for (const { pattern, label } of SPINNER_PATTERNS) {
    if (pattern.test(text)) return label
  }
  return 'Thinking…'
}

export function ChatRail() {
  const { context } = useChatContext()
  const router = useRouter()
  const t = useTranslations('chat')

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [spinnerLabel, setSpinnerLabel] = useState('Thinking…')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const welcomeSentRef = useRef(false)

  const isBudget = context.module === 'budget'
  const meta = context.metadata as { year?: number; month?: number }
  const storageKey =
    isBudget && meta.year && meta.month ? `chat-budget-${meta.year}-${meta.month}` : null

  const monthLabel =
    isBudget && meta.year && meta.month
      ? new Date(meta.year, meta.month - 1, 1).toLocaleString(undefined, {
          month: 'long',
          year: 'numeric',
        })
      : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-open when entering budget module
  useEffect(() => {
    if (isBudget) setOpen(true)
  }, [isBudget])

  // Load history from sessionStorage when context changes; skip welcome if history exists
  useEffect(() => {
    if (!storageKey) {
      setMessages([])
      welcomeSentRef.current = false
      return
    }
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        setMessages(JSON.parse(stored) as ChatMessage[])
        welcomeSentRef.current = true
      } else {
        setMessages([])
        welcomeSentRef.current = false
      }
    } catch {
      setMessages([])
      welcomeSentRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Persist messages to sessionStorage on every update
  useEffect(() => {
    if (!storageKey || messages.length === 0) return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages))
    } catch {}
  }, [messages, storageKey])

  useEffect(() => {
    if (!open || !isBudget || welcomeSentRef.current) return
    welcomeSentRef.current = true
    send(WELCOME_PROMPT, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isBudget])

  async function send(text: string, hidden = false) {
    if (!isBudget || loading) return
    const userMessage: ChatMessage = { role: 'user', content: text }
    const historyForApi = [...messages, userMessage]
    if (!hidden) setMessages(prev => [...prev, userMessage])
    setSpinnerLabel(hidden ? 'Checking…' : getSpinnerLabel(text))
    setLoading(true)
    try {
      const { message, mutated } = await sendChatMessage(historyForApi, context)
      setMessages(prev => [...prev, message])
      if (mutated) router.refresh()
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleSend() {
    if (!input.trim() || loading || !isBudget) return
    const text = input.trim()
    setInput('')
    send(text)
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--card-bg)]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center h-5 text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors"
        aria-label={open ? t('collapseChat') : t('expandChat')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col h-[40dvh]">
          {monthLabel && (
            <div className="px-4 py-2 border-b border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--fg)]">
                Assistant · {monthLabel}
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs px-3 py-1.5 rounded-xl max-w-[80%] ${
                  m.role === 'user'
                    ? 'ml-auto bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'bg-[var(--muted)] text-[var(--fg)]'
                }`}
              >
                <div className="prose prose-xs max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                  <Markdown>{m.content}</Markdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs px-3 py-1.5 rounded-xl max-w-[80%] bg-[var(--muted)] text-[var(--muted-fg)] flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                {spinnerLabel}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)]">
            <input
              type="text"
              aria-label={t('inputLabel')}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isBudget ? t('placeholder') : t('dashboardHint')}
              disabled={!isBudget || loading}
              className="flex-1 text-sm bg-transparent outline-none text-[var(--fg)] placeholder:text-[var(--muted-fg)] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isBudget || loading}
              aria-label={t('sendLabel')}
              className="text-[var(--accent)] hover:opacity-80 disabled:opacity-30 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
