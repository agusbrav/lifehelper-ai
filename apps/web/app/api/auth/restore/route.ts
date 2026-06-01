import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@lifehelper/core'

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }) }
  const { token } = body as { token?: unknown }
  if (typeof token !== 'string' || !token) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'invalid' }, { status: 401 })

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
