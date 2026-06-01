import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from './db'

const SALT_ROUNDS = 12
const SESSION_MS = 365 * 24 * 60 * 60 * 1000

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const session = await db.session.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + SESSION_MS),
    },
  })
  return session.token
}

export async function getSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session || session.expiresAt < new Date()) return null
  return session
}

export async function deleteSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } })
}
