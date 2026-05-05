'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PasswordInput } from '@/components/password-input'

export default function RegisterPage() {
  const router = useRouter()
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
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
      }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/dashboard')
    } else {
      const body = await res.json() as { error?: string }
      setError(body.error ?? 'Registration failed')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-zinc-900 dark:text-zinc-50">Create account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-zinc-700 dark:text-zinc-300" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-zinc-700 dark:text-zinc-300" htmlFor="password">
            Password <span className="text-zinc-400">(min 8 chars)</span>
          </label>
          <PasswordInput id="password" name="password" required minLength={8} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-500">
        Already registered?{' '}
        <Link href="/login" className="text-zinc-900 dark:text-zinc-100 underline">Sign in</Link>
      </p>
    </div>
  )
}
