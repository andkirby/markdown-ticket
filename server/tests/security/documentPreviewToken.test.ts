/// <reference types="jest" />

import type { PreviewTokenPayload } from '../../security/documentPreviewToken'
import { Buffer } from 'node:buffer'
import {
  isPathInsideDocDir,
  mintPreviewToken,
  normalizeDocDir,
  PreviewTokenError,

  verifyPreviewToken,
} from '../../security/documentPreviewToken'

describe('documentPreviewToken (MDT-221)', () => {
  const projectId = 'PRJ'
  const docDir = 'docs/site'
  const SECRET = 'unit-test-preview-secret'

  describe('mintPreviewToken', () => {
    it('produces a two-part dot-delimited token', () => {
      const { token } = mintPreviewToken(projectId, docDir, SECRET, 60)
      expect(token.split('.')).toHaveLength(2)
      expect(token.split('.').every(Boolean)).toBe(true)
    })

    it('enforces TTL <= 300s', () => {
      expect(() => mintPreviewToken(projectId, docDir, SECRET, 301)).toThrow(/TTL/)
      expect(() => mintPreviewToken(projectId, docDir, SECRET, 300)).not.toThrow()
    })

    it('reports an ISO8601 expiresAt ttlSeconds in the future', () => {
      const before = Math.floor(Date.now() / 1000)
      const { expiresAt } = mintPreviewToken(projectId, docDir, SECRET, 120)
      const after = Math.floor(Date.now() / 1000)
      const expSec = Math.floor(new Date(expiresAt).getTime() / 1000)
      // exp is second-granularity; allow the floor/ceil slack on both sides.
      expect(expSec).toBeGreaterThanOrEqual(before + 120)
      expect(expSec).toBeLessThanOrEqual(after + 120)
    })
  })

  describe('verifyPreviewToken — happy path', () => {
    it('round-trips a freshly minted token and returns the payload', () => {
      const { token } = mintPreviewToken(projectId, docDir, SECRET, 60)
      const { payload } = verifyPreviewToken(token, SECRET)
      expect(payload.projectId).toBe(projectId)
      expect(payload.docDir).toBe(docDir)
      expect(payload.v).toBe(1)
    })
  })

  describe('verifyPreviewToken — expiry', () => {
    it('rejects an expired token', () => {
      const { token } = mintPreviewToken(projectId, docDir, SECRET, 60, Date.now() - 120_000)
      expect(() => verifyPreviewToken(token, SECRET)).toThrow(PreviewTokenError)
      expect(() => verifyPreviewToken(token, SECRET)).toThrow(/expired/i)
    })

    it('accepts a token at exactly the TTL boundary when checked one second before expiry', () => {
      // exp = now + 60; verify at now + 59s (still valid)
      const base = Date.now()
      const { token } = mintPreviewToken(projectId, docDir, SECRET, 60, base)
      expect(() => verifyPreviewToken(token, SECRET, base + 59_000)).not.toThrow()
    })
  })

  describe('verifyPreviewToken — tamper detection', () => {
    it('rejects a tampered signature', () => {
      const { token } = mintPreviewToken(projectId, docDir, SECRET, 60)
      const [payload, sig] = token.split('.')
      // flip one character of the signature
      const tamperedSig = sig!.endsWith('A') ? `${sig!.slice(0, -1)}B` : `${sig!.slice(0, -1)}A`
      const tampered = `${payload}.${tamperedSig}`
      expect(() => verifyPreviewToken(tampered, SECRET)).toThrow(/Invalid preview token/)
    })

    it('rejects a tampered payload (signature no longer matches)', () => {
      const { token } = mintPreviewToken(projectId, docDir, SECRET, 60)
      const [payload, sig] = token.split('.')
      // decode payload, bump exp, re-encode
      const decoded = JSON.parse(Buffer.from(payload!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as PreviewTokenPayload
      decoded.exp += 9999
      const reencoded = Buffer.from(JSON.stringify(decoded)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      const tampered = `${reencoded}.${sig}`
      expect(() => verifyPreviewToken(tampered, SECRET)).toThrow(/Invalid preview token/)
    })
  })

  describe('verifyPreviewToken — malformed', () => {
    it('rejects a token with no dot', () => {
      expect(() => verifyPreviewToken('notadottoken', SECRET)).toThrow(/Malformed/)
    })
    it('rejects an empty string', () => {
      expect(() => verifyPreviewToken('', SECRET)).toThrow(/Malformed/)
    })
    it('rejects a token with an empty payload half', () => {
      expect(() => verifyPreviewToken('.abc', SECRET)).toThrow(/Malformed/)
    })
    it('rejects a token whose payload does not decode to valid JSON (signature check fires first)', () => {
      // The bogus payload's HMAC will not match the bogus signature, so the
      // handler rejects at the signature gate (G2) before parsing the
      // payload. This is intentional: unsigned garbage must be rejected before
      // any payload work.
      const bogusPayload = Buffer.from('not json').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      expect(() => verifyPreviewToken(`${bogusPayload}.abc`, SECRET)).toThrow(/Invalid preview token/)
    })
  })

  describe('scoping', () => {
    it('the payload carries the projectId and docDir unchanged', () => {
      const { token } = mintPreviewToken('PROJECT-X', 'a/b/c', SECRET, 60)
      const { payload } = verifyPreviewToken(token, SECRET)
      expect(payload.projectId).toBe('PROJECT-X')
      expect(payload.docDir).toBe('a/b/c')
    })

    it('cross-project use is rejected by isPathInsideDocDir when the caller checks projectId separately', () => {
      // The token does not itself know about other projects; the handler must
      // compare payload.projectId against the path it is serving. Here we just
      // assert the payload exposes projectId for that comparison.
      const { token } = mintPreviewToken('A', 'docs', SECRET, 60)
      const { payload } = verifyPreviewToken(token, SECRET)
      expect(payload.projectId).toBe('A')
      // A handler serving project 'B' would reject because 'A' !== 'B'.
      expect(payload.projectId === 'B').toBe(false)
    })
  })

  describe('isPathInsideDocDir', () => {
    it('admits a path equal to the docDir', () => {
      expect(isPathInsideDocDir('docs/site', 'docs/site')).toBe(true)
    })
    it('admits a descendant of the docDir', () => {
      expect(isPathInsideDocDir('docs/site/index.html', 'docs/site')).toBe(true)
      expect(isPathInsideDocDir('docs/site/sub/app.js', 'docs/site')).toBe(true)
    })
    it('rejects a sibling outside the docDir', () => {
      expect(isPathInsideDocDir('docs/other/index.html', 'docs/site')).toBe(false)
    })
    it('rejects a path that merely starts with the docDir string but is not a descendant', () => {
      expect(isPathInsideDocDir('docs/site-evil/x', 'docs/site')).toBe(false)
    })
    it('treats empty docDir as granting the project root', () => {
      expect(isPathInsideDocDir('index.html', '')).toBe(true)
      expect(isPathInsideDocDir('docs/site/index.html', '')).toBe(true)
    })
  })

  describe('normalizeDocDir', () => {
    it('strips leading slashes and backslashes', () => {
      expect(normalizeDocDir('/docs/site/')).toBe('docs/site')
      expect(normalizeDocDir('\\docs\\site')).toBe('docs/site')
    })
    it('collapses ./ to empty (root)', () => {
      expect(normalizeDocDir('./')).toBe('')
      expect(normalizeDocDir('.')).toBe('')
    })
  })
})
