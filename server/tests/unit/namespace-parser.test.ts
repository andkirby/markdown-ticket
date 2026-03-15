/**
 * Namespace Parser Unit Tests - MDT-138.
 *
 * Tests for dot-notation filename parsing to create virtual folders.
 * Covers: parseNamespace, groupNamespacedFiles functions.
 *
 * Requirements trace:
 * - BR-2: Files matching {type}.{semantic}.md are grouped under [type >] namespace
 * - BR-5: a.b.c.md displays as [a >] [b.c] (multiple dots preserved)
 * - Edge-1: a.b.c.d.md → namespace 'a', sub-key 'b.c.d'
 * - Edge-3: tests.e2e-smoke.md → namespace 'tests', sub-key 'e2e-smoke' (hyphens preserved)
 */

import type { SubDocument } from '@mdt/shared/models/SubDocument.js'
import { parseNamespace, groupNamespacedFiles } from '../../services/TicketService.js'

describe('parseNamespace', () => {
  describe('basic parsing', () => {
    it('returns null for files without dot', () => {
      expect(parseNamespace('architecture')).toBeNull()
      expect(parseNamespace('requirements')).toBeNull()
      expect(parseNamespace('tests')).toBeNull()
    })

    it('parses simple two-part filename', () => {
      const result = parseNamespace('architecture.approve-it')
      expect(result).toEqual({
        namespace: 'architecture',
        subKey: 'approve-it',
      })
    })

    it('parses three-part filename (BR-5)', () => {
      const result = parseNamespace('a.b.c')
      expect(result).toEqual({
        namespace: 'a',
        subKey: 'b.c',
      })
    })

    it('preserves multiple dots in sub-key (Edge-1)', () => {
      const result = parseNamespace('a.b.c.d')
      expect(result).toEqual({
        namespace: 'a',
        subKey: 'b.c.d',
      })
    })

    it('preserves hyphens in sub-key (Edge-3)', () => {
      const result = parseNamespace('tests.e2e-smoke')
      expect(result).toEqual({
        namespace: 'tests',
        subKey: 'e2e-smoke',
      })
    })
  })

  describe('edge cases', () => {
    it('handles single character namespace', () => {
      const result = parseNamespace('a.b')
      expect(result).toEqual({
        namespace: 'a',
        subKey: 'b',
      })
    })

    it('handles numeric parts', () => {
      const result = parseNamespace('tests.1')
      expect(result).toEqual({
        namespace: 'tests',
        subKey: '1',
      })
    })

    it('handles underscores', () => {
      const result = parseNamespace('architecture.api_v2')
      expect(result).toEqual({
        namespace: 'architecture',
        subKey: 'api_v2',
      })
    })

    it('handles mixed special characters', () => {
      const result = parseNamespace('docs.v1.2-beta')
      expect(result).toEqual({
        namespace: 'docs',
        subKey: 'v1.2-beta',
      })
    })
  })
})

describe('groupNamespacedFiles', () => {
  describe('namespace grouping', () => {
    it('creates virtual folder for dot-notation files (BR-2)', () => {
      const files = ['architecture.approve-it', 'architecture.update.v2']
      const result = groupNamespacedFiles(files, new Set())

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('architecture')
      expect(result[0].kind).toBe('folder')
      expect(result[0].isVirtual).toBe(true)
      expect(result[0].children).toHaveLength(2)
      expect(result[0].children.map(c => c.name)).toEqual(['approve-it', 'update.v2'])
    })

    it('includes [main] tab when root file exists', () => {
      const files = ['architecture', 'architecture.approve-it', 'architecture.beta']
      const result = groupNamespacedFiles(files, new Set())

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('architecture')
      expect(result[0].children.map(c => c.name)).toEqual(['main', 'approve-it', 'beta'])
    })

    it('omits [main] tab when no root file exists', () => {
      const files = ['tests.one', 'tests.two']
      const result = groupNamespacedFiles(files, new Set())

      expect(result).toHaveLength(1)
      expect(result[0].children.map(c => c.name)).toEqual(['one', 'two'])
      expect(result[0].children).not.toContainEqual(expect.objectContaining({ name: 'main' }))
    })

    it('sorts sub-tabs alphanumerically', () => {
      const files = ['architecture.zeta', 'architecture.alpha', 'architecture.beta']
      const result = groupNamespacedFiles(files, new Set())

      expect(result[0].children.map(c => c.name)).toEqual(['alpha', 'beta', 'zeta'])
    })
  })

  describe('multiple dots preservation (BR-5)', () => {
    it('preserves b.c as sub-key for a.b.c.md', () => {
      const files = ['a.b.c']
      const result = groupNamespacedFiles(files, new Set())

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('a')
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].name).toBe('b.c')
    })
  })

  describe('folder coexistence', () => {
    it('marks virtual folder when no physical folder exists', () => {
      const files = ['bdd.scenario-1']
      const result = groupNamespacedFiles(files, new Set())

      expect(result[0].isVirtual).toBe(true)
    })

    it('does not mark as virtual when physical folder exists', () => {
      const files = ['bdd.scenario-1']
      const existingFolders = new Set(['bdd'])
      const result = groupNamespacedFiles(files, existingFolders)

      expect(result[0].isVirtual).toBe(false)
    })
  })

  describe('mixed scenarios', () => {
    it('handles standalone files alongside namespaced files', () => {
      const files = ['requirements', 'architecture', 'architecture.approve-it']
      const result = groupNamespacedFiles(files, new Set())

      // Should have requirements as standalone and architecture as namespace
      expect(result).toHaveLength(2)
      expect(result.find(r => r.name === 'requirements')?.kind).toBe('file')
      expect(result.find(r => r.name === 'architecture')?.kind).toBe('folder')
    })

    it('handles multiple namespaces', () => {
      const files = ['architecture.approve-it', 'tests.one', 'tests.two']
      const result = groupNamespacedFiles(files, new Set())

      expect(result).toHaveLength(2)
      expect(result.find(r => r.name === 'architecture')).toBeDefined()
      expect(result.find(r => r.name === 'tests')).toBeDefined()
    })
  })

  describe('performance constraint (C-1)', () => {
    it('completes parsing within 10ms for typical ticket', () => {
      const files = [
        'requirements',
        'requirements.scope',
        'requirements.constraints',
        'architecture',
        'architecture.approve-it',
        'architecture.update.v2',
        'architecture.review',
        'tests',
        'tests.unit',
        'tests.e2e-smoke',
        'tasks',
      ]

      const start = performance.now()
      groupNamespacedFiles(files, new Set())
      const duration = performance.now() - start

      expect(duration).toBeLessThan(10)
    })

    it('completes parsing within 10ms for large ticket (50 subdocuments)', () => {
      const files: string[] = []
      for (let i = 0; i < 50; i++) {
        files.push(`architecture.variant-${i}`)
      }

      const start = performance.now()
      groupNamespacedFiles(files, new Set())
      const duration = performance.now() - start

      expect(duration).toBeLessThan(10)
    })
  })
})
