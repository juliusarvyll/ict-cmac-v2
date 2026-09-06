import type { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'

import { findRequestConflicts } from '@/lib/conflicts'

describe('CMAC conflict checks', () => {
  it('fails closed when the booking query is unavailable', async () => {
    const database = {
      serviceRequest: {
        findMany: vi.fn().mockRejectedValue(new Error('database unavailable')),
      },
      pmacEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as Pick<Prisma.TransactionClient, 'serviceRequest' | 'pmacEvent'>

    await expect(findRequestConflicts({
      startDate: '2026-07-20',
      startTime: '08:00',
      endTime: '10:00',
      eventVenue: 'MM Hall',
    }, database)).rejects.toThrow('database unavailable')
  })

  it('detects overlapping bookings in the same venue', async () => {
    const database = {
      serviceRequest: {
        findMany: vi.fn().mockResolvedValue([{
          eventTitle: 'Existing Event',
          eventDate: new Date('2026-07-20'),
          endDate: new Date('2026-07-20'),
          startTime: '09:00',
          endTime: '11:00',
          status: 'DIRECTOR_APPROVED',
          eventVenue: 'MM Hall',
        }]),
      },
      pmacEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as Pick<Prisma.TransactionClient, 'serviceRequest' | 'pmacEvent'>

    const result = await findRequestConflicts({
      startDate: '2026-07-20',
      startTime: '10:00',
      endTime: '12:00',
      eventVenue: 'MM Hall',
    }, database)

    expect(result.hasConflict).toBe(true)
    expect(result.conflicts[0]?.title).toBe('Existing Event')
  })

  it('detects a conflicting manually-created PMAC event', async () => {
    const database = {
      serviceRequest: { findMany: vi.fn().mockResolvedValue([]) },
      pmacEvent: {
        findMany: vi.fn().mockResolvedValue([{
          title: 'PMAC Workshop',
          startDateTime: new Date('2026-07-20T09:00:00'),
          endDateTime: new Date('2026-07-20T11:00:00'),
          status: 'APPROVED',
          venue: 'MM Hall',
        }]),
      },
    } as unknown as Pick<Prisma.TransactionClient, 'serviceRequest' | 'pmacEvent'>

    const result = await findRequestConflicts({
      startDate: '2026-07-20',
      startTime: '10:00',
      endTime: '12:00',
      eventVenue: 'mm hall',
    }, database)

    expect(result.hasConflict).toBe(true)
    expect(result.conflicts[0]?.title).toBe('PMAC Workshop')
  })
})
