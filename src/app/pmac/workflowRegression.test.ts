import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  session: vi.fn(), event: vi.fn(), assignment: vi.fn(), assignments: vi.fn(), updateResponse: vi.fn(),
  project: vi.fn(), log: vi.fn(), record: vi.fn(), transaction: vi.fn(),
}))
vi.mock('next/cache', () => ({ unstable_noStore: vi.fn() }))
vi.mock('@/lib/security', () => ({ assertActionAccess: mocks.session, getAuthenticatedSession: mocks.session }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  pmacEvent: { findUnique: mocks.event },
  pmacEventAssignment: { findUnique: mocks.assignment, findMany: mocks.assignments },
  pmacMember: { findMany: async () => [{ id: 'm1', fullName: 'Member', specialties: [{ specialty: 'PHOTOGRAPHY' }] }] },
  pmacProject: { findUnique: mocks.project },
  pmacActivityLog: { findFirst: mocks.log },
  $transaction: mocks.transaction,
} }))
vi.mock('@/lib/pmacActivity', () => ({ recordPmacActivity: mocks.record }))
vi.mock('@/lib/pmacFulfillment', () => ({ syncRequestFulfillmentFromPmacEvent: vi.fn() }))
vi.mock('@/lib/pmacRevalidation', () => ({ revalidatePmacViews: vi.fn() }))
vi.mock('@/lib/requestWorkflow', () => ({ revalidateRequestViews: vi.fn() }))
import { respondToPmacAssignment, savePmacAssignments } from './assignmentActions'
import { checkPmacProjectForClosure } from './projectActions'
import { hasPmacDirectorClosureCheck } from './projectActionSupport'
import { buildWorkspacePermissions } from './actionShared'

describe('workflow regressions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.session.mockResolvedValue({ user: { id: 'u1', name: 'Member', role: 'PMAC_MEMBER', pmacMemberId: 'm1' } })
    mocks.event.mockResolvedValue({ id: 'e1', title: 'Event', status: 'APPROVED', sourceType: 'MANUAL', startDateTime: new Date(), endDateTime: new Date() })
    mocks.assignment.mockResolvedValue({ id: 'a1', memberId: 'm1', availabilityResponse: 'PENDING', event: { id: 'e1', status: 'APPROVED' } })
    mocks.assignments.mockResolvedValue([])
    mocks.transaction.mockImplementation(async operation => operation({
      $queryRaw: vi.fn().mockResolvedValue([]),
      pmacEvent: { updateMany: async () => ({ count: 1 }) },
      pmacEventAssignment: { updateMany: mocks.updateResponse, create: vi.fn() },
      pmacProject: { findUnique: async () => ({ title: 'Project', status: 'ACTIVE' }) },
      pmacActivityLog: { findFirst: async () => ({ id: 'old-check' }) },
    }))
  })
  it('rejects staffing and responses after completion before mutation', async () => {
    mocks.event.mockResolvedValue({ id: 'e1', status: 'COMPLETED' })
    mocks.assignment.mockResolvedValue({ id: 'a1', memberId: 'm1', availabilityResponse: 'PENDING', event: { id: 'e1', status: 'COMPLETED' } })
    expect(await savePmacAssignments('e1', [])).toMatchObject({ success: false, error: expect.stringContaining('locked') })
    expect(await respondToPmacAssignment('a1', 'YES')).toMatchObject({ success: false, error: expect.stringContaining('locked') })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
  it('allows only one of two competing coverage responses to persist', async () => {
    mocks.updateResponse.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    const results = await Promise.all([respondToPmacAssignment('a1', 'YES'), respondToPmacAssignment('a1', 'NO')])
    expect(results.filter(result => result.success)).toHaveLength(1)
    expect(mocks.updateResponse.mock.calls[0][0].where).toMatchObject({ memberId: 'm1', availabilityResponse: 'PENDING', event: { status: 'APPROVED' } })
  })
  it('does not reserve a declined assignment in conflicts or workload warnings', async () => {
    const result = await savePmacAssignments('e1', [{ memberId: 'm1', assignmentRole: 'PHOTOGRAPHER' }])
    expect(result.success).toBe(true)
    const overlapQueries = mocks.assignments.mock.calls.map(call => call[0].where).filter(where => where.eventId?.not)
    expect(overlapQueries).toHaveLength(2)
    expect(overlapQueries.every(where => where.availabilityResponse.not === 'NO')).toBe(true)
  })
  it('locks staffing but retains post-event wrap-up permission', () => {
    const permissions = buildWorkspacePermissions({ id: 'u1', role: 'PMAC_DIRECTOR', name: 'Director', pmacMemberId: 'm1' }, { status: 'COMPLETED', startDateTime: new Date(0) } as never)
    expect(permissions).toMatchObject({ canManageAssignments: false, canEditWrapUp: true, canRespond: false })
  })
  it('records fresh director checks even when a historical check exists', async () => {
    mocks.session.mockResolvedValue({ user: { id: 'u1', name: 'Director', role: 'PMAC_DIRECTOR', pmacMemberId: 'm1' } })
    mocks.project.mockResolvedValue({ id: 'p1', title: 'Project', status: 'ACTIVE' })
    expect((await checkPmacProjectForClosure('p1')).success).toBe(true)
    expect((await checkPmacProjectForClosure('p1')).success).toBe(true)
    expect(mocks.record).toHaveBeenCalledTimes(2)
  })
  it('evaluates the latest director check and invalidates it after later changes', async () => {
    mocks.log.mockResolvedValueOnce({ id: 'new-check', createdAt: new Date() }).mockResolvedValueOnce(null)
    expect(await hasPmacDirectorClosureCheck('p1')).toBe(true)
    expect(mocks.log.mock.calls[0][0].orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }])
    mocks.log.mockResolvedValueOnce({ id: 'new-check', createdAt: new Date() }).mockResolvedValueOnce({ id: 'change' })
    expect(await hasPmacDirectorClosureCheck('p1')).toBe(false)
  })
})
