/**
 * Tests for the derived-field write guard (MDT-189 TASK-remove-write).
 *
 * The guard (`assertNotDerivedField`) is the single chokepoint that enforces
 * "blocks is derived from dependsOn; edit dependsOn instead" (bdd.md S14).
 * TicketService.validateAttrOperations delegates here; the MCP server and any
 * future write surface should too.
 *
 * Testing the helper directly (rather than through TicketService.updateTicketAttributes)
 * keeps the test fast and focused — the integration path through a real
 * project fixture adds no signal for what is fundamentally a one-line check,
 * and the CLI attr command already passes INVALID_OPERATION through to the
 * user transparently.
 *
 * Framework: @jest/globals (cross-runner safe — works under jest and bun test).
 */

import { describe, expect, it } from '@jest/globals'

import { ServiceError } from '../../ServiceError.js'
import {
  assertNotDerivedField,
  DERIVED_FIELDS,
} from '../derivedFields.js'

describe('DERIVED_FIELDS constant', () => {
  it('includes blocks (the MDT-189 derived field)', () => {
    expect(DERIVED_FIELDS).toContain('blocks')
  })
})

describe('assertNotDerivedField', () => {
  it('throws INVALID_OPERATION for blocks with the derived-field message', () => {
    try {
      assertNotDerivedField('blocks', 'add')
      throw new Error('expected assertNotDerivedField to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError)
      const serviceError = error as ServiceError
      expect(serviceError.code).toBe('INVALID_OPERATION')
      expect(serviceError.message).toBe('blocks is derived from dependsOn; edit dependsOn instead')
      expect(serviceError.details).toEqual({ field: 'blocks', op: 'add' })
    }
  })

  it('rejects all three op kinds on blocks (add/remove/replace)', () => {
    const ops = ['add', 'remove', 'replace'] as const
    for (const op of ops) {
      expect(() => assertNotDerivedField('blocks', op)).toThrow(
        /blocks is derived from dependsOn/,
      )
    }
  })

  it('does NOT throw for dependsOn (the canonical write target)', () => {
    expect(() => assertNotDerivedField('dependsOn', 'add')).not.toThrow()
    expect(() => assertNotDerivedField('dependsOn', 'replace')).not.toThrow()
    expect(() => assertNotDerivedField('dependsOn', 'remove')).not.toThrow()
  })

  it('does NOT throw for relatedTickets (regression: only blocks is derived in v1)', () => {
    expect(() => assertNotDerivedField('relatedTickets', 'add')).not.toThrow()
  })

  it('does NOT throw for ordinary scalar fields', () => {
    expect(() => assertNotDerivedField('status', 'replace')).not.toThrow()
    expect(() => assertNotDerivedField('priority', 'replace')).not.toThrow()
    expect(() => assertNotDerivedField('assignee', 'replace')).not.toThrow()
  })

  it('includes the op in the error details for traceability', () => {
    for (const op of ['add', 'remove', 'replace'] as const) {
      try {
        assertNotDerivedField('blocks', op)
        throw new Error('expected throw')
      } catch (error) {
        const serviceError = error as ServiceError
        expect(serviceError.details).toMatchObject({ field: 'blocks', op })
      }
    }
  })
})
