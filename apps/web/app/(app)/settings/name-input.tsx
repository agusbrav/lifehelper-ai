'use client'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { setUserNameAction } from './actions'

export function NameInput({ currentName }: { currentName: string | null }) {
  const t = useTranslations('settings')
  const [value, setValue] = useState(currentName ?? '')
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await setUserNameAction(value)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        placeholder={t('yourNamePlaceholder')}
        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] min-w-0"
      />
      <button
        onClick={handleSave}
        className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {saved ? '✓' : t('save')}
      </button>
    </div>
  )
}
