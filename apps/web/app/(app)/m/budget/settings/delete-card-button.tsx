'use client'
import { useTransition } from 'react'
import { removeCardAction } from './actions'

type Props = { cardId: string; cardName: string; label: string; confirm: string }

export function DeleteCardButton({ cardId, cardName, label, confirm }: Props) {
  const [, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(confirm.replace('{name}', cardName))) return
    startTransition(() => removeCardAction(cardId))
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs text-[var(--muted-fg)] hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
    >
      {label}
    </button>
  )
}
