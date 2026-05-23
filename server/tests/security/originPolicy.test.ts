/// <reference types="jest" />

import {
  createAllowedOrigins,
  createCorsOptions,
  createDefaultOriginPolicy,
  createOriginPolicy,
  parsePublicOrigin,
} from '../../security/originPolicy'

type CorsOriginCallback = (error: Error | null, allowed?: boolean) => void
type CorsOriginFunction = (origin: string | undefined, callback: CorsOriginCallback) => void

describe('originPolicy', () => {
  it('accepts requests with no Origin header', () => {
    const policy = createOriginPolicy(['https://app.example.com'])

    expect(policy.isAllowedOrigin(undefined)).toBe(true)
    expect(policy.getAccessControlAllowOrigin(undefined)).toBeUndefined()
  })

  it('accepts local development origins by default', () => {
    const policy = createDefaultOriginPolicy('')

    expect(policy.isAllowedOrigin('http://localhost:5173')).toBe(true)
    expect(policy.isAllowedOrigin('http://localhost:3001')).toBe(true)
    expect(policy.isAllowedOrigin('http://localhost:4173')).toBe(true)
    expect(policy.isAllowedOrigin('http://localhost:6173')).toBe(true)
  })

  it('parses the configured public origin without inventing schemes for host-only values', () => {
    expect(parsePublicOrigin('https://app.example.com/')).toBe('https://app.example.com')
    expect(parsePublicOrigin('app.example.com')).toBeUndefined()
  })

  it('rejects public origin values that are not exact origins', () => {
    expect(parsePublicOrigin('https://app.example.com/path')).toBeUndefined()
    expect(parsePublicOrigin('https://app.example.com?from=settings')).toBeUndefined()
    expect(parsePublicOrigin('https://app.example.com#section')).toBeUndefined()
    expect(parsePublicOrigin('https://app.example.com,https://admin.example.com')).toBeUndefined()
    expect(parsePublicOrigin('https://')).toBeUndefined()
  })

  it('deduplicates default and configured public origin', () => {
    const origins = createAllowedOrigins('http://localhost:5173/')

    expect(origins.filter(origin => origin === 'http://localhost:5173')).toHaveLength(1)
  })

  it('rejects disallowed origins for REST and stream decisions', () => {
    const policy = createOriginPolicy(['https://app.example.com'])

    expect(policy.isAllowedOrigin('https://attacker.example.com')).toBe(false)
    expect(policy.getAccessControlAllowOrigin('https://attacker.example.com')).toBeUndefined()
  })

  it('returns matching Access-Control-Allow-Origin only for configured origins', () => {
    const policy = createOriginPolicy(['https://app.example.com'])

    expect(policy.getAccessControlAllowOrigin('https://app.example.com')).toBe('https://app.example.com')
  })

  it('builds REST CORS options from the same origin policy', async () => {
    const policy = createOriginPolicy(['https://app.example.com'])
    const options = createCorsOptions(policy)
    const resolveOrigin = options.origin as CorsOriginFunction

    await expect(new Promise((resolve, reject) => {
      resolveOrigin('https://app.example.com', (error, allowed) => {
        if (error) {
          reject(error)
          return
        }
        resolve(allowed)
      })
    })).resolves.toBe(true)

    await expect(new Promise((resolve, reject) => {
      resolveOrigin('https://attacker.example.com', (error, allowed) => {
        if (error) {
          reject(error)
          return
        }
        resolve(allowed)
      })
    })).resolves.toBe(false)
  })
})
