/**
 * Sub-document path validation tests.
 *
 * MDT-094 established the .md-only path model; MDT-221 UAT r2 extends it to
 * .html/.htm (extension kept end-to-end) for sandboxed ticket-view previews.
 */

import { describe, expect, it } from 'bun:test'
import { apiPathToUrlPath, extractSubDocPath, urlPathToApiPath, validateSubDocPath } from './subdocPathValidation'

describe('validateSubDocPath', () => {
  it('accepts .md paths (legacy behavior)', () => {
    expect(validateSubDocPath('prep/test.md')).toBe(true)
    expect(validateSubDocPath('part-1/chapter-1/intro.md')).toBe(true)
  })

  it('accepts .html and .htm paths (MDT-221 UAT r2)', () => {
    expect(validateSubDocPath('diagrams/flow.html')).toBe(true)
    expect(validateSubDocPath('flow.htm')).toBe(true)
    expect(validateSubDocPath('sketch.html')).toBe(true)
  })

  it('rejects paths without a known document extension', () => {
    expect(validateSubDocPath('prep/doc')).toBe(false)
    expect(validateSubDocPath('diagrams/flow.bin')).toBe(false)
    expect(validateSubDocPath('data.json')).toBe(false)
  })

  it('rejects traversal, absolute paths, and empty basenames', () => {
    expect(validateSubDocPath('../etc/passwd.md')).toBe(false)
    expect(validateSubDocPath('../etc/passwd.html')).toBe(false)
    expect(validateSubDocPath('/absolute/path.md')).toBe(false)
    expect(validateSubDocPath('.html')).toBe(false)
    expect(validateSubDocPath('')).toBe(false)
  })
})

describe('urlPathToApiPath', () => {
  it('strips .md (legacy behavior)', () => {
    expect(urlPathToApiPath('prep/test.md')).toBe('prep/test')
    expect(urlPathToApiPath('tests.trace.md')).toBe('tests.trace')
  })

  it('keeps .html/.htm extensions (MDT-221 UAT r2)', () => {
    expect(urlPathToApiPath('diagrams/flow.html')).toBe('diagrams/flow.html')
    expect(urlPathToApiPath('flow.htm')).toBe('flow.htm')
  })
})

describe('apiPathToUrlPath', () => {
  it('appends .md to extension-less paths (legacy behavior)', () => {
    expect(apiPathToUrlPath('prep/test')).toBe('prep/test.md')
    expect(apiPathToUrlPath('part-1/chapter-1/intro')).toBe('part-1/chapter-1/intro.md')
  })

  it('does not append .md to paths that already carry a document extension', () => {
    expect(apiPathToUrlPath('diagrams/flow.html')).toBe('diagrams/flow.html')
    expect(apiPathToUrlPath('flow.htm')).toBe('flow.htm')
    expect(apiPathToUrlPath('prep/test.md')).toBe('prep/test.md')
  })
})

describe('extractSubDocPath', () => {
  it('extracts .html sub-document paths from project ticket URLs', () => {
    expect(extractSubDocPath('/prj/GPDE/ticket/GPDE-012/diagrams/coverage-dataflow.html', 'GPDE-012'))
      .toBe('diagrams/coverage-dataflow.html')
  })

  it('extracts .md sub-document paths (legacy behavior)', () => {
    expect(extractSubDocPath('/prj/MDT/ticket/MDT-093/prep/test.md', 'MDT-093')).toBe('prep/test.md')
  })

  it('returns null for unsupported extensions and traversal', () => {
    expect(extractSubDocPath('/prj/GPDE/ticket/GPDE-012/diagrams/data.json', 'GPDE-012')).toBeNull()
    expect(extractSubDocPath('/prj/GPDE/ticket/GPDE-012/../secrets.html', 'GPDE-012')).toBeNull()
  })
})
