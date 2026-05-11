'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useChatContext } from '@/components/chat/chat-context'
import { sendChatMessage, getChatImportContext, type ChatMessage } from '@/app/(app)/chat-actions'
import { parseStatementAction, type ParsedTransaction } from '@/app/(app)/m/budget/config/parse-statement-action'
import { parseReceiptAction, type ParsedReceiptItem } from '@/app/(app)/m/budget/config/parse-receipt-action'
import { ChatImportPanel } from '@/components/budget/chat-import-panel'
import { ChatReceiptPanel } from '@/components/budget/chat-receipt-panel'
import Markdown from 'react-markdown'

const WELCOME_PROMPT =
  'Please greet me and share one specific data-driven insight about my spending this month.'

type SpinnerKey = 'spinnerAdding' | 'spinnerUpdating' | 'spinnerCreating' | 'spinnerChecking' | 'spinnerThinking' | 'spinnerAnalyzing'

type ImportFlow =
  | { type: 'statement'; transactions: ParsedTransaction[]; dueDate: string | null; cards: string[]; typeMap: Record<string, string>; hint: string }
  | { type: 'receipt'; items: ParsedReceiptItem[]; hint: string }

const SPINNER_PATTERNS: { pattern: RegExp; key: SpinnerKey }[] = [
  { pattern: /\b(add|agregar?|nueva?|nuevo|gasto)\b/i, key: 'spinnerAdding' },
  { pattern: /\b(update|cambi|modific|set|actuali)\b/i, key: 'spinnerUpdating' },
  { pattern: /\b(create|crear|nuevo mes|nueva? mes)\b/i, key: 'spinnerCreating' },
  { pattern: /\b(cuánto|cuanto|total|resumen|inflaci|summary|how much)\b/i, key: 'spinnerChecking' },
]

function getSpinnerKey(text: string): SpinnerKey {
  for (const { pattern, key } of SPINNER_PATTERNS) {
    if (pattern.test(text)) return key
  }
  return 'spinnerThinking'
}

export function ChatRail() {
  const { context } = useChatContext()
  const router = useRouter()
  const t = useTranslations('chat')

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [spinnerKey, setSpinnerKey] = useState<SpinnerKey>('spinnerThinking')
  const [loading, setLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [importFlow, setImportFlow] = useState<ImportFlow | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const importPanelRef = useRef<HTMLDivElement>(null)
  const welcomeSentRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isBudget = context.module === 'budget'
  const meta = context.metadata as { year?: number; month?: number }
  const storageKey = isBudget ? 'chat-budget' : null

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

  useEffect(() => {
    if (!importFlow) return
    importPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [importFlow])

  // Auto-open when entering budget module
  useEffect(() => {
    if (isBudget) setOpen(true)
  }, [isBudget])

  // Load history from sessionStorage when context changes
  useEffect(() => {
    if (!storageKey) {
      setMessages([])
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

  // Send welcome only on fresh sessions (no stored history)
  useEffect(() => {
    if (!open || !isBudget || welcomeSentRef.current) return
    welcomeSentRef.current = true
    send(WELCOME_PROMPT, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isBudget])

  // Persist messages to sessionStorage on every update
  useEffect(() => {
    if (!storageKey || messages.length === 0) return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages))
    } catch {}
  }, [messages, storageKey])


  async function send(text: string, hidden = false) {
    if (!isBudget || loading) return
    const userMessage: ChatMessage = { role: 'user', content: text }
    const historyForApi = [...messages, userMessage]
    if (!hidden) setMessages(prev => [...prev, userMessage])
    setSpinnerKey(hidden ? 'spinnerChecking' : getSpinnerKey(text))
    setLoading(true)
    try {
      const { message, mutated } = await sendChatMessage(historyForApi, context)
      setMessages(prev => [...prev, message])
      if (mutated) router.refresh()
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: t('errorGeneric') },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setAttachedFile(file)
    e.target.value = ''
  }

  async function triggerPdfImport(file: File, hint: string) {
    const userContent = hint ? `${hint}\n📎 ${file.name}` : `📎 ${file.name}`
    setMessages(prev => [...prev, { role: 'user', content: userContent }])
    setSpinnerKey('spinnerAnalyzing')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const [{ transactions, dueDate }, importCtx] = await Promise.all([
        parseStatementAction(fd),
        getChatImportContext(meta.year!, meta.month!),
      ])
      setImportFlow({ type: 'statement', transactions, dueDate, cards: importCtx.cards, typeMap: importCtx.typeMap, hint })
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('errorPdfParse') }])
    } finally {
      setLoading(false)
    }
  }

  async function triggerImageImport(file: File, hint: string) {
    const userContent = hint ? `${hint}\n📎 ${file.name}` : `📎 ${file.name}`
    setMessages(prev => [...prev, { role: 'user', content: userContent }])
    setSpinnerKey('spinnerAnalyzing')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const items = await parseReceiptAction(fd)
      setImportFlow({ type: 'receipt', items, hint })
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('errorPdfParse') }])
    } finally {
      setLoading(false)
    }
  }

  function handleSend() {
    if ((!input.trim() && !attachedFile) || loading || !isBudget) return
    const text = input.trim()
    const file = attachedFile
    setInput('')
    setAttachedFile(null)
    if (file?.type === 'application/pdf' && meta.year && meta.month) {
      triggerPdfImport(file, text)
      return
    }
    if (file && file.type.startsWith('image/') && meta.year && meta.month) {
      triggerImageImport(file, text)
      return
    }
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
                    : 'bg-[var(--accent-muted)] text-[var(--fg)]'
                }`}
              >
                <div className="prose prose-xs max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                  <Markdown>{m.content}</Markdown>
                </div>
              </div>
            ))}
            {importFlow?.type === 'statement' && (
              <div ref={importPanelRef}>
                <ChatImportPanel
                  transactions={importFlow.transactions}
                  dueDate={importFlow.dueDate}
                  cards={importFlow.cards}
                  typeMap={importFlow.typeMap}
                  year={meta.year!}
                  month={meta.month!}
                  hint={importFlow.hint}
                  onDone={(cardName, imported) => {
                    setImportFlow(null)
                    setMessages(prev => [...prev, {
                      role: 'assistant',
                      content: t('importSuccess', { count: imported, card: cardName }),
                    }])
                    router.refresh()
                  }}
                  onCancel={() => setImportFlow(null)}
                />
              </div>
            )}
            {importFlow?.type === 'receipt' && (
              <div ref={importPanelRef}>
                <ChatReceiptPanel
                  items={importFlow.items}
                  year={meta.year!}
                  month={meta.month!}
                  onDone={added => {
                    setImportFlow(null)
                    setMessages(prev => [...prev, {
                      role: 'assistant',
                      content: t('receiptImportSuccess', { count: added }),
                    }])
                    router.refresh()
                  }}
                  onCancel={() => setImportFlow(null)}
                />
              </div>
            )}
            {loading && (
              <div className="text-xs px-3 py-1.5 rounded-xl max-w-[80%] bg-[var(--accent-muted)] text-[var(--muted-fg)] flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                {t(spinnerKey)}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[var(--border)]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="sr-only"
            />
            {attachedFile && (
              <div className="flex items-center gap-1.5 px-3 pt-2">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted-fg)] flex-shrink-0">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                <span className="text-xs text-[var(--muted-fg)] truncate flex-1 max-w-[200px]">{attachedFile.name}</span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="text-[var(--muted-fg)] hover:text-rose-400 transition-colors text-xs leading-none flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label={t('attachLabel')}
                className="text-[var(--muted-fg)] hover:text-[var(--fg)] disabled:opacity-30 transition-colors flex-shrink-0"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
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
                disabled={(!input.trim() && !attachedFile) || !isBudget || loading}
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
        </div>
      )}
    </div>
  )
}
