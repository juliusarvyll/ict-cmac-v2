import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ logs: vi.fn(), receipts: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { auditLog: { findMany: mocks.logs }, notificationReceipt: { findMany: mocks.receipts } }, hasPmacV4Delegates: () => false }))
import { getNotificationPage } from './notifications'
const user = { id: 'u1', role: 'SECRETARY' as const, name: 'Secretary', pmacMemberId: null, school: null, isActive: true, mustChangePassword: false }
describe('notification completeness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.logs.mockResolvedValue(Array.from({ length: 35 }, (_, index) => ({
      id: `log-${index}`, action: 'DIRECTOR_APPROVED', details: '', createdAt: new Date(Date.now() - index * 1000),
      request: { id: `request-${index}`, eventTitle: `Event ${index}`, status: 'DIRECTOR_APPROVED', secretaryId: 'u1', eventDate: new Date() },
    })))
    mocks.receipts.mockResolvedValue([])
  })
  it('reports the full unread count independently of the ten-item page', async () => {
    const first = await getNotificationPage(user)
    const second = await getNotificationPage(user, 2)
    expect(first).toMatchObject({ unreadCount: 35, totalPages: 4 })
    expect(first.items).toHaveLength(10)
    expect(second.items.some(item => first.items.some(other => item.id === other.id))).toBe(false)
    expect(mocks.logs.mock.calls[0][0]).not.toHaveProperty('take')
  })
  it('finds older unread items behind many already-read notifications', async () => {
    const allIds = (await Promise.all([1, 2, 3, 4].map(page => getNotificationPage(user, page, true)))).flatMap(page => page.items.map(item => item.id))
    mocks.receipts.mockResolvedValue(allIds.slice(0, 34).map(notificationId => ({ notificationId })))
    const result = await getNotificationPage(user)
    expect(result.unreadCount).toBe(1)
    expect(result.items[0].id).toBe(allIds[34])
    expect(mocks.receipts.mock.calls.at(-1)?.[0].where.userId).toBe('u1')
  })
})
