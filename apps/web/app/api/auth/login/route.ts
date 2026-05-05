import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lifehelper/core'
import { verifyPassword, createSession } from '@lifehelper/core'

export async function POST(req: NextRequest) {
  const body = await req.json() as unknown
  const { email, password } = body as { email?: unknown; password?: unknown }

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
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
