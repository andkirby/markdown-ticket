/**
 * MDT-150 Constraint Regression Tests
 *
 * C3: Must work for relative paths, bare filenames, and sibling ticket references
 * C4: SmartLink must not perform security checks or file existence validation
 *
 * Tests for linkBuilder and linkNormalization utility functions.
 */
import { describe, expect, it } from 'bun:test'
import { buildDocumentLink, buildTicketLink } from './linkBuilder'

describe('MDT-150: linkBuilder constraint regression (C3, C4)', () => {
  describe('C3: linkBuilder handles all path formats', () => {
    // NOTE: These tests lock the CURRENT behavior of linkBuilder which uses ?file= query params.
    // Task 2 migrates documents routing to path-style (/prj/:code/documents/:path).
    // After Task 2, buildDocumentLink() will be updated to use path-style URLs
    // and these tests will be updated to match the new format.
    // The regression value is: linkBuilder must still accept all path formats (bare, relative, sibling).
    it('builds ticket link with bare ticket key', () => {
      expect(buildTicketLink('MDT', 'MDT-150')).toBe('/prj/MDT/ticket/MDT-150')
    })

    it('builds ticket link with anchor', () => {
      expect(buildTicketLink('MDT', 'MDT-150', '#overview')).toBe('/prj/MDT/ticket/MDT-150#overview')
    })

    it('builds document link with bare filename', () => {
      const result = buildDocumentLink('MDT', 'architecture.md')
      expect(result).toBe('/prj/MDT/documents?file=architecture.md')
    })

    it('builds document link with relative path', () => {
      const result = buildDocumentLink('MDT', 'docs/CRs/MDT-150/architecture.md')
      expect(result).toBe('/prj/MDT/documents?file=docs%2FCRs%2FMDT-150%2Farchitecture.md')
    })

    it('builds document link with sibling path', () => {
      const result = buildDocumentLink('MDT', '../MDT-151.md')
      expect(result).toBe('/prj/MDT/documents?file=..%2FMDT-151.md')
    })
  })

  describe('C4: linkBuilder does not validate existence or security', () => {
    it('builds link for non-existent path without error', () => {
      // linkBuilder does not check if the file exists
      const result = buildDocumentLink('MDT', 'nonexistent/file.md')
      expect(result).toContain('/prj/MDT/documents')
      expect(result).toContain('nonexistent%2Ffile.md')
    })

    it('builds link for any project code without validation', () => {
      // linkBuilder does not validate the project code beyond non-empty
      const result = buildDocumentLink('FAKE', 'anything.md')
      expect(result).toBe('/prj/FAKE/documents?file=anything.md')
    })

    it('throws on empty project code (input validation only, not security)', () => {
      expect(() => buildDocumentLink('', 'file.md')).toThrow('Project code is required')
      expect(() => buildTicketLink('', 'MDT-150')).toThrow('Project code is required')
    })

    it('throws on empty ticket key (input validation only, not security)', () => {
      expect(() => buildTicketLink('MDT', '')).toThrow('Ticket key is required')
    })
  })
})
