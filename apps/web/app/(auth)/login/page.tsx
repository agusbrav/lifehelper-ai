'use client'
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PasswordInput } from '@/components/password-input'
import { loginAction } from './actions'
import { SessionRestoreGate } from '@/components/session-restore-gate'
import { writeSessionToken } from '@/components/session-storage'
import { SESSION_STORAGE_KEY } from '@/components/session-sync'

function SubmitButton() {
  const t = useTranslations('auth')
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity mt-1"
    >
      {pending ? t('signingIn') : t('signIn')}
    </button>
  )
}

export default function LoginPage() {
  const t = useTranslations('auth')
  const [state, action] = useActionState(loginAction, null)

  useEffect(() => {
    if (!state || !('token' in state)) return
    const { token } = state
    try { localStorage.setItem(SESSION_STORAGE_KEY, token) } catch { /* ignore */ }
    writeSessionToken(token).catch(() => {})
    window.location.replace('/dashboard')
  }, [state])

  return (
    <SessionRestoreGate>
    <div>
      <div className="mb-8">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-[var(--accent-fg)] font-bold text-lg mb-4">
          L
        </div>
        <h1 className="text-2xl font-semibold text-[var(--fg)]">{t('loginTitle')}</h1>
        <p className="text-sm text-[var(--muted-fg)] mt-1">{t('loginSubtitle')}</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--fg)]" htmlFor="email">
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="text"
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] text-[var(--fg)] px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--muted-fg)] transition-shadow"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--fg)]" htmlFor="password">
            {t('password')}
          </label>
          <PasswordInput id="password" name="password" required />
        </div>
        {'error' in (state ?? {}) && (
          <p className="text-sm text-[var(--error-fg)] bg-[var(--error-bg)] border border-[var(--error-fg)] border-opacity-20 rounded-lg px-3 py-2">
            {(state as { error: string }).error}
          </p>
        )}
        <SubmitButton />
      </form>
      <p className="mt-6 text-sm text-center text-[var(--muted-fg)]">
        {t('noAccount')}{' '}
        <Link href="/register" className="text-[var(--accent)] font-medium hover:opacity-80">
          {t('register')}
        </Link>
      </p>
    </div>
    </SessionRestoreGate>
  )
}
