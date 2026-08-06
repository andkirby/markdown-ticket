/// <reference types="jest" />

import type { Request } from 'express'
import { isPublicReadRoute } from '../../security/accessPolicy'
import {
  extractApiCredential,
  isApiAuthExemptRoute,
  isLocalHostRequest,
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

  // MDT-157 UAT 2026-08-06 — loopback-host no-auth carve-out
  describe('parseApiAuthConfig local bypass defaults', () => {
    it('includes default localHosts and disables bypass in test env by default', () => {
      // Test runs on loopback; defaulting bypass on would make every auth test
      // silently pass through the carve-out. Tests opt in explicitly.
      const cfg = parseApiAuthConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)
      expect(cfg.localHosts).toEqual(['localhost', '127.0.0.1', '::1'])
      expect(cfg.localHostBypassEnabled).toBe(false)
    })

    it('enables bypass by default for native local dev (undefined/development/local), off in production/test', () => {
      // undefined NODE_ENV is the documented `bunx tsx server.ts` dev path.
      expect(parseApiAuthConfig({} as NodeJS.ProcessEnv).localHostBypassEnabled).toBe(true)
      expect(parseApiAuthConfig({ NODE_ENV: 'development' } as NodeJS.ProcessEnv).localHostBypassEnabled).toBe(true)
      expect(parseApiAuthConfig({ NODE_ENV: 'local' } as NodeJS.ProcessEnv).localHostBypassEnabled).toBe(true)
      expect(parseApiAuthConfig({ NODE_ENV: 'production' } as NodeJS.ProcessEnv).localHostBypassEnabled).toBe(false)
      expect(parseApiAuthConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv).localHostBypassEnabled).toBe(false)
    })

    it('parses API_LOCAL_HOSTS as a lowercase CSV with dedupe', () => {
      const cfg = parseApiAuthConfig({
        NODE_ENV: 'test',
        API_LOCAL_HOSTS: 'Localhost, 127.0.0.1, dev.box, localhost',
      } as NodeJS.ProcessEnv)
      expect(cfg.localHosts).toEqual(['localhost', '127.0.0.1', 'dev.box'])
    })

    it('falls back to defaults for empty/whitespace API_LOCAL_HOSTS', () => {
      const cfg = parseApiAuthConfig({ NODE_ENV: 'test', API_LOCAL_HOSTS: '   ' } as NodeJS.ProcessEnv)
      expect(cfg.localHosts).toEqual(['localhost', '127.0.0.1', '::1'])
    })

    it('honors explicit API_LOCAL_HOST_Bypass true/false', () => {
      expect(parseApiAuthConfig({ NODE_ENV: 'production', API_LOCAL_HOST_BYPASS: 'true' } as NodeJS.ProcessEnv).localHostBypassEnabled).toBe(true)
      expect(parseApiAuthConfig({ NODE_ENV: 'test', API_LOCAL_HOST_BYPASS: 'false' } as NodeJS.ProcessEnv).localHostBypassEnabled).toBe(false)
    })

    it('rejects an invalid API_LOCAL_HOST_BYPASS value', () => {
      expect(() => parseApiAuthConfig({ NODE_ENV: 'test', API_LOCAL_HOST_BYPASS: 'maybe' } as NodeJS.ProcessEnv)).toThrow(/API_LOCAL_HOST_BYPASS/)
    })
  })

  describe('isLocalHostRequest', () => {
    const localHosts = ['localhost', '127.0.0.1', '::1']

    it.each([
      ['localhost', 'Host: localhost'],
      ['localhost:3075', 'Host: localhost:3075 (with port)'],
      ['127.0.0.1', 'Host: 127.0.0.1'],
      ['127.0.0.1:3001', 'Host: 127.0.0.1:3001 (with port)'],
      ['[::1]', 'Host: [::1] (bracketed IPv6)'],
      ['[::1]:3001', 'Host: [::1]:3001 (bracketed IPv6 with port)'],
    ])('accepts %s (%s)', (host) => {
      expect(isLocalHostRequest(mockRequest({ host }), localHosts)).toBe(true)
    })

    it.each([
      ['evil.example', 'arbitrary domain'],
      ['tunnel.trycloudflare.com', 'tunnel hostname'],
      ['localhost.evil', 'lookalike: localhost.evil'],
      ['localhost.evil.example', 'lookalike: localhost.evil.example'],
      ['127.0.0.1.evil', 'lookalike: 127.0.0.1.evil'],
      ['127.0.0.1.evil.example', 'lookalike: 127.0.0.1.evil.example'],
      ['Localhost.evil', 'mixed-case lookalike'],
    ])('rejects %s (%s)', (host) => {
      expect(isLocalHostRequest(mockRequest({ host }), localHosts)).toBe(false)
    })

    it('rejects missing Host', () => {
      expect(isLocalHostRequest(mockRequest({}), localHosts)).toBe(false)
    })

    it('rejects malformed Host', () => {
      expect(isLocalHostRequest(mockRequest({ host: '   ' }), localHosts)).toBe(false)
    })

    it('ignores X-Forwarded-Host when Host is non-local (Edge-5 / C4)', () => {
      // Forged forwarded header must not override the real Host.
      const req = mockRequest({ 'host': 'tunnel.trycloudflare.com', 'x-forwarded-host': 'localhost' })
      expect(isLocalHostRequest(req, localHosts)).toBe(false)
    })

    it('honors a custom API_LOCAL_HOSTS set', () => {
      expect(isLocalHostRequest(mockRequest({ host: 'dev.box:3001' }), ['dev.box'])).toBe(true)
      expect(isLocalHostRequest(mockRequest({ host: 'localhost' }), ['dev.box'])).toBe(false)
    })
  })
})

function mockRequest(headers: Record<string, string>): Request {
  return { headers } as unknown as Request
}
