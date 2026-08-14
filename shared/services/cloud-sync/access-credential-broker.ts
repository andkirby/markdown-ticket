import type {
  CloudCredential,
  CloudCredentialProvider,
} from '@mdt/domain-contracts'
import type { StreamAuthorization } from './CloudProjectionStreamClient.js'
import { Buffer } from 'node:buffer'
import { buildServiceTokenHeaders } from './credential-providers.js'

const DEFAULT_REFRESH_SKEW_MS = 60_000
const DEFAULT_OPAQUE_TOKEN_TTL_MS = 300_000

interface CachedHumanCredential {
  credential: Extract<CloudCredential, { kind: 'human' }>
  expiresAt: number
}

/** Provider capability safe for background work: it must never start a login. */
export interface NonInteractiveCredentialProvider extends CloudCredentialProvider {
  resolveNonInteractive: (serviceUrl: string) => Promise<CloudCredential | null>
}

export interface AccessCredentialBrokerOptions {
  provider: CloudCredentialProvider
  now?: () => number
  refreshSkewMs?: number
  opaqueTokenTtlMs?: number
}

/**
 * Decode a Cloudflare Access JWT expiry without validating the token. Validation
 * remains Cloudflare Access' responsibility; the local value is scheduling
 * metadata only. Opaque tokens receive a conservative in-memory lifetime.
 */
export function decodeAccessTokenExpiry(
  token: string,
  now = Date.now(),
  opaqueTokenTtlMs = DEFAULT_OPAQUE_TOKEN_TTL_MS,
): number {
  try {
    const payloadSegment = token.split('.')[1]
    if (!payloadSegment)
      return now + opaqueTokenTtlMs
    const payload = JSON.parse(
      Buffer.from(payloadSegment, 'base64url').toString('utf8'),
    ) as { exp?: unknown }
    return typeof payload.exp === 'number'
      ? payload.exp * 1000
      : now + opaqueTokenTtlMs
  }
  catch {
    return now + opaqueTokenTtlMs
  }
}

/** Convert either supported credential kind into one atomic stream auth value. */
export function streamAuthorizationFromCredential(
  credential: CloudCredential,
  now = Date.now(),
): StreamAuthorization {
  if (credential.kind === 'human') {
    return {
      headers: { 'cf-access-token': credential.cfAccessToken },
      tokenExpiry: decodeAccessTokenExpiry(credential.cfAccessToken, now),
    }
  }
  return {
    headers: buildServiceTokenHeaders(credential.clientId, credential.clientSecret) ?? {},
    // Service-token expiry is not encoded locally. Re-resolve conservatively so
    // rotation is observed while the stream remains entirely non-interactive.
    tokenExpiry: now + DEFAULT_OPAQUE_TOKEN_TTL_MS,
  }
}

/**
 * Process-scoped credential owner for the local server. Human credentials are
 * cached by exact trusted origin and concurrent callers share one acquisition.
 * The wrapped provider remains responsible for obtaining the credential.
 */
export class AccessCredentialBroker implements CloudCredentialProvider {
  private readonly cache = new Map<string, CachedHumanCredential>()
  private readonly inFlight = new Map<string, Promise<CloudCredential | null>>()
  private readonly backgroundInFlight = new Map<string, Promise<CloudCredential | null>>()
  private readonly provider: CloudCredentialProvider
  private readonly now: () => number
  private readonly refreshSkewMs: number
  private readonly opaqueTokenTtlMs: number

  constructor(options: AccessCredentialBrokerOptions) {
    this.provider = options.provider
    this.now = options.now ?? Date.now
    this.refreshSkewMs = options.refreshSkewMs ?? DEFAULT_REFRESH_SKEW_MS
    this.opaqueTokenTtlMs = options.opaqueTokenTtlMs ?? DEFAULT_OPAQUE_TOKEN_TTL_MS
  }

  async resolve(serviceUrl: string): Promise<CloudCredential | null> {
    const cached = this.validCachedHuman(serviceUrl)
    if (cached)
      return cached

    const active = this.inFlight.get(serviceUrl)
    if (active)
      return active

    const pending = this.resolveFresh(serviceUrl)
    this.inFlight.set(serviceUrl, pending)
    try {
      return await pending
    }
    finally {
      if (this.inFlight.get(serviceUrl) === pending)
        this.inFlight.delete(serviceUrl)
    }
  }

  /**
   * Resolve for startup/reconnect without ever launching an interactive login.
   * A valid human token acquired by an explicit operation is reused; otherwise
   * only a provider-declared non-interactive path (for example a service token)
   * may run.
   */
  async resolveNonInteractive(serviceUrl: string): Promise<CloudCredential | null> {
    const cached = this.validCachedHuman(serviceUrl)
    if (cached)
      return cached

    const foreground = this.inFlight.get(serviceUrl)
    if (foreground)
      return foreground

    const active = this.backgroundInFlight.get(serviceUrl)
    if (active)
      return active

    const provider = this.provider
    if (!isNonInteractiveProvider(provider))
      return null

    const pending = this.resolveFreshWith(
      serviceUrl,
      () => provider.resolveNonInteractive(serviceUrl),
    )
    this.backgroundInFlight.set(serviceUrl, pending)
    try {
      return await pending
    }
    finally {
      if (this.backgroundInFlight.get(serviceUrl) === pending)
        this.backgroundInFlight.delete(serviceUrl)
    }
  }

  private validCachedHuman(serviceUrl: string): CachedHumanCredential['credential'] | null {
    const cached = this.cache.get(serviceUrl)
    return cached && cached.expiresAt - this.now() > this.refreshSkewMs
      ? cached.credential
      : null
  }

  private async resolveFresh(serviceUrl: string): Promise<CloudCredential | null> {
    return this.resolveFreshWith(serviceUrl, () => this.provider.resolve(serviceUrl))
  }

  private async resolveFreshWith(
    serviceUrl: string,
    resolve: () => Promise<CloudCredential | null>,
  ): Promise<CloudCredential | null> {
    const credential = await resolve()
    if (credential?.kind === 'human') {
      this.cache.set(serviceUrl, {
        credential,
        expiresAt: decodeAccessTokenExpiry(
          credential.cfAccessToken,
          this.now(),
          this.opaqueTokenTtlMs,
        ),
      })
    }
    return credential
  }
}

function isNonInteractiveProvider(
  provider: CloudCredentialProvider,
): provider is NonInteractiveCredentialProvider {
  return 'resolveNonInteractive' in provider
    && typeof provider.resolveNonInteractive === 'function'
}
