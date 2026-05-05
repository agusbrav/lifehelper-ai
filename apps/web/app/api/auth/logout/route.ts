import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@lifehelper/core'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (token) await deleteSession(token)

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('session')
  return response
}
