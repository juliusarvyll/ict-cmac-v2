import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { Prisma, PrismaClient } from '@prisma/client'
import { MIGRATION_MODELS, migrationDigest } from './migrationData'

async function main() {
  const sourceUrl = new URL(process.env.MYSQL_SOURCE_URL || '')
  const targetUrl = new URL(process.env.POSTGRES_TARGET_URL || '')
  assert.equal(process.env.CI, 'true', 'This fixture harness is only for disposable CI services.')
  for (const url of [sourceUrl, targetUrl]) assert(['localhost', '127.0.0.1'].includes(url.hostname))
  assert.equal(sourceUrl.pathname, '/pmac_transfer_source')
  assert.equal(targetUrl.pathname, '/pmac_transfer_target')
  const require = createRequire(path.join(process.cwd(), 'package.json'))
  const legacy = require(path.join(process.cwd(), 'node_modules/.prisma/mysql-migration-client')) as { PrismaClient: typeof PrismaClient; Prisma: typeof Prisma }
  const source = new legacy.PrismaClient({ datasources: { db: { url: sourceUrl.toString() } } })
  const target = new PrismaClient({ datasources: { db: { url: targetUrl.toString() } } })
  type Table = { count(): Promise<number>; findMany(): Promise<Array<Record<string, unknown>>> }
  const table = (db: PrismaClient, name: string) => (db as unknown as Record<string, Table>)[name]
  try {
    for (const model of MIGRATION_MODELS) {
      assert.equal(await table(source, model).count(), 0)
      assert.equal(await table(target, model).count(), 0)
    }
    const date = new Date('2026-01-02T03:04:05.123Z')
    await source.$transaction(async (tx) => {
      await tx.pmacMember.create({ data: { id: 'm', fullName: 'Migration fixture', email: 'Member@example.invalid' } })
      await tx.user.create({ data: { id: 'u', name: 'Fixture', email: 'User@example.invalid', password: 'unchanged-password-hash', role: 'PMAC_MEMBER', pmacMemberId: 'm', isActive: false } })
      await tx.serviceRequest.create({ data: { id: 'r', eventTitle: 'Fixture', eventDate: date, eventVenue: 'Test', school: 'SITE', documentationType: 'BOTH', secretaryId: 'u', letterUrl: '/api/request-letters/letter' } })
      await tx.pmacProject.create({ data: { id: 'p', title: 'Fixture', branch: 'HEAD_PHOTOGRAPHER', headMemberId: 'm', startDate: date, targetDate: date, launchedById: 'u' } })
      await tx.pmacEvent.create({ data: { id: 'e', title: 'Fixture', venue: 'Test', startDateTime: date, endDateTime: date, createdById: 'u', sourceRequestId: 'r' } })
      await tx.pmacMemberSpecialty.create({ data: { memberId: 'm', specialty: 'PHOTOGRAPHY' } })
      await tx.pmacProjectAssignment.create({ data: { id: 'pa', projectId: 'p', memberId: 'm', assignedById: 'u' } })
      await tx.pmacProjectMilestone.create({ data: { id: 'milestone', projectId: 'p', title: 'Fixture', dueDate: date, status: 'DONE' } })
      await tx.pmacProjectLink.create({ data: { id: 'link', projectId: 'p', label: 'Output', url: 'https://example.invalid/output', addedById: 'u' } })
      await tx.pmacEventAssignment.create({ data: { id: 'assignment', eventId: 'e', memberId: 'm', assignedById: 'u', assignmentRole: 'ALL_AROUND', availabilityResponse: 'YES', respondedAt: date } })
      await tx.pmacAttendance.create({ data: { id: 'attendance', eventId: 'e', memberId: 'm', status: 'PRESENT', recordedById: 'u' } })
      await tx.pmacPoll.create({ data: { id: 'poll', title: 'Fixture', createdById: 'u', linkedEventId: 'e', status: 'CLOSED' } })
      await tx.pmacVote.create({ data: { id: 'vote', pollId: 'poll', voterId: 'u', voterMemberId: 'm', selectedOption: 'ABSTAIN', votedAt: date } })
      await tx.pmacAttachment.create({ data: { id: 'attachment', eventId: 'e', uploadedById: 'u', fileName: 'fixture.pdf', storedName: 'fixture.pdf', filePath: '/private/uploads/pmac/2026-01/fixture.pdf', mimeType: 'application/pdf', sizeBytes: 4 } })
      for (const [id, changes] of [['log-object', { nested: [1, true, null], note: 'Unicode: ñ ✓' }], ['log-null', legacy.Prisma.JsonNull], ['log-sql-null', legacy.Prisma.DbNull]] as const) {
        await tx.pmacActivityLog.create({ data: { id, entityType: 'EVENT', entityId: 'e', eventId: 'e', actorId: 'u', actorName: 'Fixture', actorRole: 'PMAC_MEMBER', action: 'FIXTURE', summary: 'Fixture', changes } })
      }
      await tx.requestLetterAttachment.create({ data: { id: 'letter', requestId: 'r', uploadedById: 'u', fileName: 'letter.pdf', mimeType: 'application/pdf', sizeBytes: 4, data: Buffer.from([0, 255, 3, 128]) } })
      await tx.auditLog.create({ data: { id: 'audit', requestId: 'r', action: 'FIXTURE', actorName: 'Fixture', actorRole: 'PMAC_MEMBER' } })
      await tx.notificationReceipt.create({ data: { id: 'receipt', userId: 'u', notificationId: 'notification', module: 'PMAC', readAt: date } })
    })
    function run(apply: boolean) {
      return spawnSync(process.execPath, [require.resolve('tsx/cli'), 'scripts/migrateMysqlToPostgres.ts'], {
        env: { ...process.env, MYSQL_MIGRATION_APPLY: apply ? '1' : '0', MIGRATION_SOURCE_FROZEN: '1' }, encoding: 'utf8', timeout: 180000,
      })
    }
    const dryRun = run(false)
    assert.equal(dryRun.status, 0, dryRun.stderr)
    assert.equal(await target.user.count(), 0, 'Dry run must not copy records.')
    const applied = run(true)
    assert.equal(applied.status, 0, applied.stderr)
    for (const model of MIGRATION_MODELS) {
      assert.equal(migrationDigest(await table(source, model).findMany()), migrationDigest(await table(target, model).findMany()), model)
    }
    const repeat = run(true)
    assert.equal(repeat.status, 1)
    assert.match(repeat.stderr, /not empty/)
    assert.equal(await target.user.count(), 1, 'Repeat import must not overwrite or duplicate accounts.')
    assert.equal((await target.user.findFirst({ where: { email: { equals: 'user@example.invalid', mode: 'insensitive' } } }))?.id, 'u')
    await assert.rejects(target.user.create({ data: { email: 'user@example.invalid', password: 'not-saved' } }), (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    console.log('PASS: all 18 models transferred, IDs/content/bytes/JSON/dates/password hashes preserved; dry-run, nonempty-target refusal, and email matching/uniqueness verified.')
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()])
  }
}

main().catch(() => {
  console.error('Disposable database transfer verification failed. No application database is used by this harness.')
  process.exitCode = 1
})
