'use client'
import { useRef, useState, useTransition } from 'react'
import { renameCardAction } from './actions'

type Props = { cardId: string; initialName: string }

export function RenameCardInput({ cardId, initialName }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialName)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit() {
    setEditing(false)
    const trimmed = value.trim()
    if (!trimmed || trimmed === initialName) { setValue(initialName); return }
    startTransition(() => renameCardAction(cardId, trimmed))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setValue(initialName); setEditing(false) }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="font-medium text-[var(--fg)] bg-transparent border-b border-[var(--accent)] outline-none w-full"
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      className="font-medium text-[var(--fg)] hover:text-[var(--accent)] transition-colors text-left w-full"
    >
      {value}
    </button>
  )
}
