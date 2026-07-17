import { describe, expect, it } from '@jest/globals'
import { PROJECT_DOCUMENT_CONFIG_DEFAULTS } from '@mdt/domain-contracts'
import {
  applyProjectDocumentPatch,
  computeEffectiveDocumentConfig,
  validateProjectDocumentPatch,
} from '../../services/project/ProjectDocumentPatch.js'

describe('ProjectDocumentPatch command', () => {
  describe('validateProjectDocumentPatch', () => {
    it('accepts a valid full patch', () => {
      const result = validateProjectDocumentPatch({ paths: ['docs'], excludeFolders: ['dist'], maxDepth: 7 })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.validated.paths).toEqual(['docs'])
        expect(result.validated.excludeFolders).toEqual(['dist'])
        expect(result.validated.maxDepth).toBe(7)
      }
    })

    it('accepts a partial patch (only provided fields validated)', () => {
      const result = validateProjectDocumentPatch({ maxDepth: 4 })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.validated.maxDepth).toBe(4)
        expect(result.validated.paths).toBeUndefined()
      }
    })

    it('rejects an out-of-range maxDepth with a field-level error', () => {
      const result = validateProjectDocumentPatch({ maxDepth: 99 })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.field).toBe('project.document.maxDepth')
        expect(result.message.length).toBeGreaterThan(0)
      }
    })

    it('rejects an absolute path entry', () => {
      const result = validateProjectDocumentPatch({ paths: ['/etc/passwd'] })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.field).toBe('project.document.paths')
      }
    })

    it('rejects a traversal excludeFolders entry', () => {
      const result = validateProjectDocumentPatch({ excludeFolders: ['../secret'] })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.field).toBe('project.document.excludeFolders')
      }
    })

    it('rejects a non-object patch', () => {
      const result = validateProjectDocumentPatch('not-an-object')
      expect(result.ok).toBe(false)
    })

    it('never converts an invalid value to a default', () => {
      // An invalid maxDepth must be rejected, not silently coerced to 5.
      const result = validateProjectDocumentPatch({ maxDepth: 0 })
      expect(result.ok).toBe(false)
    })
  })

  describe('computeEffectiveDocumentConfig', () => {
    it('applies canonical defaults when nothing exists and nothing patched', () => {
      const effective = computeEffectiveDocumentConfig(undefined, {})
      expect(effective.maxDepth).toBe(PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth)
      expect(effective.paths).toEqual([])
      expect(effective.excludeFolders).toEqual([])
    })

    it('preserves existing fields not in the patch', () => {
      const effective = computeEffectiveDocumentConfig(
        { paths: ['docs'], excludeFolders: ['dist'], maxDepth: 3 },
        { maxDepth: 8 },
      )
      expect(effective.paths).toEqual(['docs'])
      expect(effective.excludeFolders).toEqual(['dist'])
      expect(effective.maxDepth).toBe(8)
    })
  })

  describe('applyProjectDocumentPatch', () => {
    it('merges only provided fields and preserves siblings', () => {
      const target = { paths: ['docs'], excludeFolders: ['dist'], maxDepth: 3 }
      const effective = applyProjectDocumentPatch(target, { maxDepth: 6 })
      expect(target.paths).toEqual(['docs']) // unchanged
      expect(target.excludeFolders).toEqual(['dist']) // unchanged
      expect(target.maxDepth).toBe(6) // patched
      expect(effective.maxDepth).toBe(6)
    })
  })
})
