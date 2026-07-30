/**
 * TEST-trusted-service-profile — covers BR-1.3, C4, Edge-5.
 *
 * Source: docs/CRs/MDT-201/requirements.md § Security Decisions,
 *         docs/architecture/cloud-sync/README.md § Local Cloud Connection.
 *
 * Verifies the effective trusted service profile:
 *   - Distribution-provided HTTPS service origins are trusted by default.
 *   - Operators may add exact-HTTPS extensions through global config
 *     (`cloudSync.allowedOrigins`); arbitrary origins remain denied.
 *   - Repository data cannot supply, select, or redirect the privileged
 *     provisioning endpoint or the coordination origin.
 *   - An untrusted or changed service origin in a CONFIG_DIR connection fails
 *     closed (Edge-5); no credential is sent to the untrusted origin.
 *   - The profile composes with the existing coordination-origin allowlist.
 */

import { describe, expect, it } from '@jest/globals'

import {
  DISTRIBUTION_CLOUD_SYNC_ORIGINS,
  DISTRIBUTION_COORDINATION_ORIGIN,
  DISTRIBUTION_PROVISIONING_ORIGIN,
} from '../config'
import {
  TrustedServiceProfile,
  resolveTrustedServiceProfile,
  type TrustedServiceProfileInputs,
} from '../trusted-service-profile'

const DISTRIBUTION_ORIGIN = DISTRIBUTION_COORDINATION_ORIGIN

describe('TrustedServiceProfile (TEST-trusted-service-profile)', () => {
  describe('effective trusted-origin set', () => {
    it('trusts distribution-provided origins without operator configuration', () => {
      const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
      expect(profile.origins).toContain(DISTRIBUTION_ORIGIN)
      expect(profile.isTrusted(DISTRIBUTION_ORIGIN)).toBe(true)
    })

    it('merges operator-controlled exact-HTTPS extensions with distribution origins', () => {
      const profile = resolveTrustedServiceProfile({
        operatorOrigins: ['https://self-hosted.example.com'],
      })
      expect(profile.origins).toEqual([
        ...DISTRIBUTION_CLOUD_SYNC_ORIGINS,
        'https://self-hosted.example.com',
      ])
      expect(profile.isTrusted('https://self-hosted.example.com')).toBe(true)
    })

    it('de-duplicates when an operator origin duplicates a distribution origin', () => {
      const profile = resolveTrustedServiceProfile({
        operatorOrigins: [DISTRIBUTION_ORIGIN],
      })
      expect(profile.origins).toEqual([...DISTRIBUTION_CLOUD_SYNC_ORIGINS])
    })

    it('rejects operator origins that are not exact HTTPS (no path, http, wildcard)', () => {
      const profile = resolveTrustedServiceProfile({
        operatorOrigins: [
          'http://insecure.example.com',
          'https://self-hosted.example.com/path',
          'https://*.example.com',
          'not-a-url',
        ],
      })
      // None of the malformed operator origins are trusted; only distribution.
      expect(profile.origins).toEqual([...DISTRIBUTION_CLOUD_SYNC_ORIGINS])
      expect(profile.isTrusted('http://insecure.example.com')).toBe(false)
    })

    it('denies an arbitrary origin that is neither distribution nor operator-configured', () => {
      const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
      expect(profile.isTrusted('https://evil.example.com')).toBe(false)
    })
  })

  describe('repository data cannot supply or redirect endpoints', () => {
    it('repository service origin is ignored when resolving the trusted profile', () => {
      // The profile inputs take ONLY operator + distribution data; a repository
      // service origin field is not an input and cannot add trust.
      const inputs: TrustedServiceProfileInputs = { operatorOrigins: [] }
      const profile = resolveTrustedServiceProfile(inputs)
      expect(profile.isTrusted('https://repo-injected.example.com')).toBe(false)
    })

    it('the privileged provisioning endpoint comes only from the trusted profile', () => {
      const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
      // The provisioning origin is the distribution ADMIN endpoint (operator
      // audience), not a repository-supplied value. It is distinct from the
      // coordination origin so enable requests an operator-audience token.
      expect(profile.provisioningOrigin).toBe(DISTRIBUTION_PROVISIONING_ORIGIN)
      expect(profile.provisioningOrigin).not.toBe(profile.coordinationOriginDefault)
    })

    it('the coordination default is the distribution coordination endpoint', () => {
      const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
      expect(profile.coordinationOriginDefault).toBe(DISTRIBUTION_COORDINATION_ORIGIN)
    })

    it('a repository-supplied alternative provisioning origin is never selected', () => {
      const profile = new TrustedServiceProfile({
        origins: [DISTRIBUTION_ORIGIN],
        provisioningOrigin: DISTRIBUTION_ORIGIN,
        coordinationOriginDefault: DISTRIBUTION_ORIGIN,
      })
      // Even if a caller attempts to override the provisioning origin from
      // repository data, the profile does not expose a setter for it.
      expect((profile as unknown as { setProvisioningOrigin?: unknown }).setProvisioningOrigin).toBeUndefined()
      expect(profile.provisioningOrigin).toBe(DISTRIBUTION_ORIGIN)
    })
  })

  describe('untrusted or changed connection origin fails closed (Edge-5)', () => {
    it('a connection whose serviceOrigin is not in the trusted profile fails closed', () => {
      const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
      const check = profile.checkConnectionOrigin({
        version: 1,
        state: 'enabled',
        cloudProjectId: 'uuid-1',
        serviceOrigin: 'https://evil.example.com',
        pollIntervalSeconds: 15,
      })
      expect(check.kind).toBe('untrusted')
      if (check.kind === 'untrusted') {
        expect(check.reason).not.toContain('evil.example.com')
      }
    })

    it('a connection whose serviceOrigin matches the trusted profile is accepted', () => {
      const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
      const check = profile.checkConnectionOrigin({
        version: 1,
        state: 'enabled',
        cloudProjectId: 'uuid-1',
        serviceOrigin: DISTRIBUTION_ORIGIN,
        pollIntervalSeconds: 15,
      })
      expect(check.kind).not.toBe('untrusted')
    })

    it('the denial reason never echoes the untrusted origin back (no path leak)', () => {
      const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
      const check = profile.checkConnectionOrigin({
        version: 1,
        state: 'enabled',
        cloudProjectId: 'uuid-1',
        serviceOrigin: 'https://attacker.example.com',
        pollIntervalSeconds: 15,
      })
      // The reason string never echoes the untrusted origin back. The connection
      // is retained by the caller for operator-facing diagnostics (the origin
      // itself is non-secret), so we assert the reason only.
      expect(check.kind).toBe('untrusted')
      if (check.kind === 'untrusted') {
        expect(check.reason).not.toContain('attacker.example.com')
      }
    })
  })
})
