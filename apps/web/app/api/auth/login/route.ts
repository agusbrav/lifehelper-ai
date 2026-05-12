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
    const devUser = await db.user.findUnique({ where: { email: devEmail } })
    if (devUser) {
      const token = await createSession(devUser.id)
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
  }

  const user = await db.user.findUnique({ where: { email } })
  const passwordMatch = await verifyPassword(password, user?.hashedPassword ?? DUMMY_HASH)
  if (!user || !passwordMatch) {
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
