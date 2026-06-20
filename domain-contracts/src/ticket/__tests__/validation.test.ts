/**
 * Ticket Validation Function Behavior Tests
 * Testing function behavior, not schema validation
 */

import { validateTicket } from '../validation.js'

describe('validateTicket', () => {
  it('returns typed ticket on valid input', () => {
    const result = validateTicket({
      code: 'MDT-101',
      title: 'Test Ticket',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
      dateCreated: null,
      lastModified: null,
      content: '',
      filePath: '/tmp/test.md',
      relatedTickets: [],
      dependsOn: [],
      blocks: [],
    })

    expect(result.code).toBe('MDT-101')
    expect(result.title).toBe('Test Ticket')
    expect(typeof result).toBe('object')
  })

  it('throws on invalid input', () => {
    expect(() => validateTicket({
      code: 'invalid-code',
      title: 'Test',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
    })).toThrow()
  })
})
