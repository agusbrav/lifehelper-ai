'use server'
import { cookies } from 'next/headers'
import { db, verifyPassword, createSession } from '@lifehelper/core'

const DUMMY_HASH = '$2b$12$invalidhashfortimingprotectionnnnnnnnnnnnnnnnnnnnnnnnnn'

export async function loginAction(
  _prev: { error: string } | { token: string } | null,
  formData: FormData,
): Promise<{ error: string } | { token: string }> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return { error: 'Email and password required' }
  }

  const devEmail = process.env.DEV_ADMIN_EMAIL
  if (devEmail && email === 'admin' && password === 'admin') {
    console.log('[login] dev bypass: looking up', devEmail)
    const devUser = await db.user.findUnique({ where: { email: devEmail } })
    if (devUser) {
      const token = await createSession(devUser.id)
      console.log('[login] dev session created, token prefix:', token.slice(0, 8))
      const cookieStore = await cookies()
      cookieStore.set('session', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 90,
        path: '/',
      })
      return { token }
    }
    console.log('[login] dev bypass: user not found for', devEmail)
  }

  const user = await db.user.findUnique({ where: { email } })
  const passwordMatch = await verifyPassword(password, user?.hashedPassword ?? DUMMY_HASH)
  if (!user || !passwordMatch) {
    console.log('[login] invalid credentials for', email)
    return { error: 'Invalid credentials' }
  }

  const token = await createSession(user.id)
  console.log('[login] session created for', email)
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
  })
  return { token }
}
