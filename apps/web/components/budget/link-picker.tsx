'use client'
import { useState, useEffect, useTransition } from 'react'
import {
  getLinkableModulesAction,
  getLinkContextsAction,
  searchLinkableAction,
  createLinkAction,
} from '@/app/(app)/m/budget/actions'

type Step = 'module' | 'context' | 'search'
type ContextOption = { id: string; label: string }
type SearchResult = { entityId: string; label: string; sublabel?: string }

type Props = {
  sourceModuleId: string
  sourceEntityId: string
  onDone: () => void
}

export function LinkPicker({ sourceModuleId, sourceEntityId, onDone }: Props) {
  const [step, setStep] = useState<Step>('module')
  const [query, setQuery] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [selectedContextId, setSelectedContextId] = useState('')
  const [modules, setModules] = useState<string[]>([])
  const [contexts, setContexts] = useState<ContextOption[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [, startTransition] = useTransition()

  useEffect(() => {
    getLinkableModulesAction().then(setModules)
  }, [])

  useEffect(() => {
    if (step !== 'context' || !selectedModuleId) return
    getLinkContextsAction(selectedModuleId).then(setContexts)
  }, [step, selectedModuleId])

  useEffect(() => {
    if (step !== 'search' || !selectedContextId) return
    const timer = setTimeout(() => {
      searchLinkableAction(selectedModuleId, selectedContextId, query).then(setResults)
    }, 200)
    return () => clearTimeout(timer)
  }, [step, selectedModuleId, selectedContextId, query])

  function selectModule(moduleId: string) {
    setSelectedModuleId(moduleId)
    setQuery('')
    setStep('context')
  }

  function selectContext(ctx: ContextOption) {
    setSelectedContextId(ctx.id)
    setQuery('')
    setStep('search')
  }

  function selectResult(result: SearchResult) {
    startTransition(async () => {
      await createLinkAction(sourceModuleId, sourceEntityId, selectedModuleId, result.entityId)
      onDone()
    })
  }

  const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-400 min-w-0'
  const pathPrefix = step === 'module' ? '' : `@${selectedModuleId}/`

  return (
    <div
      className="flex flex-col gap-2 max-w-sm"
    >
      <div className="flex items-center gap-1.5 text-xs text-[var(--muted-fg)]">
        {pathPrefix && <span className="text-indigo-400 font-mono">{pathPrefix}</span>}
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onDone() }}
          placeholder={
            step === 'module' ? 'module name...' :
            step === 'context' ? 'context...' :
            'search...'
          }
          className={inputCls}
        />
        <button
          type="button"
          onClick={onDone}
          className="text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors flex-shrink-0"
        >
          cancel
        </button>
      </div>

      {step === 'module' && modules.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] overflow-hidden text-sm">
          {modules
            .filter(m => !query || m.toLowerCase().includes(query.toLowerCase()))
            .map(m => (
              <button
                key={m}
                type="button"
                onClick={() => selectModule(m)}
                className="w-full text-left px-3 py-1.5 text-[var(--fg)] hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors border-b border-[var(--border)] last:border-b-0"
              >
                @{m}
              </button>
            ))}
        </div>
      )}

      {step === 'context' && contexts.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] overflow-hidden text-sm">
          {contexts
            .filter(c => !query || c.label.toLowerCase().includes(query.toLowerCase()))
            .map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectContext(c)}
                className="w-full text-left px-3 py-1.5 text-[var(--fg)] hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors border-b border-[var(--border)] last:border-b-0"
              >
                {c.label}
              </button>
            ))}
        </div>
      )}

      {step === 'search' && results.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] overflow-hidden text-sm">
          {results.map(r => (
            <button
              key={r.entityId}
              type="button"
              onClick={() => selectResult(r)}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors border-b border-[var(--border)] last:border-b-0"
            >
              <span className="text-[var(--fg)]">{r.label}</span>
              {r.sublabel && (
                <span className="text-[var(--muted-fg)] text-xs ml-2">{r.sublabel}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {step === 'search' && results.length === 0 && query && (
        <p className="text-xs text-[var(--muted-fg)] px-1">No results for &quot;{query}&quot;</p>
      )}
    </div>
  )
}
