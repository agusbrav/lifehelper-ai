'use client'
import { useEffect, type ReactNode } from 'react'
import { readSessionToken, clearSessionToken } from './session-storage'
import { SESSION_STORAGE_KEY } from './session-sync'

async function getStoredToken(): Promise<string | null> {
  try {
    const token = await readSessionToken()
    if (token) return token
  } catch { /* fall through to localStorage */ }
  try { return localStorage.getItem(SESSION_STORAGE_KEY) } catch { return null }
}

export function SessionRestoreGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    getStoredToken().then(token => {
      if (!token) { clearTimeout(timer); return }

      fetch('/api/auth/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        signal: controller.signal,
      })
        .then(r => {
          clearTimeout(timer)
          if (r.ok) {
            window.location.replace('/dashboard')
          } else {
            clearSessionToken().catch(() => {})
            try { localStorage.removeItem(SESSION_STORAGE_KEY) } catch { /* ignore */ }
          }
        })
        .catch(() => clearTimeout(timer))
    }).catch(() => clearTimeout(timer))
  }, [])

  return <>{children}</>
}
