/// <reference types="jest" />

import { createAllowedOrigins } from '../../security/originPolicy'
import { resolvePublicLinkOriginOptions } from '../../security/publicLinkOrigins'

describe('publicLinkOrigins - MDT-178', () => {
  it('exposes the configured public origin for link generation without local CORS defaults', () => {
    const result = resolvePublicLinkOriginOptions({
      allowedOrigins: createAllowedOrigins('https://share.example.com'),
      currentOrigin: 'https://app.example.com',
      publicOrigin: 'https://share.example.com',
    })

    expect(result.options).toEqual(['https://share.example.com'])
    expect(result.options).not.toContain('http://localhost:5173')
    expect(result.selectedOrigin).toBe('https://share.example.com')
    expect(result.notice).toBeUndefined()
  })

  it('rejects owner-selected origins outside the single configured public origin', () => {
    const result = resolvePublicLinkOriginOptions({
      allowedOrigins: createAllowedOrigins('https://share.example.com'),
      currentOrigin: 'http://localhost:6173',
      publicOrigin: 'https://share.example.com',
      selectedOrigin: 'https://admin.example.com',
    })

    expect(result.selectedOrigin).toBe('https://share.example.com')
    expect(result.options).toEqual(['https://share.example.com'])
    expect(result.notice).toBeUndefined()
  })

  it('uses the configured public origin without offering a rejected current origin', () => {
    const result = resolvePublicLinkOriginOptions({
      allowedOrigins: createAllowedOrigins('https://share.example.com'),
      currentOrigin: 'https://disallowed.example.test',
      publicOrigin: 'https://share.example.com',
    })

    expect(result.options).toEqual(['https://share.example.com'])
    expect(result.selectedOrigin).toBe('https://share.example.com')
    expect(result.notice).toBeUndefined()
  })

  it('uses the current allowed origin when no public origins are configured', () => {
    const result = resolvePublicLinkOriginOptions({
      allowedOrigins: createAllowedOrigins('https://app.example.com'),
      currentOrigin: 'https://app.example.com',
    })

    expect(result.options).toEqual(['https://app.example.com'])
    expect(result.selectedOrigin).toBe('https://app.example.com')
    expect(result.notice).toBeUndefined()
  })

  it('withholds generated link bases when no configured public origin is available and current origin is rejected', () => {
    const result = resolvePublicLinkOriginOptions({
      allowedOrigins: createAllowedOrigins(),
      currentOrigin: 'https://disallowed.example.test',
    })

    expect(result.options).toEqual([])
    expect(result.selectedOrigin).toBeUndefined()
    expect(result.notice).toMatch(/no allowed public origin/i)
  })
})
