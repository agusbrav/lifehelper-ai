import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@lifehelper/core'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'invalid' }, { status: 401 })

  return NextResponse.json({ token })
}
