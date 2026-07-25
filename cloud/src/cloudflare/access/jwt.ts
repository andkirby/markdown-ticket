/**
 * Cloudflare Access assertion validation.
 *
 * Source: docs/architecture/cloud-sync/identity-and-access.md § Assertion Validation
 *
 * For every request that reaches the Worker:
 *   1. Read Cf-Access-Jwt-Assertion (never caller-supplied identity headers).
 *   2. Parse bounded JWT; allow only RS256.
 *   3. Select JWK by kid from the team-domain JWKS (cached ≤ 5 min).
 *   4. Verify signature, exact issuer, accepted audience, exp, nbf (if present),
 *      sane iat.
 *   5. On unknown kid, refresh JWKS once and retry (Edge-5).
 *   6. Derive exactly one principal: human (email) or machine (common_name).
 *   7. Reject ambiguous/missing/malformed/expired/unverifiable claims.
 *
 * Uses Web Crypto only. No request-scoped state in module globals.
 */

import type { CloudPrincipal } from '@mdt/domain-contracts'

const RS256_ALG = 'RS256'
/** JWKS cache lifetime. Access key rotation must not require a deployment. */
const JWKS_TTL_MS = 5 * 60 * 1000
const CLOUDFLARE_JWKS_PATH = '/cdn-cgi/access/certs'

interface AccessClaims {
  iss: string
  /** Access JWTs may carry `aud` as a string or an array of strings. */
  aud: string | string[]
  exp: number
  iat: number
  nbf?: number
  email?: string
  common_name?: string
}

interface JwtHeader {
  alg: string
  kid?: string
  typ?: string
}

interface CachedJwks {
  keys: Record<string, CryptoKey>
  fetchedAt: number
  /** Promise of an in-flight refresh so concurrent requests coalesce. */
  refresh?: Promise<Record<string, CryptoKey>>
}

/**
 * Stateless validator. Constructed per Worker instance; JWKS cache lives on the
 * instance, never in module globals. The constructor config is the pinned
 * issuer + accepted audiences from wrangler vars.
 */
export class AccessValidator {
  private readonly issuer: string
  private readonly coordinationAud: string
  private readonly operatorAud: string
  private readonly fetchImpl: typeof fetch
  private cache: CachedJwks | undefined

  constructor(config: {
    teamDomain: string
    coordinationAud: string
    operatorAud: string
    /** Injected for tests; defaults to the global fetch bound to globalThis. */
    fetchImpl?: typeof fetch
  }) {
    // Issuer is the team-domain Access URL.
    this.issuer = `https://${config.teamDomain}`
    this.coordinationAud = config.coordinationAud
    this.operatorAud = config.operatorAud
    // Bind fetch to globalThis: storing the bare global detached loses `this`
    // and throws "Illegal invocation" in the Workers runtime.
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis)
  }

  /**
   * Validate an Access JWT and return the derived principal + matched audience.
   * Throws on any verification failure (caller maps to authentication_required).
   */
  async validate(
    assertion: string,
    expectedAudience: 'coordination' | 'operator',
  ): Promise<CloudPrincipal> {
    const claims = await this.verifySignature(assertion)
    this.verifyClaims(claims, expectedAudience)
    return this.derivePrincipal(claims)
  }

  private async verifySignature(assertion: string): Promise<AccessClaims> {
    const parts = assertion.split('.')
    if (parts.length !== 3) {
      throw new Error('malformed jwt')
    }
    const header = this.decodeJson<JwtHeader>(parts[0])
    if (header.alg !== RS256_ALG) {
      throw new Error(`unsupported alg: ${header.alg}`)
    }
    if (!header.kid) {
      throw new Error('missing kid')
    }

    const claims = this.decodeJson<AccessClaims>(parts[1])

    const key = await this.getKey(header.kid)
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const signature = this.base64UrlDecode(parts[2])
    const ok = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      key,
      signature,
      data,
    )
    if (!ok) {
      throw new Error('invalid signature')
    }
    return claims
  }

  private verifyClaims(
    claims: AccessClaims,
    expectedAudience: 'coordination' | 'operator',
  ): void {
    if (claims.iss !== this.issuer) {
      throw new Error('invalid issuer')
    }
    const expected
      = expectedAudience === 'coordination'
        ? this.coordinationAud
        : this.operatorAud
    // Access JWTs may carry `aud` as a string or an array of strings.
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (!aud.includes(expected)) {
      throw new Error('invalid audience')
    }
    const now = Math.floor(Date.now() / 1000)
    if (typeof claims.exp !== 'number' || claims.exp <= now) {
      throw new Error('expired')
    }
    if (claims.nbf !== undefined && claims.nbf > now) {
      throw new Error('not yet valid')
    }
    // Reject absurd iat (far future or more than 24h old).
    if (typeof claims.iat !== 'number' || claims.iat > now + 60) {
      throw new Error('invalid iat')
    }
  }

  private derivePrincipal(claims: AccessClaims): CloudPrincipal {
    const email = claims.email?.trim().toLowerCase()
    const commonName = claims.common_name?.trim()
    if (email && commonName) {
      throw new Error('ambiguous principal')
    }
    if (email) {
      return { kind: 'human', id: email, display: email }
    }
    if (commonName) {
      return { kind: 'machine', id: commonName, display: commonName }
    }
    throw new Error('missing principal')
  }

  /**
   * Get a verified signing key by kid, refreshing JWKS once on unknown kid.
   * (Edge-5: rotation must not require a deployment — refresh bypasses TTL
   * when a kid is absent from the cached set, but only once per key.)
   */
  private attemptedKids = new Set<string>()
  private async getKey(kid: string): Promise<CryptoKey> {
    const cached = this.cache?.keys[kid]
    if (cached) {
      return cached
    }
    // Refresh at most once per unknown kid to avoid loops on a bad kid.
    if (this.attemptedKids.has(kid)) {
      const recent = await this.refreshJwks()
      const retry = recent[kid]
      if (retry) {
        this.attemptedKids.delete(kid)
        return retry
      }
      throw new Error(`unknown kid: ${kid}`)
    }
    this.attemptedKids.add(kid)
    const forced = await this.refreshJwks(true)
    const refreshed = forced[kid]
    if (refreshed) {
      this.attemptedKids.delete(kid)
      return refreshed
    }
    throw new Error(`unknown kid: ${kid}`)
  }

  private async refreshJwks(force = false): Promise<Record<string, CryptoKey>> {
    const now = Date.now()
    if (!force && this.cache && now - this.cache.fetchedAt < JWKS_TTL_MS) {
      if (this.cache.refresh) {
        // Coalesce concurrent refreshes into one fetch.
        return this.cache.refresh
      }
      return this.cache.keys
    }
    const teamDomain = this.issuer.replace('https://', '')
    const refresh = this.fetchJwks(`https://${teamDomain}${CLOUDFLARE_JWKS_PATH}`)
    if (this.cache) {
      this.cache.refresh = refresh
    }
    const keys = await refresh
    this.cache = { keys, fetchedAt: now }
    return keys
  }

  private async fetchJwks(url: string): Promise<Record<string, CryptoKey>> {
    const res = await this.fetchImpl(url)
    if (!res.ok) {
      throw new Error(`jwks fetch failed: ${res.status}`)
    }
    const body = (await res.json()) as { keys?: Array<{ kid: string, kty: string, use: string, n: string, e: string }> }
    const keys: Record<string, CryptoKey> = {}
    for (const jwk of body.keys ?? []) {
      if (jwk.kty !== 'RSA' || jwk.use !== 'sig' || !jwk.kid) {
        continue
      }
      keys[jwk.kid] = await crypto.subtle.importKey(
        'jwk',
        { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: RS256_ALG },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      )
    }
    return keys
  }

  private decodeJson<T>(b64url: string): T {
    return JSON.parse(new TextDecoder().decode(this.base64UrlDecode(b64url))) as T
  }

  private base64UrlDecode(input: string): ArrayBuffer {
    const padded = input + '='.repeat((4 - (input.length % 4)) % 4)
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}
