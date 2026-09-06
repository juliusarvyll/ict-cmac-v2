import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import { Prisma, PrismaClient } from '@prisma/client'

import { saveFirstCoverageResponse } from '../src/lib/pmacCoverageResponse'

async function main() {
  loadEnvConfig(process.cwd())
  if (process.env.PMAC_CONCURRENCY_TESTS !== '1' || process.env.NODE_ENV === 'production') {
    throw new Error('Set PMAC_CONCURRENCY_TESTS=1 to permit temporary fixtures in a local development database.')
  }
  const connection = process.env.PMAC_TEST_DATABASE_URL || process.env.DATABASE_URL
  if (!connection) throw new Error('A local MySQL database URL is required.')
  const url = new URL(connection)
  if (url.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Concurrency tests only permit loopback MySQL databases; remote databases are refused.')
  }
  // Both transaction callbacks must acquire separate connections before racing.
  url.searchParams.set('connection_limit', '5')
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } })
  const prefix = `concurrency-${randomUUID()}`
  const memberId = `${prefix}-member`
  const userId = `${prefix}-user`
  const eventId = `${prefix}-event`
  const assignmentId = `${prefix}-assignment`
  const pollId = `${prefix}-poll`
  let created = false

  // A gate ensures both transactions are open before either attempts its write.
  async function race<T>(write: (tx: Prisma.TransactionClient, choice: 'YES' | 'NO') => Promise<T>) {
    let arrived = 0
    let release!: () => void
    const ready = new Promise<void>((resolve) => { release = resolve })
    return Promise.allSettled((['YES', 'NO'] as const).map((choice) => db.$transaction(async (tx) => {
      arrived += 1
      if (arrived === 2) release()
      await ready
      await write(tx, choice)
      return choice
    }, { maxWait: 5000, timeout: 10000 })))
  }

  try {
    await db.$queryRaw`SELECT 1`
    console.log(`Temporary fixture scope: ${prefix}`)
    await db.$transaction(async (tx) => {
      await tx.pmacMember.create({ data: { id: memberId, fullName: prefix, email: `${prefix}@example.invalid`, status: 'INACTIVE' } })
      await tx.user.create({ data: {
        id: userId, name: prefix, email: `${prefix}@example.invalid`, password: `disabled-${randomUUID()}`,
        role: 'PMAC_MEMBER', isActive: false, pmacMemberId: memberId,
      } })
      await tx.pmacEvent.create({ data: {
        id: eventId, title: prefix, venue: 'Temporary database test', status: 'APPROVED',
        startDateTime: new Date('2000-01-01T00:00:00Z'), endDateTime: new Date('2000-01-01T01:00:00Z'), createdById: userId,
      } })
      await tx.pmacEventAssignment.create({ data: {
        id: assignmentId, eventId, memberId, assignedById: userId, assignmentRole: 'PHOTOGRAPHER',
      } })
      await tx.pmacPoll.create({ data: { id: pollId, title: prefix, createdById: userId } })
    })
    created = true

    for (let round = 0; round < 5; round += 1) {
      await db.pmacEventAssignment.update({ where: { id: assignmentId }, data: { availabilityResponse: 'PENDING', respondedAt: null } })
      const results = await race((tx, choice) => saveFirstCoverageResponse(tx, assignmentId, memberId, choice))
      const winners = results.filter((result) => result.status === 'fulfilled')
      assert.equal(winners.length, 1, 'Exactly one competing coverage response must succeed.')
      const loser = results.find((result) => result.status === 'rejected')
      assert(loser?.status === 'rejected' && loser.reason instanceof Error)
      assert.match(loser.reason.message, /already been submitted/)
      const saved = await db.pmacEventAssignment.findUniqueOrThrow({ where: { id: assignmentId } })
      assert.equal(saved.availabilityResponse, winners[0].value)
      assert(saved.respondedAt)
      await assert.rejects(saveFirstCoverageResponse(db, assignmentId, memberId, saved.availabilityResponse === 'YES' ? 'NO' : 'YES'), /already been submitted/)
    }
    console.log('PASS: five simultaneous Yes/No races; exactly one winner and no later overwrite.')

    await db.pmacEventAssignment.update({ where: { id: assignmentId }, data: { availabilityResponse: 'PENDING', respondedAt: null } })
    await assert.rejects(saveFirstCoverageResponse(db, assignmentId, `${prefix}-unrelated`, 'YES'), /already been submitted/)
    await db.pmacEvent.update({ where: { id: eventId }, data: { status: 'COMPLETED' } })
    const locked = await race((tx, choice) => saveFirstCoverageResponse(tx, assignmentId, memberId, choice))
    assert(locked.every((result) => result.status === 'rejected' && result.reason instanceof Error && /already been submitted/.test(result.reason.message)))
    assert.equal((await db.pmacEventAssignment.findUniqueOrThrow({ where: { id: assignmentId } })).availabilityResponse, 'PENDING')
    console.log('PASS: unrelated member and completed-event coverage writes rejected.')

    // This exercises database vote uniqueness, not session/poll-state authorization.
    const votes = await race((tx, selectedOption) => tx.pmacVote.create({ data: { pollId, voterId: userId, voterMemberId: memberId, selectedOption } }))
    assert.equal(votes.filter((result) => result.status === 'fulfilled').length, 1)
    const duplicate = votes.find((result) => result.status === 'rejected')
    assert(duplicate?.status === 'rejected' && duplicate.reason instanceof Prisma.PrismaClientKnownRequestError && duplicate.reason.code === 'P2002')
    assert.equal(await db.pmacVote.count({ where: { pollId } }), 1)
    console.log('PASS: simultaneous duplicate votes produce one row and one unique-constraint rejection.')
  } finally {
    try {
      if (created) {
        // Exact generated IDs only; event and poll children cascade. Never clean user data.
        await db.$transaction([
          db.pmacPoll.delete({ where: { id: pollId } }),
          db.pmacEvent.delete({ where: { id: eventId } }),
          db.user.delete({ where: { id: userId } }),
          db.pmacMember.delete({ where: { id: memberId } }),
        ])
        console.log(`Removed temporary fixtures: ${prefix}`)
      }
    } finally {
      await db.$disconnect()
    }
  }
}

main().catch((error: unknown) => {
  // Avoid printing a connection URL or Prisma's expanded query diagnostics.
  console.error(error instanceof Prisma.PrismaClientKnownRequestError ? `Database check failed: ${error.code}` : error instanceof Error ? error.message : 'Concurrency check failed.')
  process.exitCode = 1
})
