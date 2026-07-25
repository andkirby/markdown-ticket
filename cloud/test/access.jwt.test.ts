/**
 * TEST-access-jwt-validation — covers BR-2.1, Edge-5.
 *
 * Uses real RSA keypairs via Web Crypto to fabricate Access-shaped JWTs against
 * a mocked JWKS endpoint, exercising: valid human principal, machine principal,
 * wrong audience/issuer/expiry/alg rejection, signature failure, and the
 * unknown-kid JWKS refresh-once path.
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { AccessValidator } from '../src/cloudflare/access/jwt'

const TEAM_DOMAIN = 'team.example.com'
const COORDINATION_AUD = 'aud-coordination'
const OPERATOR_AUD = 'aud-operator'

interface TestKey {
  kid: string
  private: CryptoKey
  publicJwk: JsonWebKey
}

async function makeKey(kid: string): Promise<TestKey> {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  return { kid, private: pair.privateKey, publicJwk }
}

function base64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signJwt(key: TestKey, payload: Record<string, unknown>, alg = 'RS256'): Promise<string> {
  const header = { alg, kid: key.kid, typ: 'JWT' }
  const enc = (o: unknown) => base64Url(new TextEncoder().encode(JSON.stringify(o)))
  const data = `${enc(header)}.${enc(payload)}`
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key.private,
    new TextEncoder().encode(data),
  )
  return `${data}.${base64Url(signature)}`
}

function jwksResponse(keys: TestKey[]): Response {
  return new Response(
    JSON.stringify({ keys: keys.map(k => ({ kid: k.kid, kty: k.publicJwk.kty, use: 'sig', n: k.publicJwk.n, e: k.publicJwk.e })) }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function makeValidator(keyStore: TestKey[], fetchImpl?: typeof fetch) {
  return new AccessValidator({
    teamDomain: TEAM_DOMAIN,
    coordinationAud: COORDINATION_AUD,
    operatorAud: OPERATOR_AUD,
    fetchImpl: fetchImpl ?? ((url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url.toString()
      if (u.endsWith('/cdn-cgi/access/certs')) {
        return Promise.resolve(jwksResponse(keyStore))
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }),
  })
}

describe('AccessValidator', () => {
  let key: TestKey
  let now: number

  beforeEach(() => {
    now = Math.floor(Date.now() / 1000)
  })

  test('valid human email principal (BR-2.1)', async () => {
    key = await makeKey('kid-1')
    const v = makeValidator([key])
    const token = await signJwt(key, {
      iss: `https://${TEAM_DOMAIN}`,
      aud: COORDINATION_AUD,
      exp: now + 3600,
      iat: now,
      email: 'Owner@Example.com ',
    })
    const principal = await v.validate(token, 'coordination')
    expect(principal.kind).toBe('human')
    expect(principal.id).toBe('owner@example.com') // normalized
  })

  test('valid machine common_name principal (BR-2.2)', async () => {
    key = await makeKey('kid-1')
    const v = makeValidator([key])
    const token = await signJwt(key, {
      iss: `https://${TEAM_DOMAIN}`,
      aud: COORDINATION_AUD,
      exp: now + 3600,
      iat: now,
      common_name: 'svc-token-123',
    })
    const principal = await v.validate(token, 'coordination')
    expect(principal.kind).toBe('machine')
    expect(principal.id).toBe('svc-token-123')
  })

  test('rejects wrong audience', async () => {
    key = await makeKey('kid-1')
    const v = makeValidator([key])
    const token = await signJwt(key, { iss: `https://${TEAM_DOMAIN}`, aud: OPERATOR_AUD, exp: now + 3600, iat: now, email: 'a@b.com' })
    await expect(v.validate(token, 'coordination')).rejects.toThrow(/audience/)
  })

  test('accepts array-form aud (Access JWTs ship aud as an array)', async () => {
    key = await makeKey('kid-1')
    const v = makeValidator([key])
    const token = await signJwt(key, { iss: `https://${TEAM_DOMAIN}`, aud: [COORDINATION_AUD], exp: now + 3600, iat: now, email: 'a@b.com' })
    const principal = await v.validate(token, 'coordination')
    expect(principal.kind).toBe('human')
  })

  test('rejects wrong issuer', async () => {
    key = await makeKey('kid-1')
    const v = makeValidator([key])
    const token = await signJwt(key, { iss: 'https://evil.example.com', aud: COORDINATION_AUD, exp: now + 3600, iat: now, email: 'a@b.com' })
    await expect(v.validate(token, 'coordination')).rejects.toThrow(/issuer/)
  })

  test('rejects expired token', async () => {
    key = await makeKey('kid-1')
    const v = makeValidator([key])
    const token = await signJwt(key, { iss: `https://${TEAM_DOMAIN}`, aud: COORDINATION_AUD, exp: now - 10, iat: now - 3600, email: 'a@b.com' })
    await expect(v.validate(token, 'coordination')).rejects.toThrow(/expired/)
  })

  test('rejects non-RS256 alg', async () => {
    key = await makeKey('kid-1')
    const v = makeValidator([key])
    const token = await signJwt(key, { iss: `https://${TEAM_DOMAIN}`, aud: COORDINATION_AUD, exp: now + 3600, iat: now, email: 'a@b.com' }, 'HS256')
    await expect(v.validate(token, 'coordination')).rejects.toThrow(/alg/)
  })

  test('rejects bad signature (different key)', async () => {
    key = await makeKey('kid-1')
    const other = await makeKey('kid-1') // same kid, different key
    const v = makeValidator([other])
    const token = await signJwt(key, { iss: `https://${TEAM_DOMAIN}`, aud: COORDINATION_AUD, exp: now + 3600, iat: now, email: 'a@b.com' })
    await expect(v.validate(token, 'coordination')).rejects.toThrow(/signature|unknown kid/)
  })

  test('rejects ambiguous principal (both email and common_name)', async () => {
    key = await makeKey('kid-1')
    const v = makeValidator([key])
    const token = await signJwt(key, { iss: `https://${TEAM_DOMAIN}`, aud: COORDINATION_AUD, exp: now + 3600, iat: now, email: 'a@b.com', common_name: 'svc' })
    await expect(v.validate(token, 'coordination')).rejects.toThrow(/ambiguous/)
  })

  test('unknown kid triggers JWKS refresh once and succeeds (Edge-5)', async () => {
    const initial = await makeKey('kid-old')
    const rotated = await makeKey('kid-new')
    const fetchMock = mock((_url: string | URL | Request) => Promise.resolve(jwksResponse([initial])) as Promise<Response>)
    const v = makeValidator([initial], fetchMock as unknown as typeof fetch)

    // Prime the cache with the old key set.
    const oldToken = await signJwt(initial, { iss: `https://${TEAM_DOMAIN}`, aud: COORDINATION_AUD, exp: now + 3600, iat: now, email: 'a@b.com' })
    await v.validate(oldToken, 'coordination')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Now serve the rotated key set on the next fetch.
    fetchMock.mockImplementation(() => Promise.resolve(jwksResponse([rotated])) as Promise<Response>)
    const newToken = await signJwt(rotated, { iss: `https://${TEAM_DOMAIN}`, aud: COORDINATION_AUD, exp: now + 3600, iat: now, email: 'a@b.com' })
    const principal = await v.validate(newToken, 'coordination') // unknown kid → refresh once
    expect(principal.kind).toBe('human')
    expect(fetchMock).toHaveBeenCalledTimes(2) // exactly one refresh
  })
})
