'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function AnalyticsConfigPanel() {
  const t = useTranslations('budget')
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--border)] transition-colors"
        title={t('configTitle')}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
          <path fillRule="evenodd" d="M8 0a1 1 0 0 1 .97.757l.49 1.938a5.52 5.52 0 0 1 1.168.675l1.904-.604a1 1 0 0 1 1.146.48l1 1.732a1 1 0 0 1-.217 1.248l-1.505 1.257c.03.239.044.48.044.717s-.015.478-.044.717l1.505 1.257a1 1 0 0 1 .217 1.248l-1 1.732a1 1 0 0 1-1.146.48l-1.904-.604a5.52 5.52 0 0 1-1.168.675L8.97 15.243A1 1 0 0 1 7.03 15.243l-.49-1.938a5.52 5.52 0 0 1-1.168-.675l-1.904.604a1 1 0 0 1-1.146-.48l-1-1.732a1 1 0 0 1 .217-1.248l1.505-1.257A5.48 5.48 0 0 1 2 8c0-.237.015-.478.044-.717L.539 6.026a1 1 0 0 1-.217-1.248l1-1.732a1 1 0 0 1 1.146-.48l1.904.604A5.52 5.52 0 0 1 5.54 2.495L6.03.757A1 1 0 0 1 8 0Zm0 4a4 4 0 1 0 0 8A4 4 0 0 0 8 4Z"/>
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--fg)]">{t('configTitle')}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-10 text-center text-sm text-[var(--muted-fg)]">
              Analytics settings coming soon.
            </div>
          </div>
        </div>
      )}
    </>
  )
}
