/**
 * MDT-237: Document existence cache
 *
 * RED until implementation. Contract per docs/CRs/MDT-237/architecture.md:
 * one deduped GET /api/documents per project, sync lookup, subscription.
 *
 * @tags MDT-237
 */
import { afterEach, describe, expect, it } from 'bun:test'

import { __testReset, __testSeed, getCachedDocumentIndex, subscribeDocumentIndex } from './documentExistenceCache'

describe('MDT-237: documentExistenceCache', () => {
  afterEach(() => {
    __testReset()
  })

  it('returns null while the index is not loaded', () => {
    expect(getCachedDocumentIndex('p1')).toBeNull()
  })

  it('reports membership after seeding (BR-2.1 signal)', () => {
    __testSeed('p1', ['docs/CRs/MDT-237/architecture.md', 'README.md'])
    const idx = getCachedDocumentIndex('p1')
    expect(idx).not.toBeNull()
    expect(idx!.has('docs/CRs/MDT-237/architecture.md')).toBe(true)
    expect(idx!.has('docs/missing.md')).toBe(false)
  })

  it('scopes indexes per project', () => {
    __testSeed('p1', ['a.md'])
    __testSeed('p2', ['b.md'])
    expect(getCachedDocumentIndex('p1')!.has('b.md')).toBe(false)
    expect(getCachedDocumentIndex('p2')!.has('b.md')).toBe(true)
  })

  it('notifies subscribers when the index changes', () => {
    let notified = 0
    const unsub = subscribeDocumentIndex('p1', () => {
      notified++
    })
    __testSeed('p1', ['a.md'])
    expect(notified).toBe(1)
    unsub()
    __testSeed('p1', ['a.md', 'b.md'])
    expect(notified).toBe(1)
  })

  // UAT 2026-09-12 (BR-2.8): coverage is the evidence standard for the
  // broken flag — absence is only knowable inside prefixes the index lists.
  describe('coversPrefix (BR-2.8)', () => {
    it('reports true for a directory with indexed files', () => {
      __testSeed('p1', ['research/brief.md', 'docs/guide.md'])
      expect(getCachedDocumentIndex('p1')!.coversPrefix('research/')).toBe(true)
      expect(getCachedDocumentIndex('p1')!.coversPrefix('docs/')).toBe(true)
    })

    it('reports false for prefixes the index never lists (tickets area, unconfigured dirs)', () => {
      __testSeed('p1', ['research/brief.md'])
      expect(getCachedDocumentIndex('p1')!.coversPrefix('.tickets/')).toBe(false)
      expect(getCachedDocumentIndex('p1')!.coversPrefix('docs/CRs/')).toBe(false)
      expect(getCachedDocumentIndex('p1')!.coversPrefix('unconfigured/')).toBe(false)
    })

    it('reports false for an empty index (nothing is knowable)', () => {
      __testSeed('p1', [])
      expect(getCachedDocumentIndex('p1')!.coversPrefix('')).toBe(false)
    })
  })
})
