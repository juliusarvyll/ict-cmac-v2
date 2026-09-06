import { describe, expect, it } from 'vitest'

import { getPmacCompletionBlocker } from './pmacFulfillment'

const readyEvent = {
  endDateTime: new Date('2026-08-12T10:00:00'),
  sourceType: 'CMAC_REQUEST' as const,
  sourceDocumentationType: 'BOTH' as const,
  handoffAcknowledgedAt: new Date('2026-08-10T08:00:00'),
  assignments: [
    { memberId: 'photo-1', assignmentRole: 'PHOTOGRAPHER' as const, availabilityResponse: 'YES' as const },
    { memberId: 'video-1', assignmentRole: 'VIDEOGRAPHER' as const, availabilityResponse: 'YES' as const },
    { memberId: 'journalist-1', assignmentRole: 'JOURNALIST' as const, availabilityResponse: 'YES' as const },
  ],
  attendance: [
    { memberId: 'photo-1' },
    { memberId: 'video-1' },
    { memberId: 'journalist-1' },
  ],
}

describe('PMAC event completion readiness', () => {
  it('blocks completion before the scheduled end', () => {
    expect(getPmacCompletionBlocker(readyEvent, new Date('2026-08-12T09:59:00')))
      .toContain('before its scheduled end time')
  })

  it('requires CMAC handoff acknowledgment', () => {
    expect(getPmacCompletionBlocker(
      { ...readyEvent, handoffAcknowledgedAt: null },
      new Date('2026-08-12T11:00:00'),
    )).toContain('Acknowledge the CMAC handoff')
  })

  it('requires every recommended role to have accepted coverage', () => {
    expect(getPmacCompletionBlocker(
      { ...readyEvent, assignments: readyEvent.assignments.slice(0, 1) },
      new Date('2026-08-12T11:00:00'),
    )).toContain('VIDEOGRAPHER')
  })

  it('requires attendance for confirmed members', () => {
    expect(getPmacCompletionBlocker(
      { ...readyEvent, attendance: [{ memberId: 'photo-1' }] },
      new Date('2026-08-12T11:00:00'),
    )).toContain('Record attendance')
  })

  it('allows a fully staffed and documented event to complete', () => {
    expect(getPmacCompletionBlocker(readyEvent, new Date('2026-08-12T11:00:00'))).toBeNull()
  })
})
