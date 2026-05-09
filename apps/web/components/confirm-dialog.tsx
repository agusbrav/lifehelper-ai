'use client'

type Props = {
  message: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  message,
  detail,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-xs rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl px-6 py-6 flex flex-col items-center gap-4 text-center">

        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
          danger ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'
        }`}>
          {danger ? '⚠' : '⚠'}
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-[var(--fg)] leading-snug">{message}</p>
          {detail && <p className="text-xs text-[var(--muted-fg)] leading-snug">{detail}</p>}
        </div>

        <div className="flex gap-2 w-full pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] border border-[var(--border)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity ${
              danger ? 'bg-rose-500 text-white' : 'bg-[var(--accent)] text-[var(--accent-fg)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
