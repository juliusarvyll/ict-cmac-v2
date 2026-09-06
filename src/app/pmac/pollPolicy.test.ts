import { describe, expect, it } from 'vitest'

import {
  buildPollWorkspacePermissions,
  canViewPollResults,
  getEffectivePollStatus,
  isDuplicatePmacVoteError,
  isPollOpenForVoting,
} from './actionShared'
import { PMAC_POLL_CREATOR_ROLES, PMAC_POLL_VOTER_ROLES } from '@/lib/pmac'

const openPoll = {
  id: 'poll-1',
  status: 'OPEN' as const,
  opensAt: new Date('2026-07-19T08:00:00.000Z'),
  closesAt: new Date('2026-07-20T08:00:00.000Z'),
  resultsVisibility: 'AFTER_CLOSE' as const,
}

describe('PMAC poll policy', () => {
  it('allows only the configured leadership roles to create and manage polls', () => {
    expect(PMAC_POLL_CREATOR_ROLES).toEqual([
      'PMAC_DIRECTOR',
      'PMAC_ASSISTANT_DIRECTOR',
      'PMAC_SECRETARY',
      'PMAC_EXECUTIVE',
      'CMAC_COORDINATOR',
    ])
    expect(PMAC_POLL_CREATOR_ROLES).not.toContain('PMAC_MEMBER')
  })

  it('allows every PMAC role to vote but keeps coordinator oversight non-voting', () => {
    expect(PMAC_POLL_VOTER_ROLES).toEqual([
      'PMAC_DIRECTOR',
      'PMAC_ASSISTANT_DIRECTOR',
      'PMAC_SECRETARY',
      'PMAC_EXECUTIVE',
      'PMAC_MEMBER',
    ])
    expect(PMAC_POLL_VOTER_ROLES).not.toContain('CMAC_COORDINATOR')
  })

  it('treats an expired open poll as closed everywhere', () => {
    const now = new Date('2026-07-21T08:00:00.000Z')
    expect(getEffectivePollStatus(openPoll, now)).toBe('CLOSED')
    expect(isPollOpenForVoting(openPoll, now)).toBe(false)
    expect(canViewPollResults(openPoll, now)).toBe(true)
  })

  it('hides before-close results and grants one eligible member vote', () => {
    const now = new Date('2026-07-19T12:00:00.000Z')
    const user = {
      id: 'member-user-1',
      name: 'PMAC Member',
      role: 'PMAC_MEMBER' as const,
      pmacMemberId: 'member-1',
    }
    const permissions = buildPollWorkspacePermissions(user, openPoll as never, null, now)

    expect(permissions.canVote).toBe(true)
    expect(permissions.canViewResults).toBe(false)
    expect(buildPollWorkspacePermissions(user, openPoll as never, { id: 'vote-1' }, now).canVote).toBe(false)
  })

  it('recognizes the database uniqueness race as an already-cast vote', () => {
    expect(isDuplicatePmacVoteError({ code: 'P2002' })).toBe(true)
    expect(isDuplicatePmacVoteError({ code: 'P2025' })).toBe(false)
    expect(isDuplicatePmacVoteError(new Error('failure'))).toBe(false)
  })

  it('does not offer archival as an alternative to closing an open poll', () => {
    const user = { id: 'other', name: 'Coordinator', role: 'CMAC_COORDINATOR' as const, pmacMemberId: null }
    const now = new Date('2026-07-19T12:00:00Z')
    expect(buildPollWorkspacePermissions(user, openPoll as never, null, now).canArchive).toBe(false)
    expect(buildPollWorkspacePermissions(user, { ...openPoll, status: 'CLOSED' } as never, null, now).canArchive).toBe(true)
  })
})
