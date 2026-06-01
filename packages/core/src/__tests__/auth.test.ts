import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db', () => ({
  db: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { hashPassword, verifyPassword, createSession, getSession, deleteSession } from '../auth'

describe('hashPassword', () => {
  it('returns a string different from the input', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')
  })

  it('produces a bcrypt hash (starts with $2)', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).toMatch(/^\$2/)
  })
})

describe('verifyPassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('secret123', hash)).toBe(true)
  })

  it('returns false for an incorrect password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})

describe('createSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls db.session.create with the userId and returns the token', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.create).mockResolvedValue({
      id: 'sess-1',
      token: 'abc-token',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000000),
      createdAt: new Date(),
    })

    const token = await createSession('user-1')

    expect(token).toBe('abc-token')
    const call = vi.mocked(db.session.create).mock.calls[0]![0]!
    expect(call.data.userId).toBe('user-1')
    const expectedExpiry = Date.now() + 365 * 24 * 60 * 60 * 1000
    const expiresAt = call.data.expiresAt as Date
    expect(expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000)
    expect(expiresAt.getTime()).toBeLessThan(expectedExpiry + 5000)
  })
})

describe('getSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when token does not exist', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.findUnique).mockResolvedValue(null)

    const result = await getSession('missing-token')
    expect(result).toBeNull()
  })

  it('returns null for an expired session', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.findUnique).mockResolvedValue({
      id: 'sess-1',
      token: 'expired',
      userId: 'user-1',
      expiresAt: new Date('2020-01-01'),
      createdAt: new Date(),
      user: { id: 'user-1', email: 'a@b.com', hashedPassword: 'hash', locale: 'es', createdAt: new Date() },
    } as any)

    const result = await getSession('expired')
    expect(result).toBeNull()
  })

  it('returns the session for a valid token', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.findUnique).mockResolvedValue({
      id: 'sess-1',
      token: 'valid',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000000),
      createdAt: new Date(),
      user: { id: 'user-1', email: 'a@b.com', hashedPassword: 'hash', locale: 'es', createdAt: new Date() },
    } as any)

    const result = await getSession('valid')
    expect(result).not.toBeNull()
    expect(result?.user.email).toBe('a@b.com')
  })
})

describe('deleteSession', () => {
  it('calls db.session.deleteMany with the token', async () => {
    const { db } = await import('../db')
    vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 1 })

    await deleteSession('some-token')
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { token: 'some-token' } })
  })
})
