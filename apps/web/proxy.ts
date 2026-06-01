import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/api/auth',
  '/s/',
  '/_next',
  '/favicon.ico',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))

  if (isPublic) return NextResponse.next()

  const session = request.cookies.get('session')?.value
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.next()
  response.cookies.set('session', session, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
  })
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
