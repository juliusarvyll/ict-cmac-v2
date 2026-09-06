import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  assertActionAccess: vi.fn(),
}))

vi.mock('next/cache', () => ({ unstable_noStore: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/security', () => ({ assertActionAccess: mocks.assertActionAccess }))
vi.mock('@/lib/prisma', () => ({ prisma: {}, hasPmacV4Delegates: false }))
vi.mock('@/lib/pmacActivity', () => ({ recordPmacActivity: vi.fn() }))
vi.mock('@/lib/pmacRevalidation', () => ({ revalidatePmacViews: vi.fn() }))

import { castPmacVote, createPmacPoll, openPmacPoll } from './pollActions'
import { PMAC_POLL_CREATOR_ROLES, PMAC_POLL_MANAGER_ROLES, PMAC_POLL_VOTER_ROLES } from '@/lib/pmac'

describe('PMAC poll server-action authorization', () => {
  beforeEach(() => {
    mocks.assertActionAccess.mockReset()
    mocks.assertActionAccess.mockRejectedValue(new Error('Unauthorized'))
  })

  it('checks the complete creator policy before creating a poll', async () => {
    const result = await createPmacPoll({
      title: 'Internal agreement',
      description: '',
      type: 'GENERAL',
      opensAt: '',
      closesAt: '',
      linkedEventId: '',
      resultsVisibility: 'AFTER_CLOSE',
    })

    expect(result).toEqual({ success: false, error: 'Unauthorized' })
    expect(mocks.assertActionAccess).toHaveBeenCalledWith(PMAC_POLL_CREATOR_ROLES, { zeroTrust: false })
  })

  it('checks the manager policy before changing poll state', async () => {
    const result = await openPmacPoll('poll-1')

    expect(result).toEqual({ success: false, error: 'Unauthorized' })
    expect(mocks.assertActionAccess).toHaveBeenCalledWith(PMAC_POLL_MANAGER_ROLES, { zeroTrust: false })
  })

  it('checks every PMAC voter role while excluding coordinator', async () => {
    const result = await castPmacVote('poll-1', 'YES')

    expect(result).toEqual({ success: false, error: 'Unauthorized' })
    expect(mocks.assertActionAccess).toHaveBeenCalledWith(PMAC_POLL_VOTER_ROLES, { zeroTrust: false })
  })
})
