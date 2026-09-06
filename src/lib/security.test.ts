import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: mocks.user } }, hasUserSecurityFields: () => true }))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { getAuthenticatedSession, assertActionAccess } from './security'

describe('current account authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.session.mockResolvedValue({ user: { id: 'u1', email: 'old@example.com', role: 'PMAC_DIRECTOR' } })
  })
  it('rejects disabled accounts despite a valid JWT', async () => {
    mocks.user.mockResolvedValue({ id: 'u1', isActive: false })
    expect(await getAuthenticatedSession()).toBeNull()
  })
  it('does not rebind a deleted identity by a reused email', async () => {
    mocks.user.mockResolvedValue(null)
    expect(await getAuthenticatedSession()).toBeNull()
    expect(mocks.user).toHaveBeenCalledTimes(1)
  })
  it('uses the current role and rejects stale elevated permissions', async () => {
    mocks.user.mockResolvedValue({ id: 'u1', isActive: true, role: 'PMAC_MEMBER', pmacMemberId: 'm1' })
    expect((await getAuthenticatedSession())?.user.role).toBe('PMAC_MEMBER')
    await expect(assertActionAccess(['PMAC_DIRECTOR'])).rejects.toThrow('Unauthorized')
  })
})
