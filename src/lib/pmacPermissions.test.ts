import { describe, expect, it } from 'vitest'

import {
  PMAC_EXECUTIVE_BRANCH_SPECIALTY,
  PMAC_EXECUTIVE_TITLE_LABELS,
  PMAC_EXECUTIVE_TITLES,
  canClosePmacPoll,
  isPmacAssignmentResponderRole,
  isPmacAttendanceManagerRole,
  isPmacCreatorRole,
  isPmacEventManagerRole,
  isPmacPollManagerRole,
  isPmacPollMonitorRole,
  isPmacPollVoterRole,
  isPmacProjectLauncherRole,
  isPmacStaffingManagerRole,
} from './pmac'

describe('PMAC role permissions', () => {
  it('treats the public relations officer as an executive-level PMAC title', () => {
    expect(PMAC_EXECUTIVE_TITLES).toContain('PUBLIC_RELATIONS_OFFICER')
    expect(PMAC_EXECUTIVE_TITLE_LABELS.PUBLIC_RELATIONS_OFFICER).toBe('Public Relations Officer (PRO)')
    expect(PMAC_EXECUTIVE_BRANCH_SPECIALTY.PUBLIC_RELATIONS_OFFICER).toBe('JOURNALISM')
    expect(isPmacAssignmentResponderRole('PMAC_EXECUTIVE')).toBe(true)
  })

  it('keeps event creation and event management with PMAC leadership', () => {
    expect(isPmacCreatorRole('PMAC_DIRECTOR')).toBe(true)
    expect(isPmacCreatorRole('PMAC_ASSISTANT_DIRECTOR')).toBe(true)
    expect(isPmacEventManagerRole('PMAC_SECRETARY')).toBe(false)
    expect(isPmacEventManagerRole('PMAC_EXECUTIVE')).toBe(false)
  })

  it('keeps staffing, attendance, and assignment responses separated', () => {
    expect(isPmacStaffingManagerRole('PMAC_SECRETARY')).toBe(true)
    expect(isPmacStaffingManagerRole('PMAC_EXECUTIVE')).toBe(false)
    expect(isPmacAttendanceManagerRole('PMAC_SECRETARY')).toBe(true)
    expect(isPmacAttendanceManagerRole('PMAC_DIRECTOR')).toBe(false)
    expect(isPmacAssignmentResponderRole('PMAC_EXECUTIVE')).toBe(true)
    expect(isPmacAssignmentResponderRole('PMAC_MEMBER')).toBe(true)
    expect(isPmacAssignmentResponderRole('CMAC_COORDINATOR')).toBe(false)
  })

  it('keeps poll management separate from voting and monitoring', () => {
    expect(isPmacPollManagerRole('CMAC_COORDINATOR')).toBe(true)
    expect(isPmacPollManagerRole('PMAC_DIRECTOR')).toBe(true)
    expect(isPmacPollManagerRole('PMAC_ASSISTANT_DIRECTOR')).toBe(true)
    expect(isPmacPollManagerRole('PMAC_SECRETARY')).toBe(true)
    expect(isPmacPollManagerRole('PMAC_EXECUTIVE')).toBe(true)
    expect(isPmacPollManagerRole('PMAC_MEMBER')).toBe(false)
    expect(isPmacPollMonitorRole('PMAC_SECRETARY')).toBe(true)
    expect(isPmacPollVoterRole('PMAC_MEMBER')).toBe(true)
    expect(isPmacPollVoterRole('PMAC_EXECUTIVE')).toBe(true)
    expect(isPmacPollVoterRole('PMAC_SECRETARY')).toBe(true)
    expect(isPmacPollVoterRole('PMAC_DIRECTOR')).toBe(true)
    expect(isPmacPollVoterRole('PMAC_ASSISTANT_DIRECTOR')).toBe(true)
    expect(isPmacPollVoterRole('CMAC_COORDINATOR')).toBe(false)
  })

  it('allows only the creator, director, or secretary to close a poll', () => {
    expect(canClosePmacPoll('PMAC_EXECUTIVE', 'creator-1', 'creator-1')).toBe(true)
    expect(canClosePmacPoll('CMAC_COORDINATOR', 'creator-1', 'creator-1')).toBe(true)
    expect(canClosePmacPoll('PMAC_DIRECTOR', 'director-1', 'creator-1')).toBe(true)
    expect(canClosePmacPoll('PMAC_SECRETARY', 'secretary-1', 'creator-1')).toBe(true)
    expect(canClosePmacPoll('PMAC_ASSISTANT_DIRECTOR', 'assistant-1', 'creator-1')).toBe(false)
    expect(canClosePmacPoll('PMAC_EXECUTIVE', 'executive-1', 'creator-1')).toBe(false)
  })

  it('allows only the configured launch roles to launch PMAC projects', () => {
    expect(isPmacProjectLauncherRole('CMAC_COORDINATOR')).toBe(true)
    expect(isPmacProjectLauncherRole('PMAC_DIRECTOR')).toBe(true)
    expect(isPmacProjectLauncherRole('PMAC_SECRETARY')).toBe(true)
    expect(isPmacProjectLauncherRole('PMAC_ASSISTANT_DIRECTOR')).toBe(false)
    expect(isPmacProjectLauncherRole('PMAC_EXECUTIVE')).toBe(false)
  })
})
