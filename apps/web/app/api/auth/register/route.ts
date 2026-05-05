import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lifehelper/core'
import { hashPassword, createSession } from '@lifehelper/core'

export async function POST(req: NextRequest) {
  const body = await req.json() as unknown
  const { email, password } = body as { email?: unknown; password?: unknown }

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string' || password.length < 8) {
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
