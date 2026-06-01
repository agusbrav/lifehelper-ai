import { NextRequest, NextResponse } from 'next/server'
import { db, verifyPassword, createSession } from '@lifehelper/core'

const DUMMY_HASH = '$2b$12$invalidhashfortimingprotectionnnnnnnnnnnnnnnnnnnnnnnnnn'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { email, password } = body as { email?: unknown; password?: unknown }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  // Dev-only shortcut: admin/admin maps to DEV_ADMIN_EMAIL account
  const devEmail = process.env.DEV_ADMIN_EMAIL
  if (devEmail && email === 'admin' && password === 'admin') {
    console.log('[login] dev bypass: looking up', devEmail)
    const devUser = await db.user.findUnique({ where: { email: devEmail } })
    if (devUser) {
      const token = await createSession(devUser.id)
      console.log('[login] dev session created, token prefix:', token.slice(0, 8))
      const response = NextResponse.json({ ok: true })
      response.cookies.set('session', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 90,
        path: '/',
      })
      return response
    }
    console.log('[login] dev bypass: user not found for', devEmail)
  }

  const user = await db.user.findUnique({ where: { email } })
  const passwordMatch = await verifyPassword(password, user?.hashedPassword ?? DUMMY_HASH)
  if (!user || !passwordMatch) {
    console.log('[login] invalid credentials for', email)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await createSession(user.id)
  console.log('[login] session created for', email)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
  })
  return response
}
