import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import { getPmacDeliveryLink } from './pmacDeliveryEvidence'
import { syncRequestFulfillmentFromPmacEvent } from './pmacFulfillment'
describe('delivery evidence', () => {
  it.each([null, '', 'Photos delivered', 'http://localhost:3000/pmac/projects', 'http://127.0.0.1/files', 'https://user:password@example.com/files', 'javascript:alert(1)'])('does not accept %s as a delivery link', value => {
    expect(getPmacDeliveryLink(value)).toBeNull()
  })
  it('finds a shareable output link in wrap-up notes', () => {
    expect(getPmacDeliveryLink('Final gallery: https://drive.google.com/drive/folders/gallery.')).toBe('https://drive.google.com/drive/folders/gallery')
  })
  it.each([
    ['Photos delivered', 'EVENT_COMPLETED'],
    ['Final photos: https://example.com/gallery', 'DELIVERED'],
  ])('maps completed output %s to %s', async (deliveredOutputs, expected) => {
    const update = vi.fn()
    const tx = {
      pmacEvent: { findUnique: async () => ({ id: 'e1', title: 'Event', sourceType: 'CMAC_REQUEST', sourceRequestId: 'r1', status: 'COMPLETED', deliveredOutputs, assignments: [] }) },
      serviceRequest: { findUnique: async () => ({ pmacFulfillmentStatus: 'READY' }), update },
      auditLog: { create: vi.fn() },
    }
    expect(await syncRequestFulfillmentFromPmacEvent(tx as unknown as Prisma.TransactionClient, 'e1')).toBe(expected)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pmacFulfillmentStatus: expected }) }))
  })
})
