'use client'
import { useEffect } from 'react'
import { writeSessionToken } from './session-storage'

export const SESSION_STORAGE_KEY = 'lh-session'

export function SessionSync() {
  useEffect(() => {
    // Request persistent storage so iOS is less likely to evict our IndexedDB data
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {})
    }

    // Read the token from the server (more reliable than document.cookie on iOS PWA)
    fetch('/api/auth/token')
      .then(r => (r.ok ? r.json() : null))
      .then((data: { token?: string } | null) => {
        if (data?.token) {
          writeSessionToken(data.token).catch(() => {
            try { localStorage.setItem(SESSION_STORAGE_KEY, data.token!) } catch { /* ignore */ }
          })
        }
      })
      .catch(() => {})
  }, [])

  return null
}
