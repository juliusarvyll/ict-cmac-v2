import type { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { closeOpenPmacPoll, recordVoteWhileOpen } from './pmacLifecycleWrites'
import { closeAssignedPmacProject, lockEditablePmacProject } from './pmacProjectClosure'

function database() {
  const mock = {
    $queryRaw: vi.fn().mockResolvedValue([{ status: 'OPEN', opensAt: null, closesAt: null }]),
    pmacPoll: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    pmacVote: { create: vi.fn().mockResolvedValue({ id: 'vote' }) },
    pmacProject: {
      findUnique: vi.fn().mockResolvedValue({ id: 'p1', status: 'ACTIVE', headMemberId: 'head', outputSummary: 'Delivered', milestones: [{ status: 'DONE' }] }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    pmacActivityLog: { findFirst: vi.fn().mockResolvedValueOnce({ id: 'check', createdAt: new Date(0) }).mockResolvedValue(null) },
  }
  return { mock, tx: mock as unknown as Prisma.TransactionClient }
}

describe('transactional lifecycle guards', () => {
  const vote = { pollId: 'poll', voterId: 'user', voterMemberId: 'member', selectedOption: 'YES' as const }

  it.each([
    { status: 'CLOSED', opensAt: null, closesAt: null },
    { status: 'DRAFT', opensAt: null, closesAt: null },
    { status: 'OPEN', opensAt: new Date('2100-01-01'), closesAt: null },
    { status: 'OPEN', opensAt: null, closesAt: new Date(0) },
  ])('rejects a vote when the locked poll is unavailable: %j', async (poll) => {
    const { tx, mock } = database()
    mock.$queryRaw.mockResolvedValue([poll])
    await expect(recordVoteWhileOpen(tx, vote)).rejects.toThrow('only available while the poll is open')
    expect(mock.pmacVote.create).not.toHaveBeenCalled()
  })

  it('locks the poll before inserting a vote', async () => {
    const { tx, mock } = database()
    await recordVoteWhileOpen(tx, vote)
    expect(mock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mock.pmacVote.create.mock.invocationCallOrder[0])
    expect(mock.pmacVote.create).toHaveBeenCalledWith({ data: { ...vote, votedAt: expect.any(Date) } })
  })

  it('does not report duplicate closure as a second success', async () => {
    const { tx, mock } = database()
    mock.pmacPoll.updateMany.mockResolvedValue({ count: 0 })
    await expect(closeOpenPmacPoll(tx, 'poll')).rejects.toThrow('Only open polls')
    expect(mock.pmacPoll.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'poll', status: 'OPEN' } }))
  })

  it('checks the current head inside the closure transaction', async () => {
    const { tx, mock } = database()
    await expect(closeAssignedPmacProject(tx, 'p1', { role: 'PMAC_EXECUTIVE', pmacMemberId: 'former-head' })).rejects.toThrow('Only the assigned executive head')
    expect(mock.pmacProject.updateMany).not.toHaveBeenCalled()
  })

  it('rechecks milestone readiness before closure', async () => {
    const { tx, mock } = database()
    mock.pmacProject.findUnique.mockResolvedValue({ id: 'p1', status: 'ACTIVE', headMemberId: 'head', outputSummary: 'Delivered', milestones: [{ status: 'TODO' }] })
    await expect(closeAssignedPmacProject(tx, 'p1', { role: 'PMAC_EXECUTIVE', pmacMemberId: 'head' })).rejects.toThrow('Complete every project milestone')
    expect(mock.pmacProject.updateMany).not.toHaveBeenCalled()
  })

  it('rejects edits after acquiring a completed project lock', async () => {
    const { tx, mock } = database()
    mock.pmacProject.findUnique.mockResolvedValue({ status: 'COMPLETED' })
    await expect(lockEditablePmacProject(tx, 'p1')).rejects.toThrow('cannot be edited')
  })
})
