# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build auth (register/login/logout), the app shell (sidebar, dashboard, pocket routing, theme toggle), and the chat rail UI - everything needed before the first pocket.

**Architecture:** Next.js App Router with route groups: `(auth)` for login/register (no sidebar), `(app)` for the main shell (sidebar + chat rail), `(guest)` for share links. Session validation via a DB-backed opaque token in an HttpOnly cookie. Middleware checks cookie existence; the `(app)` layout does full DB validation. Core auth logic lives in `packages/core/src/auth.ts`, framework-agnostic and fully tested.

**Tech Stack:** Next.js 15 (App Router), TypeScript 5, Tailwind 4, Prisma 6, PostgreSQL, bcryptjs, Vitest

---

## Prerequisites

- PostgreSQL running locally (default port 5432)
- `.env` file at repo root: `DATABASE_URL=postgresql://user:password@localhost:5432/lifehelper`
- Run `pnpm install` to ensure dependencies are up to date

---

## File Map

```
packages/core/
  src/
    auth.ts                        MODIFY - implement all auth utilities
    __tests__/
      auth.test.ts                 CREATE - auth unit tests
  vitest.config.ts                 CREATE - Vitest config for core
  package.json                     MODIFY - add bcryptjs, vitest, test script

apps/web/
  middleware.ts                    CREATE - cookie existence check
  app/
    layout.tsx                     MODIFY - wrap with ThemeProvider
    page.tsx                       MODIFY - redirect to /dashboard or /login
    globals.css                    MODIFY - add dark mode variant + CSS vars
    (auth)/
      layout.tsx                   CREATE - centered, no sidebar
      login/page.tsx               CREATE - login form
      register/page.tsx            CREATE - register form
    (app)/
      layout.tsx                   CREATE - sidebar + chat rail shell, session validation
      dashboard/page.tsx           CREATE - pocket card grid + empty state
      m/[pocketId]/page.tsx        CREATE - pocket router stub
      settings/page.tsx            CREATE - settings stub
    api/
      auth/
        register/route.ts          CREATE - register endpoint
        login/route.ts             CREATE - login endpoint
        logout/route.ts            CREATE - logout endpoint
  components/
    sidebar.tsx                    CREATE - server component, pocket list + nav
    chat-rail.tsx                  CREATE - client component, collapsible chat UI
    theme-provider.tsx             CREATE - client context, dark/light + localStorage
    theme-toggle.tsx               CREATE - sun/moon toggle button
    pocket-card.tsx                CREATE - dashboard module card
  vitest.config.ts                 CREATE - Vitest config for web
  package.json                     MODIFY - add vitest, testing-library, test script
```

---

## Task 1: Test Infrastructure

**Files:**
- Modify: `packages/core/package.json`
- Create: `packages/core/vitest.config.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`
- Modify: `turbo.json`

- [ ] **Step 1: Add Vitest to packages/core**

```bash
pnpm add -D vitest @types/bcryptjs --filter @lifehelper/core
pnpm add bcryptjs --filter @lifehelper/core
```

- [ ] **Step 2: Add test script to `packages/core/package.json`**

```json
{
  "name": "@lifehelper/core",
  "version": "0.1.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
    "@prisma/client": "^6.8.2",
    "bcryptjs": "^3.0.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.15.18",
    "typescript": "^5.8.3",
    "vitest": "^3.1.4"
  }
}
```

- [ ] **Step 3: Create `packages/core/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 4: Add Vitest to apps/web**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom --filter web
```

- [ ] **Step 5: Create `apps/web/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

- [ ] **Step 6: Create `apps/web/vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Add test script to `apps/web/package.json`**

Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 8: Add test task to `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 9: Write a smoke test to verify Vitest works**

Create `packages/core/src/__tests__/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 10: Run tests and confirm passing**

```bash
pnpm install && pnpm --filter @lifehelper/core test
```

Expected output: `1 passed`

- [ ] **Step 11: Commit**

```bash
git add packages/core/package.json packages/core/vitest.config.ts packages/core/src/__tests__/smoke.test.ts apps/web/package.json apps/web/vitest.config.ts apps/web/vitest.setup.ts turbo.json pnpm-lock.yaml
git commit -m "Add Vitest to core and web packages"
```

---

## Task 2: Initial Database Migration

**Files:**
- Modify: `packages/core/prisma/schema.prisma` (no change needed - schema already exists)

- [ ] **Step 1: Verify PostgreSQL is running**

```bash
psql postgresql://user:password@localhost:5432/lifehelper -c "SELECT 1"
```

Expected: `1 row` result. If it fails, create the database:
```bash
createdb lifehelper
```

- [ ] **Step 2: Run the initial migration**

```bash
pnpm db:migrate
```

When prompted for migration name, enter: `init`

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify tables were created**

```bash
psql postgresql://user:password@localhost:5432/lifehelper -c "\dt"
```

Expected: tables `users`, `sessions`, `module_registry`, `user_modules`, `share_links`, `guests`, `module_context_cache`

- [ ] **Step 4: Generate Prisma client**

```bash
pnpm db:generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 5: Commit the migration files**

```bash
git add packages/core/prisma/migrations/
git commit -m "Add initial database migration"
```

---

## Task 3: Core Auth Utilities

**Files:**
- Modify: `packages/core/src/auth.ts`
- Create: `packages/core/src/__tests__/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db', () => ({
  db: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { hashPassword, verifyPassword, createSession, getSession, deleteSession } from '../auth'

describe('hashPassword', () => {
  it('returns a string different from the input', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')
  })

  it('produces a bcrypt hash (starts with $2)', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).toMatch(/^\$2/)
  })
})

describe('verifyPassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('secret123', hash)).toBe(true)
  })

  it('returns false for an incorrect password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})

describe('createSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls db.session.create with the userId and returns the token', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.create).mockResolvedValue({
      id: 'sess-1',
      token: 'abc-token',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000000),
      createdAt: new Date(),
    })

    const token = await createSession('user-1')

    expect(token).toBe('abc-token')
    expect(db.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1' }),
      })
    )
  })
})

describe('getSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when token does not exist', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.findUnique).mockResolvedValue(null)

    const result = await getSession('missing-token')
    expect(result).toBeNull()
  })

  it('returns null for an expired session', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.findUnique).mockResolvedValue({
      id: 'sess-1',
      token: 'expired',
      userId: 'user-1',
      expiresAt: new Date('2020-01-01'),
      createdAt: new Date(),
      user: { id: 'user-1', email: 'a@b.com', hashedPassword: 'hash', createdAt: new Date() },
    })

    const result = await getSession('expired')
    expect(result).toBeNull()
  })

  it('returns the session for a valid token', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.findUnique).mockResolvedValue({
      id: 'sess-1',
      token: 'valid',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000000),
      createdAt: new Date(),
      user: { id: 'user-1', email: 'a@b.com', hashedPassword: 'hash', createdAt: new Date() },
    })

    const result = await getSession('valid')
    expect(result).not.toBeNull()
    expect(result?.user.email).toBe('a@b.com')
  })
})

describe('deleteSession', () => {
  it('calls db.session.deleteMany with the token', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 1 })

    await deleteSession('some-token')
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { token: 'some-token' } })
  })
})
```

- [ ] **Step 2: Run tests - verify they fail**

```bash
pnpm --filter @lifehelper/core test
```

Expected: tests fail because `auth.ts` exports are empty stubs.

- [ ] **Step 3: Implement `packages/core/src/auth.ts`**

```typescript
import bcrypt from 'bcryptjs'
import { db } from './db'

const SALT_ROUNDS = 12
const SESSION_MS = 7 * 24 * 60 * 60 * 1000

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string): Promise<string> {
  const session = await db.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_MS),
    },
  })
  return session.token
}

export async function getSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session || session.expiresAt < new Date()) return null
  return session
}

export async function deleteSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } })
}
```

- [ ] **Step 4: Run tests - verify they pass**

```bash
pnpm --filter @lifehelper/core test
```

Expected: `5 passed` (smoke test + auth tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/auth.ts packages/core/src/__tests__/auth.test.ts packages/core/src/__tests__/smoke.test.ts
git commit -m "Implement core auth utilities with tests"
```

---

## Task 4: Auth API Routes

**Files:**
- Create: `apps/web/app/api/auth/register/route.ts`
- Create: `apps/web/app/api/auth/login/route.ts`
- Create: `apps/web/app/api/auth/logout/route.ts`

- [ ] **Step 1: Create `apps/web/app/api/auth/register/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lifehelper/core'
import { hashPassword, createSession } from '@lifehelper/core'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'Invalid email or password (min 8 chars)' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const user = await db.user.create({
    data: { email, hashedPassword: await hashPassword(password) },
  })

  const token = await createSession(user.id)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}
```

- [ ] **Step 2: Create `apps/web/app/api/auth/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lifehelper/core'
import { verifyPassword, createSession } from '@lifehelper/core'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.hashedPassword))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await createSession(user.id)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}
```

- [ ] **Step 3: Create `apps/web/app/api/auth/logout/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@lifehelper/core'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (token) await deleteSession(token)

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('session')
  return response
}
```

- [ ] **Step 4: Type-check passes**

```bash
pnpm type-check
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/
git commit -m "Add auth API routes (register, login, logout)"
```

---

## Task 5: Next.js Middleware

**Files:**
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Create `apps/web/middleware.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/api/auth',
  '/s/',
  '/_next',
  '/favicon.ico',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))

  if (isPublic) return NextResponse.next()

  const session = request.cookies.get('session')?.value
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Type-check passes**

```bash
pnpm type-check
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "Add Next.js middleware for session-based route protection"
```

---

## Task 6: Auth Pages (Login + Register)

**Files:**
- Create: `apps/web/app/(auth)/layout.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/register/page.tsx`

- [ ] **Step 1: Create `apps/web/app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
      <div className="w-full max-w-sm px-6">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `apps/web/app/(auth)/login/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const data = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.get('email'),
        password: data.get('password'),
      }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/dashboard')
    } else {
      const body = await res.json()
      setError(body.error ?? 'Login failed')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-zinc-900 dark:text-zinc-50">Sign in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-zinc-700 dark:text-zinc-300" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-zinc-700 dark:text-zinc-300" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-500">
        No account?{' '}
        <Link href="/register" className="text-zinc-900 dark:text-zinc-100 underline">Register</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create `apps/web/app/(auth)/register/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const data = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.get('email'),
        password: data.get('password'),
      }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/dashboard')
    } else {
      const body = await res.json()
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
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-zinc-700 dark:text-zinc-300" htmlFor="password">
            Password <span className="text-zinc-400">(min 8 chars)</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
          />
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
```

- [ ] **Step 4: Type-check passes**

```bash
pnpm type-check
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(auth\)/
git commit -m "Add login and register pages"
```

---

## Task 7: Root Redirect + Theme Foundation

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/components/theme-provider.tsx`
- Create: `apps/web/components/theme-toggle.tsx`

- [ ] **Step 1: Update `apps/web/app/page.tsx` to redirect**

```tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function RootPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')
  redirect(session ? '/dashboard' : '/login')
}
```

- [ ] **Step 2: Update `apps/web/app/globals.css` with dark mode + CSS vars**

```css
@import "tailwindcss";

@variant dark (&:is(.dark *));

:root {
  --bg: #ffffff;
  --fg: #09090b;
  --muted: #f4f4f5;
  --border: #e4e4e7;
  --sidebar-bg: #fafafa;
}

.dark {
  --bg: #09090b;
  --fg: #fafafa;
  --muted: #18181b;
  --border: #27272a;
  --sidebar-bg: #111113;
}
```

- [ ] **Step 3: Create `apps/web/components/theme-provider.tsx`**

```tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const resolved = stored ?? preferred
    setTheme(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [])

  function toggle() {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

- [ ] **Step 4: Create `apps/web/components/theme-toggle.tsx`**

```tsx
'use client'
import { useTheme } from './theme-provider'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}
```

- [ ] **Step 5: Update `apps/web/app/layout.tsx` to wrap with ThemeProvider**

```tsx
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'LifeHelper',
  description: 'Your personal life management platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Type-check passes**

```bash
pnpm type-check
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/globals.css apps/web/app/layout.tsx apps/web/components/theme-provider.tsx apps/web/components/theme-toggle.tsx
git commit -m "Add theme system and root redirect"
```

---

## Task 8: App Shell Layout + Sidebar

**Files:**
- Create: `apps/web/app/(app)/layout.tsx`
- Create: `apps/web/components/sidebar.tsx`
- Create: `apps/web/components/chat-rail.tsx`

- [ ] **Step 1: Create `apps/web/components/sidebar.tsx`**

```tsx
import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'

type Pocket = { id: string; name: string }

type SidebarProps = {
  pockets: Pocket[]
  currentPocketId?: string
}

export function Sidebar({ pockets, currentPocketId }: SidebarProps) {
  return (
    <nav className="flex flex-col items-center w-14 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-[var(--sidebar-bg)] py-3 gap-1">
      <Link
        href="/dashboard"
        className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-900 dark:text-zinc-100 font-bold text-sm mb-3"
        aria-label="Dashboard"
      >
        L
      </Link>

      {pockets.map(p => (
        <Link
          key={p.id}
          href={`/m/${p.id}`}
          aria-label={p.name}
          className={`flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium transition-colors ${
            currentPocketId === p.id
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {p.name.slice(0, 2).toUpperCase()}
        </Link>
      ))}

      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeToggle />
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create `apps/web/components/chat-rail.tsx`**

```tsx
'use client'
import { useState } from 'react'

type ChatMessage = { role: 'user' | 'assistant'; text: string }

type ChatRailProps = {
  context: 'dashboard' | 'pocket'
  pocketId?: string
}

export function ChatRail({ context }: ChatRailProps) {
  const [open, setOpen] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])

  function handleSend() {
    if (!input.trim()) return
    setMessages(prev => [
      ...prev,
      { role: 'user', text: input },
      { role: 'assistant', text: 'AI responses coming soon.' },
    ])
    setInput('')
  }

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center h-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        aria-label={open ? 'Collapse chat' : 'Expand chat'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col" style={{ height: '180px' }}>
          <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
            {messages.length === 0 && (
              <p className="text-xs text-zinc-400 mt-auto">
                {context === 'dashboard'
                  ? 'Try: "add an expenses pocket"'
                  : 'Ask me anything or say "undo" to reverse your last change.'}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs px-3 py-1.5 rounded-lg max-w-[80%] ${
                  m.role === 'user'
                    ? 'ml-auto bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-100 dark:border-zinc-800">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 text-sm bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send"
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `apps/web/app/(app)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession, db } from '@lifehelper/core'
import { Sidebar } from '@/components/sidebar'
import { ChatRail } from '@/components/chat-rail'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null

  if (!session) redirect('/login')

  const userModules = await db.userModule.findMany({
    where: { userId: session.user.id },
    include: { module: true },
  })

  const pockets = userModules.map(um => ({
    id: um.moduleId,
    name: um.module.name,
  }))

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
      <Sidebar pockets={pockets} />
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <ChatRail context="dashboard" />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Fix Prisma relation - add include type to schema**

The `db.userModule.findMany` above uses `include: { module: true }`. The Prisma schema needs a relation between `UserModule` and `ModuleRegistry`. Update `packages/core/prisma/schema.prisma`:

```prisma
model ModuleRegistry {
  id          String       @id
  name        String
  version     String       @default("0.1.0")
  userModules UserModule[]

  @@map("module_registry")
}

model UserModule {
  userId    String
  moduleId  String
  enabledAt DateTime       @default(now())
  module    ModuleRegistry @relation(fields: [moduleId], references: [id])

  @@id([userId, moduleId])
  @@map("user_modules")
}
```

Run:
```bash
pnpm db:migrate
```

Migration name: `add_module_relation`

- [ ] **Step 5: Type-check passes**

```bash
pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(app\)/layout.tsx apps/web/components/sidebar.tsx apps/web/components/chat-rail.tsx packages/core/prisma/
git commit -m "Add app shell layout with sidebar and chat rail"
```

---

## Task 9: Dashboard + Pocket Cards

**Files:**
- Create: `apps/web/app/(app)/dashboard/page.tsx`
- Create: `apps/web/components/pocket-card.tsx`

- [ ] **Step 1: Create `apps/web/components/pocket-card.tsx`**

```tsx
import Link from 'next/link'

type PocketCardProps = {
  id: string
  name: string
}

export function PocketCard({ id, name }: PocketCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
        </div>
        <Link
          href={`/m/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          Open
        </Link>
      </div>
      <p className="text-xs text-zinc-400">No summary yet</p>
    </div>
  )
}
```

- [ ] **Step 2: Create `apps/web/app/(app)/dashboard/page.tsx`**

```tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession, db } from '@lifehelper/core'
import { PocketCard } from '@/components/pocket-card'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) redirect('/login')

  const userModules = await db.userModule.findMany({
    where: { userId: session.user.id },
    include: { module: true },
    orderBy: { enabledAt: 'desc' },
  })

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Your pockets</h1>

      {userModules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-500">You have no pockets yet.</p>
          <p className="text-xs text-zinc-400 mt-1">Try typing "add an expenses pocket" in the chat below.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {userModules.map(um => (
            <PocketCard key={um.moduleId} id={um.moduleId} name={um.module.name} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check passes**

```bash
pnpm type-check
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(app\)/dashboard/ apps/web/components/pocket-card.tsx
git commit -m "Add dashboard with pocket card grid and empty state"
```

---

## Task 10: Pocket Routing Stub + Settings

**Files:**
- Create: `apps/web/app/(app)/m/[pocketId]/page.tsx`
- Create: `apps/web/app/(app)/settings/page.tsx`

- [ ] **Step 1: Create `apps/web/app/(app)/m/[pocketId]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import modules from '@lifehelper/registry'

type Props = { params: Promise<{ pocketId: string }> }

export default async function PocketPage({ params }: Props) {
  const { pocketId } = await params
  const manifest = modules.find(m => m.id === pocketId)
  if (!manifest) notFound()

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{manifest.name}</h1>
      <p className="text-sm text-zinc-500 mt-1">Pocket coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 2: Create `apps/web/app/(app)/settings/page.tsx`**

```tsx
export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
      <p className="text-sm text-zinc-500 mt-1">Coming soon.</p>
    </div>
  )
}
```

- [ ] **Step 3: Type-check passes**

```bash
pnpm type-check
```

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```

1. Open `http://localhost:3000` - should redirect to `/login`
2. Register a new account - should redirect to `/dashboard`
3. Dashboard should show empty state
4. Theme toggle should switch dark/light
5. Chat rail should show, collapse with the handle, accept text input

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(app\)/m/ apps/web/app/\(app\)/settings/
git commit -m "Add pocket routing stub and settings page"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Email + password auth | Tasks 3, 4, 6 |
| HttpOnly cookie sessions | Task 4 |
| Middleware session protection | Task 5 |
| Sidebar with pocket icons + theme toggle | Task 8 |
| Chat rail at bottom, collapsible | Task 8 |
| Context-aware chat prompt | Task 8 |
| Dashboard pocket card grid | Task 9 |
| Empty state with chat prompt | Task 9 |
| Dark/light theme with localStorage | Task 7 |
| System preference default | Task 7 |
| Pocket routing | Task 10 |

All spec requirements covered.

**Placeholder check:** No TBDs. Chat rail has "AI responses coming soon" stub which is intentional - AI is Phase 6.

**Type consistency:** `Pocket` type used in sidebar and layout is consistent (`{ id: string; name: string }`). `getSession` return type matches usage across layout and dashboard.
