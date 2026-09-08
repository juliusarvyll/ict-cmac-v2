import { createHash } from 'node:crypto'

// Parent records precede children. IDs and relations are copied, never remapped.
export const MIGRATION_MODELS = [
  'pmacMember', 'user', 'serviceRequest', 'pmacProject', 'pmacEvent',
  'pmacMemberSpecialty', 'pmacProjectAssignment', 'pmacProjectMilestone', 'pmacProjectLink',
  'pmacEventAssignment', 'pmacAttendance', 'pmacPoll', 'pmacVote', 'pmacAttachment',
  'pmacActivityLog', 'requestLetterAttachment', 'auditLog', 'notificationReceipt',
] as const

function canonical(value: unknown): unknown {
  if (value instanceof Date) return { $date: value.toISOString() }
  if (value instanceof Uint8Array) return { $bytes: Buffer.from(value).toString('base64') }
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
  }
  return value
}

/** Order-independent for rows, but not for arrays inside JSON fields. */
export function migrationDigest(rows: Array<Record<string, unknown>>) {
  const normalized = rows.map((row) => JSON.stringify(canonical(row))).sort()
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

export class MigrationSafetyError extends Error {}

export function assertMigrationConnections(source: string | undefined, target: string | undefined) {
  if (!source || !target) throw new MigrationSafetyError('Set MYSQL_SOURCE_URL and POSTGRES_TARGET_URL privately before running this tool.')
  let sourceUrl: URL
  let targetUrl: URL
  try { sourceUrl = new URL(source); targetUrl = new URL(target) } catch {
    throw new MigrationSafetyError('A migration connection URL is invalid. Check it privately; do not paste credentials into logs.')
  }
  if (sourceUrl.protocol !== 'mysql:' || !['postgres:', 'postgresql:'].includes(targetUrl.protocol)) {
    throw new MigrationSafetyError('The source must be MySQL and the destination must be PostgreSQL.')
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(targetUrl.hostname) && !['require', 'verify-ca', 'verify-full'].includes(targetUrl.searchParams.get('sslmode') || '')) {
    throw new MigrationSafetyError('Remote PostgreSQL transfers require TLS (sslmode=require or stronger).')
  }
}
