/**
 * Link Normalization System Tests
 *
 * Comprehensive test suite covering all aspects of the link normalization system
 * including security validation, relative path resolution, and multi-project support.
 */

import type { LinkContext } from '../linkNormalization'
import { beforeEach, describe, expect, it } from '@jest/globals'
import { createLinkContext, LinkNormalizer } from '../linkNormalization'

// Mock window.location for URL validation
const mockLocation = {
  origin: 'http://localhost:5173',
}

Object.defineProperty(globalThis, 'window', {
  value: {
    location: mockLocation,
  },
  writable: true,
})

describe('LinkNormalizer', () => {
  let basicContext: LinkContext

  beforeEach(() => {
    basicContext = createLinkContext({
      currentProject: 'MDT',
      sourcePath: 'docs/CRs/MDT-001.md',
    })
  })

  describe('Ticket Links', () => {
    it('should normalize basic ticket links', () => {
      const result = LinkNormalizer.normalizeLink('MDT-001', basicContext)

      expect(result.type).toBe('ticket')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/MDT/ticket/MDT-001')
      expect(result.originalHref).toBe('MDT-001')
    })

    it('should normalize ticket links with .md extension', () => {
      const result = LinkNormalizer.normalizeLink('MDT-001.md', basicContext)

      expect(result.type).toBe('ticket')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/MDT/ticket/MDT-001')
    })

    it('should normalize ticket links with anchors', () => {
      const result = LinkNormalizer.normalizeLink('MDT-001#implementation', basicContext)

      expect(result.type).toBe('ticket')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/MDT/ticket/MDT-001#implementation')
    })

    it('should handle complex ticket codes', () => {
      const result = LinkNormalizer.normalizeLink('PROJ-A001', basicContext)

      expect(result.type).toBe('ticket')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/MDT/ticket/PROJ-A001')
    })

    it('should reject invalid ticket formats', () => {
      const result = LinkNormalizer.normalizeLink('invalid-ticket', basicContext)

      expect(result.type).toBe('document') // Falls back to document processing
      expect(result.isValid).toBe(false)
    })
  })

  describe('Cross-Project Links', () => {
    it('should normalize cross-project ticket links', () => {
      const result = LinkNormalizer.normalizeLink('ABC-123', basicContext)

      expect(result.type).toBe('cross-project')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/ABC/ticket/ABC-123')
      expect(result.targetProject).toBe('ABC')
    })

    it('should handle same-project cross-project format', () => {
      const result = LinkNormalizer.normalizeLink('MDT-123', basicContext)

      expect(result.type).toBe('ticket') // Converted to regular ticket
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/MDT/ticket/MDT-123')
    })
  })

  describe('External Links', () => {
    it('should normalize HTTP links', () => {
      const result = LinkNormalizer.normalizeLink('https://example.com', basicContext)

      expect(result.type).toBe('external')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('https://example.com')
    })

    it('should normalize HTTPS links', () => {
      const result = LinkNormalizer.normalizeLink('https://github.com/user/repo', basicContext)

      expect(result.type).toBe('external')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('https://github.com/user/repo')
    })

    it('should normalize mailto links', () => {
      const result = LinkNormalizer.normalizeLink('mailto:test@example.com', basicContext)

      expect(result.type).toBe('external')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('mailto:test@example.com')
    })

    it('should reject invalid URLs', () => {
      const result = LinkNormalizer.normalizeLink('ht tp://invalid-url', basicContext)

      expect(result.type).toBe('external')
      expect(result.isValid).toBe(false)
    })
  })

  describe('Anchor Links', () => {
    it('should normalize anchor links', () => {
      const result = LinkNormalizer.normalizeLink('#section-1', basicContext)

      expect(result.type).toBe('anchor')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('#section-1')
    })
  })

  describe('Document Links', () => {
    it('should normalize same-level document links', () => {
      const result = LinkNormalizer.normalizeLink('./MDT-002.md', basicContext)

      expect(result.type).toBe('document')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/MDT/documents?file=docs/CRs/MDT-002.md')
      expect(result.filePath).toBe('docs/CRs/MDT-002.md')
    })

    it('should normalize parent directory document links', () => {
      const result = LinkNormalizer.normalizeLink('../README.md', basicContext)

      expect(result.type).toBe('document')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/MDT/documents?file=docs/README.md')
      expect(result.filePath).toBe('docs/README.md')
    })

    it('should normalize absolute document paths', () => {
      const result = LinkNormalizer.normalizeLink('/docs/guide.md', basicContext)

      expect(result.type).toBe('document')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/MDT/documents?file=docs/guide.md')
      expect(result.filePath).toBe('docs/guide.md')
    })

    it('should validate document paths against configuration', () => {
      const context = createLinkContext({
        currentProject: 'MDT',
        sourcePath: 'docs/CRs/MDT-001.md',
        documentPaths: ['docs'], // Only allow docs folder
      })

      const validResult = LinkNormalizer.normalizeLink('./MDT-002.md', context)
      expect(validResult.isValid).toBe(true)

      const invalidResult = LinkNormalizer.normalizeLink('../private/secret.md', context)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.error).toBe('Path not in configured document paths')
    })

    it('should handle document paths with anchors', () => {
      const result = LinkNormalizer.normalizeLink('./guide.md#installation', basicContext)

      expect(result.type).toBe('document')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('/prj/MDT/documents?file=docs/CRs/guide.md#installation')
    })
  })

  describe('File Links', () => {
    it('should normalize image files', () => {
      const result = LinkNormalizer.normalizeLink('./diagram.png', basicContext)

      expect(result.type).toBe('file')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('./diagram.png')
      expect(result.filePath).toBe('docs/CRs/diagram.png')
    })

    it('should normalize PDF files', () => {
      const result = LinkNormalizer.normalizeLink('./spec.pdf', basicContext)

      expect(result.type).toBe('file')
      expect(result.isValid).toBe(true)
      expect(result.webHref).toBe('./spec.pdf')
      expect(result.filePath).toBe('docs/CRs/spec.pdf')
    })

    it('should reject unsupported file types', () => {
      const result = LinkNormalizer.normalizeLink('./unknown.xyz', basicContext)

      expect(result.type).toBe('broken')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Unsupported file type')
    })
  })

  describe('Security Validation', () => {
    it('should reject path traversal attempts', () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '../../secrets.txt',
        './../../../etc/hosts',
      ]

      traversalAttempts.forEach((attempt) => {
        const result = LinkNormalizer.normalizeLink(attempt, basicContext)
        expect(result.type).toBe('broken')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Path traversal attempt detected')
      })
    })

    it('should reject paths with blacklisted components', () => {
      const blacklistedPaths = [
        './node_modules/package.json',
        '../.git/config',
        './.env',
        '../.DS_Store',
      ]

      blacklistedPaths.forEach((path) => {
        const result = LinkNormalizer.normalizeLink(path, basicContext)
        expect(result.type).toBe('broken')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Path contains blacklisted components')
      })
    })
  })

  describe('Relative Path Resolution', () => {
    it('should resolve complex relative paths', () => {
      const context = createLinkContext({
        currentProject: 'MDT',
        sourcePath: 'docs/api/v1/endpoints/user.md',
      })

      const testCases = [
        { input: '../auth/README.md', expected: 'docs/api/v1/auth/README.md' },
        { input: '../../README.md', expected: 'docs/api/README.md' },
        { input: './auth.md', expected: 'docs/api/v1/endpoints/auth.md' },
        { input: 'config.json', expected: 'docs/api/v1/endpoints/config.json' },
      ]

      testCases.forEach(({ input, expected }) => {
        const result = LinkNormalizer.normalizeLink(input, context)
        expect(result.isValid).toBe(true)
        if (result.filePath) {
          expect(result.filePath).toBe(expected)
        }
      })
    })

    it('should handle path normalization edge cases', () => {
      const context = createLinkContext({
        currentProject: 'MDT',
        sourcePath: 'docs/CRs/MDT-001.md',
      })

      const testCases = [
        { input: '././test.md', expected: 'docs/CRs/test.md' },
        { input: 'test/../other.md', expected: 'docs/CRs/other.md' },
        { input: './a/b/../c.md', expected: 'docs/CRs/a/c.md' },
      ]

      testCases.forEach(({ input, expected }) => {
        const result = LinkNormalizer.normalizeLink(input, context)
        expect(result.isValid).toBe(true)
        if (result.filePath) {
          expect(result.filePath).toBe(expected)
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', () => {
      const malformedInputs = [
        '',
        '   ',
        null as any,
        undefined as any,
        123 as any,
      ]

      malformedInputs.forEach((input) => {
        expect(() => {
          const result = LinkNormalizer.normalizeLink(input, basicContext)
          expect(result.type).toBe('broken')
          expect(result.isValid).toBe(false)
        }).not.toThrow()
      })
    })

    it('should provide meaningful error messages', () => {
      const result = LinkNormalizer.normalizeLink('../../../etc/passwd', basicContext)

      expect(result.type).toBe('broken')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
      expect(typeof result.error).toBe('string')
    })
  })

  describe('Path Resolution Utilities', () => {
    it('should resolve relative paths correctly', () => {
      const context = createLinkContext({
        currentProject: 'MDT',
        sourcePath: 'docs/CRs/MDT-001.md',
      })

      const result = LinkNormalizer.resolveRelativePath('../README.md', context)

      expect(result.isAllowed).toBe(true)
      expect(result.relativePath).toBe('docs/README.md')
      expect(result.absolutePath).toContain('docs/README.md')
    })

    it('should detect security violations in path resolution', () => {
      const context = createLinkContext({
        currentProject: 'MDT',
        sourcePath: 'docs/CRs/MDT-001.md',
      })

      const result = LinkNormalizer.resolveRelativePath('../../../etc/passwd', context)

      expect(result.isAllowed).toBe(false)
      expect(result.securityViolation).toBe('Path traversal attempt detected')
    })

    it('should check document path inclusion', () => {
      const documentPaths = ['docs', 'generated-docs', 'README.md']

      expect(LinkNormalizer.isPathInDocumentPaths('docs/guide.md', documentPaths)).toBe(true)
      expect(LinkNormalizer.isPathInDocumentPaths('generated-docs/api.md', documentPaths)).toBe(true)
      expect(LinkNormalizer.isPathInDocumentPaths('README.md', documentPaths)).toBe(true)
      expect(LinkNormalizer.isPathInDocumentPaths('private/secret.md', documentPaths)).toBe(false)
      expect(LinkNormalizer.isPathInDocumentPaths('docs/../secret.md', documentPaths)).toBe(false)
    })
  })

  describe('Web Route Building', () => {
    it('should build document web routes correctly', () => {
      const route = LinkNormalizer.buildDocumentWebRoute('MDT', 'docs/guide.md')

      expect(route).toBe('/prj/MDT/documents?file=docs%2Fguide.md')
    })

    it('should build ticket web routes correctly', () => {
      const route = LinkNormalizer.buildTicketWebRoute('MDT', 'MDT-001')

      expect(route).toBe('/prj/MDT/ticket/MDT-001')
    })

    it('should build ticket web routes with anchors', () => {
      const route = LinkNormalizer.buildTicketWebRoute('MDT', 'MDT-001', '#implementation')

      expect(route).toBe('/prj/MDT/ticket/MDT-001#implementation')
    })

    it('should handle special characters in document paths', () => {
      const route = LinkNormalizer.buildDocumentWebRoute('MDT', 'docs/guide v2.0.md')

      expect(route).toBe('/prj/MDT/documents?file=docs%2Fguide%20v2.0.md')
    })
  })
})

describe('createLinkContext', () => {
  it('should create link context with defaults', () => {
    const context = createLinkContext({
      currentProject: 'TEST',
      sourcePath: 'test.md',
    })

    expect(context.currentProject).toBe('TEST')
    expect(context.sourcePath).toBe('test.md')
    expect(context.documentPaths).toEqual([])
    expect(context.webBasePath).toBe('/prj')
  })

  it('should create link context with custom values', () => {
    const projectConfig = {
      document: {
        paths: ['docs', 'generated-docs'],
      },
    }

    const context = createLinkContext({
      currentProject: 'TEST',
      sourcePath: 'test.md',
      projectConfig,
      documentPaths: ['custom-docs'],
      webBasePath: '/custom',
    })

    expect(context.currentProject).toBe('TEST')
    expect(context.sourcePath).toBe('test.md')
    expect(context.projectConfig).toBe(projectConfig)
    expect(context.documentPaths).toEqual(['custom-docs'])
    expect(context.webBasePath).toBe('/custom')
  })
})
