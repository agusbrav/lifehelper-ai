import { NextRequest, NextResponse } from 'next/server'
import { db, hashPassword, createSession } from '@lifehelper/core'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { email, password } = body as { email?: unknown; password?: unknown }

  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) {
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
