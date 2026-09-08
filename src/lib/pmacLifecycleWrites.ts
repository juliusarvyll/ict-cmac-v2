import type { Prisma, PmacVoteChoice } from '@prisma/client'
import { getPmacCompletionBlocker } from './pmacFulfillment'

/** These helpers must run inside an interactive transaction. */
export async function closeOpenPmacPoll(tx: Prisma.TransactionClient, pollId: string) {
  const result = await tx.pmacPoll.updateMany({
    where: { id: pollId, status: 'OPEN' },
    data: { status: 'CLOSED', closesAt: new Date() },
  })
  if (result.count !== 1) throw new Error('Only open polls can be closed. Refresh and try again.')
}

export async function recordVoteWhileOpen(
  tx: Prisma.TransactionClient,
  data: { pollId: string; voterId: string; voterMemberId: string; selectedOption: PmacVoteChoice },
) {
  // Lock the parent until commit. Closing/archiving the same row must wait,
  // and a vote waiting behind closure observes the closed state.
  const polls = await tx.$queryRaw<Array<{ status: string; opensAt: Date | null; closesAt: Date | null }>>`
    SELECT "status", "opensAt", "closesAt" FROM "PmacPoll" WHERE "id" = ${data.pollId} FOR UPDATE
  `
  const poll = polls[0]
  const now = new Date()
  if (!poll || poll.status !== 'OPEN' || (poll.opensAt && poll.opensAt > now) || (poll.closesAt && poll.closesAt <= now)) {
    throw new Error('Voting is only available while the poll is open.')
  }
  return tx.pmacVote.create({ data: { ...data, votedAt: now } })
}

export async function completeApprovedPmacEvent(tx: Prisma.TransactionClient, eventId: string) {
  await tx.$queryRaw`SELECT "id" FROM "PmacEvent" WHERE "id" = ${eventId} FOR UPDATE`
  const event = await tx.pmacEvent.findUnique({
    where: { id: eventId },
    include: { assignments: true, attendance: true },
  })
  if (!event || event.status !== 'APPROVED') throw new Error('Only approved PMAC events can be marked completed.')
  const blocker = getPmacCompletionBlocker(event)
  if (blocker) throw new Error(blocker)
  const result = await tx.pmacEvent.updateMany({
    where: { id: eventId, status: 'APPROVED' },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
  if (result.count !== 1) throw new Error('This event changed while it was being completed. Refresh and try again.')
}
