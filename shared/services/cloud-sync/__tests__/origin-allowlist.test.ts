/**
 * TEST-origin-allowlist — covers C6.
 *
 * Verifies shipped origins are trusted, custom origins are denied by default,
 * and project files cannot expand trust (the allowlist is global-only).
 */

import { describe, expect, it } from '@jest/globals'
import { buildEffectiveCloudSyncConfig, checkOriginAllowlist, DISTRIBUTION_CLOUD_SYNC_ORIGINS } from '../config'

describe('origin allowlist (C6)', () => {
  it('denies every origin when the allowlist is empty (default)', () => {
    const result = checkOriginAllowlist('https://mdt-sync.example.com', { allowedOrigins: [] })
    expect(result.allowed).toBe(false)
    expect(result).toEqual({ allowed: false, reason: 'empty_allowlist' })
  })

  it('allows the distribution-provided origin without a per-device allowlist entry', () => {
    const result = checkOriginAllowlist(
      'https://mdt-sync.constantapp.org',
      buildEffectiveCloudSyncConfig({ allowedOrigins: [] }),
    )
    expect(result.allowed).toBe(true)
  })

  it('merges operator-controlled custom origins with distribution origins', () => {
    expect(buildEffectiveCloudSyncConfig({
      allowedOrigins: ['https://self-hosted.example.com'],
    }).allowedOrigins).toEqual([
      ...DISTRIBUTION_CLOUD_SYNC_ORIGINS,
      'https://self-hosted.example.com',
    ])
  })

  it('denies a non-allowlisted origin (project file cannot expand trust)', () => {
    const result = checkOriginAllowlist('https://evil.example.com', {
      allowedOrigins: ['https://mdt-sync.example.com'],
    })
    expect(result).toEqual({ allowed: false, reason: 'not_allowlisted' })
  })

  it('denies a non-HTTPS origin', () => {
    const result = checkOriginAllowlist('http://mdt-sync.example.com', {
      allowedOrigins: ['http://mdt-sync.example.com'],
    })
    expect(result).toEqual({ allowed: false, reason: 'not_https' })
  })

  it('denies an origin with a path', () => {
    const result = checkOriginAllowlist('https://mdt-sync.example.com/admin', {
      allowedOrigins: ['https://mdt-sync.example.com'],
    })
    expect(result.allowed).toBe(false)
  })

  it('requires exact origin match (no subdomain wildcarding)', () => {
    const result = checkOriginAllowlist('https://attacker-mdt-sync.example.com', {
      allowedOrigins: ['https://mdt-sync.example.com'],
    })
    expect(result).toEqual({ allowed: false, reason: 'not_allowlisted' })
  })
})
