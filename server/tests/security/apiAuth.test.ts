/// <reference types="jest" />

import type { Request } from 'express'
import { isPublicReadRoute } from '../../security/accessPolicy'
import {
  extractApiCredential,
  isApiAuthExemptRoute,
  parseApiAuthConfig,
  timingSafeTokenMatches,
} from '../../security/apiAuth'

describe('backend API auth security utilities - MDT-157', () => {
  describe('parseApiAuthConfig', () => {
    it('keeps local/test no-auth compatibility when auth env is absent', () => {
      expect(parseApiAuthConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toMatchObject({
        enabled: false,
        migrationWarningRequired: false,
      })
    })

    it('requires an admin token when backend auth is explicitly enabled', () => {
      expect(() => parseApiAuthConfig({
        NODE_ENV: 'production',
        API_SECURITY_AUTH: 'true',
      } as NodeJS.ProcessEnv)).toThrow(/API_AUTH_TOKEN/)
    })

    it('emits migration guidance for non-local deployments with no auth config', () => {
      expect(parseApiAuthConfig({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toMatchObject({
        enabled: false,
        migrationWarningRequired: true,
      })
    })
  })

  describe('credential extraction', () => {
    it('accepts Authorization Bearer and X-API-Key credentials only', () => {
      expect(extractApiCredential(mockRequest({ authorization: 'Bearer secret' }))).toBe('secret')
      expect(extractApiCredential(mockRequest({ 'x-api-key': 'secret' }))).toBe('secret')

      expect(extractApiCredential(mockRequest({ authorization: 'Basic abc' }))).toBeNull()
      expect(extractApiCredential(mockRequest({ origin: 'https://app.example.test' }))).toBeNull()
      expect(extractApiCredential(mockRequest({ referer: 'https://app.example.test' }))).toBeNull()
      expect(extractApiCredential(mockRequest({ 'x-forwarded-user': 'admin' }))).toBeNull()
    })

    it('rejects empty and malformed Bearer values', () => {
      expect(extractApiCredential(mockRequest({ authorization: 'Bearer' }))).toBeNull()
      expect(extractApiCredential(mockRequest({ authorization: 'Bearer ' }))).toBeNull()
      expect(extractApiCredential(mockRequest({ authorization: 'Bearer one two' }))).toBeNull()
      expect(extractApiCredential(mockRequest({ 'x-api-key': '' }))).toBeNull()
    })
  })

  describe('timing-safe token matching', () => {
    it('matches equal tokens and rejects empty, different-length, and equal-length invalid tokens', () => {
      expect(timingSafeTokenMatches('expected-token', 'expected-token')).toBe(true)
      expect(timingSafeTokenMatches('', 'expected-token')).toBe(false)
      expect(timingSafeTokenMatches('short', 'expected-token')).toBe(false)
      expect(timingSafeTokenMatches('wronged-token', 'expected-token')).toBe(false)
    })
  })

  describe('route exemptions', () => {
    it('exempts only GET /api/status and GET /api/health', () => {
      expect(isApiAuthExemptRoute('GET', '/api/status')).toBe(true)
      expect(isApiAuthExemptRoute('GET', '/api/health')).toBe(true)

      expect(isApiAuthExemptRoute('POST', '/api/status')).toBe(false)
      expect(isApiAuthExemptRoute('GET', '/api/projects')).toBe(false)
      expect(isApiAuthExemptRoute('GET', '/api/status/details')).toBe(false)
    })

    it('MDT-221: exempts GET /api/documents/raw-preview/* (token is the credential)', () => {
      expect(isApiAuthExemptRoute('GET', '/api/documents/raw-preview/abc.docs/site/index.html')).toBe(true)
      expect(isApiAuthExemptRoute('GET', '/api/documents/raw-preview/x/style.css')).toBe(true)
    })

    it('MDT-221: raw-preview exemption is GET-only (no HEAD/OPTIONS/POST method creep)', () => {
      expect(isApiAuthExemptRoute('HEAD', '/api/documents/raw-preview/x')).toBe(false)
      expect(isApiAuthExemptRoute('OPTIONS', '/api/documents/raw-preview/x')).toBe(false)
      expect(isApiAuthExemptRoute('POST', '/api/documents/raw-preview/x')).toBe(false)
    })

    it('MDT-221: does NOT exempt /api/documents/preview-token (mint endpoint requires owner auth)', () => {
      expect(isApiAuthExemptRoute('GET', '/api/documents/preview-token')).toBe(false)
      expect(isApiAuthExemptRoute('POST', '/api/documents/preview-token')).toBe(false)
    })
  })

  describe('MDT-221 public-read carve-out', () => {
    it('raw-preview prefix is NOT public-read across GET/HEAD/OPTIONS (defense-in-depth)', () => {
      expect(isPublicReadRoute('/api/documents/raw-preview/x', 'GET')).toBe(false)
      expect(isPublicReadRoute('/api/documents/raw-preview/x', 'HEAD')).toBe(false)
      expect(isPublicReadRoute('/api/documents/raw-preview/x', 'OPTIONS')).toBe(false)
    })

    it('the broad /api/documents public-read grant still covers other document routes', () => {
      expect(isPublicReadRoute('/api/documents', 'GET')).toBe(true)
      expect(isPublicReadRoute('/api/documents/content', 'GET')).toBe(true)
      expect(isPublicReadRoute('/api/documents?projectId=P', 'GET')).toBe(true)
    })

    it('POST is never public-read (mutation candidate, not safe)', () => {
      expect(isPublicReadRoute('/api/documents/raw-preview/x', 'POST')).toBe(false)
      expect(isPublicReadRoute('/api/documents', 'POST')).toBe(false)
    })
  })
})

function mockRequest(headers: Record<string, string>): Request {
  return { headers } as unknown as Request
}
