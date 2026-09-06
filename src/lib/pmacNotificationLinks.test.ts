import { describe, expect, it } from 'vitest'
import {
  getPmacAssignmentResponseNotificationCopy,
  getPmacAttendanceGapNotificationCopy,
  getPmacProjectNotificationHref,
} from './notifications'

describe('PMAC notification destinations', () => {
  it('targets the specific branch project instead of the generic project board', () => {
    const projectId = 'project/with spaces'
    const href = getPmacProjectNotificationHref(projectId)

    expect(href).toBe('/pmac/projects?projectId=project%2Fwith%20spaces')
  })

  it('identifies the member, response, duty, and event for the PMAC secretary', () => {
    const accepted = getPmacAssignmentResponseNotificationCopy({
      memberName: 'Mika Reyes',
      eventTitle: 'University Assembly',
      assignmentRole: 'PHOTOGRAPHER',
      response: 'YES',
    })
    const declined = getPmacAssignmentResponseNotificationCopy({
      memberName: 'Ana Cruz',
      eventTitle: 'University Assembly',
      assignmentRole: 'VIDEOGRAPHER',
      response: 'NO',
    })

    expect(accepted).toEqual(expect.objectContaining({
      title: 'Mika Reyes accepted coverage',
      description: 'Mika Reyes answered Yes for the Photographer assignment in "University Assembly".',
      dueLabel: 'Accepted',
    }))
    expect(declined).toEqual(expect.objectContaining({
      title: 'Ana Cruz declined coverage',
      description: 'Ana Cruz answered No for the Videographer assignment in "University Assembly".',
      dueLabel: 'Needs replacement',
    }))
  })

  it('reports partial attendance using confirmed-member totals', () => {
    expect(getPmacAttendanceGapNotificationCopy({
      eventTitle: 'University Assembly',
      missingCount: 2,
      confirmedCount: 5,
      completed: false,
    })).toEqual({
      title: 'Event attendance needs recording',
      description: '"University Assembly" is missing attendance for 2 of 5 confirmed member(s).',
      dueLabel: '2 missing',
    })
  })
})
