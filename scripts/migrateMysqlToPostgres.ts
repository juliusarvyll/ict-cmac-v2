import { createRequire } from 'node:module'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import { Prisma, PrismaClient } from '@prisma/client'
import { assertMigrationConnections, MIGRATION_MODELS, migrationDigest, MigrationSafetyError } from './migrationData'

type Row = Record<string, unknown>
type Delegate = {
  count(): Promise<number>
  findMany(args?: { skip?: number; take?: number }): Promise<Row[]>
  createMany(args: { data: Row[] }): Promise<{ count: number }>
}
function table(db: Prisma.TransactionClient, model: string): Delegate {
  return (db as unknown as Record<string, Delegate>)[model]
}

async function main() {
  loadEnvConfig(process.cwd())
  const sourceUrl = process.env.MYSQL_SOURCE_URL
  const targetUrl = process.env.POSTGRES_TARGET_URL
  assertMigrationConnections(sourceUrl, targetUrl)
  const apply = process.env.MYSQL_MIGRATION_APPLY === '1'
  if (apply && process.env.MIGRATION_SOURCE_FROZEN !== '1') {
    throw new MigrationSafetyError('Stop source application writes and set MIGRATION_SOURCE_FROZEN=1 before applying the transfer.')
  }

  const require = createRequire(path.join(process.cwd(), 'package.json'))
  let sourceClient: { PrismaClient: typeof PrismaClient }
  try {
    sourceClient = require(path.join(process.cwd(), 'node_modules/.prisma/mysql-migration-client'))
  } catch {
    throw new MigrationSafetyError('Generate the migration-only MySQL client with npm run db:migration-source-client first.')
  }
  const source = new sourceClient.PrismaClient({ datasources: { db: { url: sourceUrl } } })
  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } })
  try {
    const snapshot = new Map<string, Row[]>()
    let databaseNullLogs = new Set<string>()
    let totalBytes = 0
    // Every source operation below is a SELECT. Use a read-only source account too.
    await source.$transaction(async (tx) => {
      for (const model of MIGRATION_MODELS) {
        const count = await table(tx, model).count()
        if (count > 10000) throw new MigrationSafetyError(`${model} exceeds this tool's 10,000-row limit; use a reviewed streaming migration.`)
        const rows: Row[] = []
        for (let skip = 0; skip < count; skip += 10) {
          const batch = await table(tx, model).findMany({ skip, take: 10 })
          totalBytes += Buffer.byteLength(JSON.stringify(batch))
          if (totalBytes > 256 * 1024 * 1024) throw new MigrationSafetyError('Source exceeds the 256 MB transfer limit; use a reviewed streaming migration.')
          rows.push(...batch)
        }
        snapshot.set(model, rows)
        console.log(`Source ${model}: ${rows.length} records`)
      }
      // Preserve the distinction between SQL NULL and JSON null in audit metadata.
      const nullRows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM PmacActivityLog WHERE changes IS NULL`
      databaseNullLogs = new Set(nullRows.map((row) => row.id))
    }, { isolationLevel: 'RepeatableRead', timeout: 120000 })

    await target.$transaction(async (tx) => {
      for (const model of MIGRATION_MODELS) {
        if (await table(tx, model).count() !== 0) throw new MigrationSafetyError(`Destination ${model} is not empty. Nothing was overwritten; use a new destination.`)
      }
      if (!apply) {
        console.log('DRY RUN passed: source read and destination empty. No records were written.')
        return
      }
      for (const model of MIGRATION_MODELS) {
        const rows = snapshot.get(model)!
        // Small batches also bound SQL parameter counts and large binary payloads.
        const batchSize = model === 'requestLetterAttachment' ? 1 : 25
        for (let start = 0; start < rows.length; start += batchSize) {
          const data = rows.slice(start, start + batchSize).map((row) => model === 'pmacActivityLog' && row.changes === null
            ? { ...row, changes: databaseNullLogs.has(row.id as string) ? Prisma.DbNull : Prisma.JsonNull }
            : row)
          await table(tx, model).createMany({ data })
        }
        const copied = await table(tx, model).findMany()
        if (migrationDigest(rows) !== migrationDigest(copied)) {
          throw new MigrationSafetyError(`Verification failed for ${model}; the entire destination transaction will be rolled back.`)
        }
        console.log(`Verified ${model}: ${copied.length} records (content checksum matched)`)
      }
      const copiedNulls = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "PmacActivityLog" WHERE "changes" IS NULL`
      if (JSON.stringify(copiedNulls.map((row) => row.id).sort()) !== JSON.stringify([...databaseNullLogs].sort())) {
        throw new MigrationSafetyError('Audit JSON null verification failed; the entire destination transaction will be rolled back.')
      }
    }, { isolationLevel: 'Serializable', timeout: 120000 })
    console.log(apply ? 'Transfer committed and verified. MySQL is unchanged. File-based PMAC attachments still require a separate storage copy.' : 'Run with MYSQL_MIGRATION_APPLY=1 and MIGRATION_SOURCE_FROZEN=1 only after backup and a maintenance window.')
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()])
  }
}

main().catch((error: unknown) => {
  // Prisma errors can contain row values/password hashes. Never print them here.
  console.error(error instanceof MigrationSafetyError ? error.message : 'Migration failed; no success is claimed. Check schema/connectivity privately. Source records were not modified; destination writes use one transaction.')
  process.exitCode = 1
})
