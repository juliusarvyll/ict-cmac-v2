import type { Prisma } from '@prisma/client'

export const PMAC_PROJECT_CLOSURE_INVALIDATING_ACTIONS = [
  'PROJECT_STATUS_UPDATED', 'PROJECT_HEAD_ASSIGNED', 'PROJECT_UPDATED',
  'PROJECT_OUTPUT_SUBMITTED', 'PROJECT_LINK_ATTACHED', 'PROJECT_MEMBERS_ASSIGNED',
  'PROJECT_MILESTONE_CREATED', 'PROJECT_MILESTONE_UPDATED', 'PROJECT_MILESTONE_STATUS_UPDATED',
  'PROJECT_DEADLINE_RECONCILED',
] as const

export async function lockEditablePmacProject(tx: Prisma.TransactionClient, projectId: string) {
  await tx.$queryRaw`SELECT id FROM PmacProject WHERE id = ${projectId} FOR UPDATE`
  const project = await tx.pmacProject.findUnique({ where: { id: projectId }, select: { status: true } })
  if (!project) throw new Error('Project not found.')
  if (project.status === 'COMPLETED') throw new Error('Completed projects are final and cannot be edited.')
}

export async function hasDirectorClosureCheck(db: Pick<Prisma.TransactionClient, 'pmacActivityLog'>, projectId: string) {
  const check = await db.pmacActivityLog.findFirst({
    where: { projectId, action: 'PROJECT_DIRECTOR_CHECKED', actorRole: 'PMAC_DIRECTOR' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true, createdAt: true },
  })
  if (!check) return false
  const change = await db.pmacActivityLog.findFirst({
    where: { projectId, action: { in: [...PMAC_PROJECT_CLOSURE_INVALIDATING_ACTIONS] }, createdAt: { gt: check.createdAt } },
    select: { id: true },
  })
  return !change
}

/** Session authorization is performed by the action; closure conditions are reread under the row lock. */
export async function closeAssignedPmacProject(
  tx: Prisma.TransactionClient,
  projectId: string,
  actor: { role: string; pmacMemberId?: string | null },
  outputSummary?: string,
) {
  await tx.$queryRaw`SELECT id FROM PmacProject WHERE id = ${projectId} FOR UPDATE`
  const project = await tx.pmacProject.findUnique({ where: { id: projectId }, include: { milestones: true } })
  if (!project) throw new Error('Project not found.')
  if (project.status === 'COMPLETED') throw new Error('Completed projects are already closed.')
  if (actor.role !== 'PMAC_EXECUTIVE' || !actor.pmacMemberId || project.headMemberId !== actor.pmacMemberId) {
    throw new Error('Only the assigned executive head can close this project.')
  }
  if (!await hasDirectorClosureCheck(tx, projectId)) {
    throw new Error('PMAC Director must check this project before the assigned head can close it.')
  }
  const summary = outputSummary ?? project.outputSummary
  if (!summary?.trim()) throw new Error('Submit a project output summary before closing the project.')
  if (project.milestones.some((milestone) => milestone.status !== 'DONE')) {
    throw new Error('Complete every project milestone before closing the project.')
  }
  const result = await tx.pmacProject.updateMany({
    where: { id: projectId, status: { not: 'COMPLETED' }, headMemberId: actor.pmacMemberId },
    data: {
      status: 'COMPLETED', completedAt: new Date(),
      ...(outputSummary === undefined ? {} : { outputSummary, outputSubmittedAt: new Date() }),
    },
  })
  if (result.count !== 1) throw new Error('The project changed. Refresh before closing it.')
  return project
}
