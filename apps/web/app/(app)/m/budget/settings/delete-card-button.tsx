'use client'
import { useState, useTransition } from 'react'
import { removeCardAction } from './actions'
import { ConfirmDialog } from '@/components/confirm-dialog'

type Props = { cardId: string; cardName: string; label: string; confirm: string; removeHint: string }

export function DeleteCardButton({ cardId, cardName, label, confirm, removeHint }: Props) {
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState(false)

  return (
    <>
      <button
        onClick={() => setPending(true)}
        className="text-xs text-[var(--muted-fg)] hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
      >
        {label}
      </button>

      {pending && (
        <ConfirmDialog
          message={confirm.replace('{name}', cardName)}
          detail={removeHint}
          confirmLabel={label}
          danger
          onConfirm={() => {
            startTransition(() => removeCardAction(cardId))
            setPending(false)
          }}
          onCancel={() => setPending(false)}
        />
      )}
    </>
  )
}
