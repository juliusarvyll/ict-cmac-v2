import type { Prisma } from '@prisma/client'

/** Atomically accept the first response; callers still enforce session access. */
export async function saveFirstCoverageResponse(
  tx: Pick<Prisma.TransactionClient, 'pmacEventAssignment'>,
  assignmentId: string,
  memberId: string,
  response: 'YES' | 'NO',
) {
  if (response !== 'YES' && response !== 'NO') throw new Error('Choose Yes or No.')

  const updated = await tx.pmacEventAssignment.updateMany({
    where: {
      id: assignmentId,
      memberId,
      availabilityResponse: 'PENDING',
      event: { status: 'APPROVED' },
    },
    data: { availabilityResponse: response, respondedAt: new Date() },
  })

  if (updated.count !== 1) {
    throw new Error('Your coverage response has already been submitted and cannot be changed.')
  }
}
