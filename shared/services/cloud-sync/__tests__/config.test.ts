/**
 * TEST-config-no-secrets — covers C5.
 *
 * Verifies the config validator rejects tokens/secrets/audience tags and
 * accepts only the approved non-secret binding shape.
 */

import { describe, expect, it } from '@jest/globals'
import { getDefaultConfig, processConfig } from '../../../utils/config-validator'
import { ConfigValidationError, findForbiddenSecretKeys, validateProjectBinding } from '../config'

describe('config rejects secrets (C5)', () => {
  it('accepts a valid non-secret binding', () => {
    const binding = validateProjectBinding({
      enabled: true,
      projectId: '018f5e6c-6f32-7c5b-9e76-97c7c769c123',
      serviceUrl: 'https://mdt-sync.example.com',
      pollIntervalSeconds: 15,
    })
    expect(binding.enabled).toBe(true)
    expect(binding.pollIntervalSeconds).toBe(15)
  })

  it('rejects an invalid serviceUrl (path present)', () => {
    expect(() => validateProjectBinding({
      enabled: true,
      projectId: 'p1',
      serviceUrl: 'https://mdt-sync.example.com/path',
      pollIntervalSeconds: 15,
    })).toThrow(ConfigValidationError)
  })

  it('rejects pollIntervalSeconds out of range', () => {
    expect(() => validateProjectBinding({
      enabled: true,
      projectId: 'p1',
      serviceUrl: 'https://x.example.com',
      pollIntervalSeconds: 4,
    })).toThrow(ConfigValidationError)
    expect(() => validateProjectBinding({
      enabled: true,
      projectId: 'p1',
      serviceUrl: 'https://x.example.com',
      pollIntervalSeconds: 301,
    })).toThrow(ConfigValidationError)
  })

  it('defaults pollIntervalSeconds to 15', () => {
    const binding = validateProjectBinding({
      enabled: true,
      projectId: 'p1',
      serviceUrl: 'https://x.example.com',
    })
    expect(binding.pollIntervalSeconds).toBe(15)
  })

  it('finds forbidden secret-like keys in a raw config object', () => {
    const offenders = findForbiddenSecretKeys({
      projectId: 'p1',
      serviceUrl: 'https://x.example.com',
      cfAccessToken: 'eyJ...',
      serviceTokenSecret: 'shh',
      audienceTag: 'aud-123',
    })
    expect(offenders).toEqual(expect.arrayContaining(['cfAccessToken', 'serviceTokenSecret', 'audienceTag']))
    expect(offenders).not.toContain('projectId')
    expect(offenders).not.toContain('serviceUrl')
  })

  it('does not flag benign keys', () => {
    const offenders = findForbiddenSecretKeys({
      enabled: true,
      projectId: 'p1',
      serviceUrl: 'https://x.example.com',
      pollIntervalSeconds: 15,
    })
    expect(offenders).toEqual([])
  })

  it('preserves global cloudSync.allowedOrigins through the canonical config loader', () => {
    const config = processConfig({
      cloudSync: {
        allowedOrigins: ['https://self-hosted.example.com'],
      },
    })

    expect(config.cloudSync.allowedOrigins).toEqual(['https://self-hosted.example.com'])
    expect(getDefaultConfig().cloudSync.allowedOrigins).toEqual([])
  })
})
