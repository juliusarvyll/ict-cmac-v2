import { describe, expect, it } from 'vitest'

import { assertPmacProjectCloseAccess, canClosePmacProject, getProjectClosureProblem, validatePmacProjectMilestoneTitle } from './projectActionSupport'

const project = { headMemberId: 'head-1' }

function user(role: 'CMAC_COORDINATOR' | 'PMAC_DIRECTOR' | 'PMAC_ASSISTANT_DIRECTOR' | 'PMAC_SECRETARY' | 'PMAC_EXECUTIVE' | 'PMAC_MEMBER', pmacMemberId: string | null) {
  return { id: `${role.toLowerCase()}-1`, name: role, role, pmacMemberId }
}

describe('PMAC project closure policy', () => {
  it('allows only the assigned executive head to close a project', () => {
    expect(canClosePmacProject(project, user('PMAC_EXECUTIVE', 'head-1'))).toBe(true)
    expect(canClosePmacProject(project, user('PMAC_EXECUTIVE', 'other-head'))).toBe(false)
    expect(canClosePmacProject(project, user('CMAC_COORDINATOR', null))).toBe(false)
    expect(canClosePmacProject(project, user('PMAC_DIRECTOR', 'director-1'))).toBe(false)
    expect(canClosePmacProject(project, user('PMAC_SECRETARY', 'secretary-1'))).toBe(false)
    expect(canClosePmacProject(project, user('PMAC_ASSISTANT_DIRECTOR', 'assistant-1'))).toBe(false)
    expect(canClosePmacProject(project, user('PMAC_MEMBER', 'member-1'))).toBe(false)
  })

  it('retains the director-check prerequisite for the assigned head', () => {
    expect(() => assertPmacProjectCloseAccess(project, user('PMAC_EXECUTIVE', 'head-1'), false))
      .toThrow('PMAC Director must check this project before the assigned head can close it.')
    expect(() => assertPmacProjectCloseAccess(project, user('PMAC_EXECUTIVE', 'head-1'), true)).not.toThrow()
  })

  it('rejects coordinator closure bypasses', () => {
    expect(() => assertPmacProjectCloseAccess(project, user('CMAC_COORDINATOR', null), true))
      .toThrow('Only the assigned executive head can close this project.')
  })

  it('requires an output summary and completed milestones', () => {
    expect(getProjectClosureProblem({ outputSummary: null, milestones: [] }))
      .toBe('Submit a project output summary before closing the project.')
    expect(getProjectClosureProblem({ outputSummary: 'Delivered', milestones: [{ status: 'IN_PROGRESS' }] }))
      .toBe('Complete every project milestone before closing the project.')
    expect(getProjectClosureProblem({ outputSummary: 'Delivered', milestones: [{ status: 'DONE' }] })).toBeNull()
  })

  it('keeps URLs in Project Links instead of milestone titles', () => {
    expect(() => validatePmacProjectMilestoneTitle('http://localhost:3000/pmac/projects'))
      .toThrow('Milestone title cannot be a URL.')
    expect(validatePmacProjectMilestoneTitle('Publish the event gallery')).toBe('Publish the event gallery')
  })
})
