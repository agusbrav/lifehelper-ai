'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PasswordInput } from '@/components/password-input'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = e.currentTarget
    const formEntries = new FormData(form)
    const email = formEntries.get('email') as string
    const password = formEntries.get('password') as string
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        window.location.href = '/dashboard'
        return
      }
      const body = await res.json() as { error?: string }
      setError(body.error ?? 'Login failed')
    } catch {
      setError('Network error — check your connection')
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-8">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-[var(--accent-fg)] font-bold text-lg mb-4">
          L
        </div>
        <h1 className="text-2xl font-semibold text-[var(--fg)]">{t('loginTitle')}</h1>
        <p className="text-sm text-[var(--muted-fg)] mt-1">{t('loginSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        {error && (
          <p className="text-sm text-[var(--error-fg)] bg-[var(--error-bg)] border border-[var(--error-fg)] border-opacity-20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity mt-1"
        >
          {loading ? t('signingIn') : t('signIn')}
        </button>
      </form>
      <p className="mt-6 text-sm text-center text-[var(--muted-fg)]">
        {t('noAccount')}{' '}
        <Link href="/register" className="text-[var(--accent)] font-medium hover:opacity-80">
          {t('register')}
        </Link>
      </p>
    </div>
  )
}
