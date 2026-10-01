import { describe, expect, it } from '@jest/globals'
import { DocumentConfigSchema } from '../../project/schema'
import { PROJECT_DOCUMENT_CONFIG_DEFAULTS } from '../defaults'

describe('config-management canonical defaults', () => {
  it('exposes the canonical project document defaults shape', () => {
    expect(PROJECT_DOCUMENT_CONFIG_DEFAULTS.paths).toEqual([])
    expect(PROJECT_DOCUMENT_CONFIG_DEFAULTS.excludeFolders).toEqual([])
  })

  it('resolves the maxDepth drift to 5 (MDT-168)', () => {
    // Schema previously defaulted to 3; runtime used 5. Canonical truth is now 5.
    expect(PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth).toBe(5)
  })

  it('is a frozen contract value (as const)', () => {
    // as const literal: assignment should be a type error at compile time; at
    // runtime we assert the value is the expected primitive.
    expect(typeof PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth).toBe('number')
  })

  it('document config schema consumes the canonical default when maxDepth absent', () => {
    const parsed = DocumentConfigSchema.parse({ paths: [], excludeFolders: [] })
    expect(parsed.maxDepth).toBe(PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth)
  })
})
