import { describe, expect, it } from 'vitest'

import { canCoordinatorAccessPmacPath } from './pmacRouteAccess'

describe('Coordinator PMAC route access', () => {
  it('allows the complete poll creation and management flow', () => {
    expect(canCoordinatorAccessPmacPath('/pmac/polls')).toBe(true)
    expect(canCoordinatorAccessPmacPath('/pmac/polls/new')).toBe(true)
    expect(canCoordinatorAccessPmacPath('/pmac/polls/poll-1')).toBe(true)
  })

  it('keeps unrelated PMAC operational routes protected', () => {
    expect(canCoordinatorAccessPmacPath('/pmac/events/new')).toBe(false)
    expect(canCoordinatorAccessPmacPath('/pmac/members')).toBe(false)
  })
})
