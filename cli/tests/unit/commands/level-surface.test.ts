/**
 * MDT-205 — CLI surface for the `level` field.
 *
 * Asserts level is an accepted attr token and list filter, and that value
 * resolution routes through the shared attrResolver (e→epic, t→ticket) so CLI
 * and MCP apply identical alias meaning (C-6).
 */

import {
  resolveAttrValue,
  resolveLevelToken,
} from '@mdt/shared/services/ticket/attrResolver.js'
import { describe, expect, test } from 'bun:test'
import { ATTR_FIELDS } from '../../../src/commands/attrMeta.js'

describe('CLI attr surface — level field', () => {
  test('ATTR_FIELDS maps the level token', () => {
    expect(ATTR_FIELDS.level).toBe('level')
  })

  test('level token resolves through the shared resolver', () => {
    // normalizeFieldValue delegates enum fields to resolveAttrValue; level is
    // dispatched there, so CLI attr mutation applies the same alias meaning.
    expect(resolveAttrValue('level', 'e')).toBe('epic')
    expect(resolveAttrValue('level', 't')).toBe('ticket')
    expect(resolveAttrValue('level', 'epic')).toBe('epic')
    expect(() => resolveLevelToken('story')).toThrow()
  })
})

describe('CLI list filter — level field', () => {
  // The FILTER_FIELD_MAPPING is module-private; we assert behaviour through the
  // shared lookup that the list filter delegates to (lookupLevelToken).
  test('level filter token resolves via the shared lenient lookup', async () => {
    const { lookupLevelToken }
      = await import('@mdt/shared/services/ticket/attrResolver.js')
    expect(lookupLevelToken('e')).toBe('epic')
    expect(lookupLevelToken('EPIC')).toBe('epic')
    expect(lookupLevelToken('t')).toBe('ticket')
    expect(lookupLevelToken('story')).toBeUndefined()
  })
})
