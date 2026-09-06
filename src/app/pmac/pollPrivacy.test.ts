import { describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ poll: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_noStore: vi.fn() }))
vi.mock('@/lib/security', () => ({ getAuthenticatedSession: async () => ({ user: { id: 'u1', name: 'Member', role: 'PMAC_MEMBER', pmacMemberId: 'm1' } }) }))
vi.mock('@/lib/prisma', () => ({ hasPmacV4Delegates: () => true, prisma: {
  pmacPoll: { findFirst: mocks.poll, updateMany: vi.fn() }, user: { count: async () => 2 },
} }))
import { getPmacPollWorkspace } from './pollActions'
describe('poll result serialization', () => {
  it('does not leak historical vote summaries or other members choices before close', async () => {
    mocks.poll.mockResolvedValue({ id: 'p1', status: 'OPEN', opensAt: null, closesAt: new Date(Date.now() + 86400000), resultsVisibility: 'AFTER_CLOSE',
      votes: [{ id: 'v2', voterId: 'other-user', selectedOption: 'YES' }], _count: { votes: 1 }, attachments: [],
      activityLogs: [{ id: 'l1', action: 'VOTE_CAST', summary: 'Recorded a yes vote in a PMAC poll.' }, { id: 'l2', action: 'POLL_OPENED', summary: 'Opened poll.' }],
    })
    const result = await getPmacPollWorkspace('p1')
    expect(result?.poll.votes).toEqual([])
    expect(result?.voteSummary).toBeNull()
    expect(result?.poll.activityLogs).toEqual([{ id: 'l2', action: 'POLL_OPENED', summary: 'Opened poll.' }])
    expect(JSON.stringify(result)).not.toContain('Recorded a yes vote')
    expect(JSON.stringify(result)).not.toContain('other-user')
  })
})
