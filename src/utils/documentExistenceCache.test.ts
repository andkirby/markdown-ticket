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
})
