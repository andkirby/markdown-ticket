import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'
import * as path from 'node:path'

/**
 * MDT-221 — Short-lived, directory-scoped preview tokens for sandboxed HTML
 * document previews.
 *
 * A preview token is the ONLY credential bridge between the owner-authenticated
 * parent (which can carry the SameSite=Strict session cookie) and the opaque-
 * origin sandboxed iframe (which cannot). See architecture.md §2 Path A/B.
 *
 * Token = base64url(payload) + '.' + base64url(HMAC-SHA256(payload, secret)).
 *
 * Security properties:
 * - HMAC-SHA256 integrity (tamper detection); no confidentiality needed (the
 *   token appears in a same-origin URL the parent already controls).
 * - exp enforced on every consume; TTL <= 300s (CR C-2.9).
 * - Scoped to exactly one projectId + one docDir (project-relative, posix-
 *   normalized). The raw-preview handler asserts every requested path is inside
 *   docDir before reading (CR C-2.10, C-2.11).
 *
 * The four crypto helpers below are duplicated from apiSession.ts by design:
 * they are private there, there is no shared crypto-utilities module, and
 * extracting one is a refactor beyond this ticket (surgical-changes rule).
 */

const DEFAULT_TTL_SECONDS = 300
const LOCAL_DEFAULT_SECRET = 'mdt-preview-token-local-default'

export interface PreviewTokenPayload {
  /** Expiry, unix seconds. */
  exp: number
  /** Issued-at, unix seconds. */
  iat: number
  /** Project id (or code) the token grants. */
  projectId: string
  /** Project-relative, posix-normalized directory the token is scoped to. */
  docDir: string
  /** Payload version, for forward-compatible revocation. */
  v: 1
}

export interface PreviewTokenResult {
  /** The signed token string to embed in the iframe src path. */
  token: string
  /** ISO8601 expiry, for the client to schedule re-minting. */
  expiresAt: string
}

/**
 * Resolve the HMAC secret from the runtime env map. Takes the env map as a
 * parameter (never reads the global env directly) so this file stays within
 * the runtime-config boundary enforced by tests/config/runtimeConfig.test.ts.
 * Called only from config/runtimeConfig.ts.
 *
 * A dedicated env var keeps the blast radius separate from the owner-session
 * cookie secret; the owner token is a stable fallback; a local default covers
 * single-user dev/test where the token's secrecy is not load-bearing (the
 * parent origin already controls the URL).
 */
export function getPreviewTokenSecret(ownerToken: string | undefined, env: NodeJS.ProcessEnv): string {
  const explicit = env.MDT_PREVIEW_TOKEN_SECRET?.trim()
  if (explicit) {
    return explicit
  }
  if (ownerToken) {
    return ownerToken
  }
  return LOCAL_DEFAULT_SECRET
}

/** Normalize a project-relative path to posix form, no leading/trailing slash. */
export function normalizeDocDir(docDir: string): string {
  const normalized = path.posix.normalize(docDir.replace(/\\/g, '/').replace(/^\/+/, '')).replace(/\/+$/, '')
  return normalized === '.' ? '' : normalized.replace(/^\/+/, '')
}

export function mintPreviewToken(
  projectId: string,
  docDir: string,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  now: number = Date.now(),
): PreviewTokenResult {
  if (ttlSeconds > DEFAULT_TTL_SECONDS) {
    throw new Error(`Preview token TTL must be <= ${DEFAULT_TTL_SECONDS}s`)
  }
  const nowSec = Math.floor(now / 1000)
  const payload: PreviewTokenPayload = {
    exp: nowSec + ttlSeconds,
    iat: nowSec,
    projectId,
    docDir: normalizeDocDir(docDir),
    v: 1,
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload, secret)
  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date((nowSec + ttlSeconds) * 1000).toISOString(),
  }
}

export interface VerifiedPreviewToken {
  payload: PreviewTokenPayload
}

export function verifyPreviewToken(token: string, secret: string, now: number = Date.now()): VerifiedPreviewToken {
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new PreviewTokenError('Malformed preview token')
  }
  const [encodedPayload, actualSignature] = parts as [string, string]

  const expectedSignature = signPayload(encodedPayload, secret)
  if (!safeStringEquals(actualSignature, expectedSignature)) {
    throw new PreviewTokenError('Invalid preview token')
  }

  const payload = parsePayload(encodedPayload)
  if (!payload) {
    throw new PreviewTokenError('Malformed preview token')
  }
  if (payload.v !== 1) {
    throw new PreviewTokenError('Unsupported preview token version')
  }
  if (payload.exp <= Math.floor(now / 1000)) {
    throw new PreviewTokenError('Preview token expired')
  }
  return { payload }
}

/**
 * Assert that a requested project-relative path is inside the token's docDir.
 * One comparison, no branching on extensions. The empty docDir case ('' or '.')
 * means the token was minted for a root-level HTML file and grants the root.
 */
export function isPathInsideDocDir(requestedPath: string, docDir: string): boolean {
  const normalizedDocDir = normalizeDocDir(docDir)
  if (normalizedDocDir === '') {
    return true
  }
  const normalizedRequested = normalizeDocDir(requestedPath)
  return normalizedRequested === normalizedDocDir || normalizedRequested.startsWith(`${normalizedDocDir}/`)
}

export class PreviewTokenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PreviewTokenError'
  }
}

// ---- crypto helpers (duplicated from apiSession.ts; see file header) ----

function signPayload(encodedPayload: string, secret: string): string {
  return encodeBufferBase64Url(createHmac('sha256', secret).update(encodedPayload).digest())
}

function safeStringEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

function encodeBase64Url(value: string): string {
  return encodeBufferBase64Url(Buffer.from(value, 'utf8'))
}

function encodeBufferBase64Url(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddingLength = (4 - (normalized.length % 4)) % 4
  return Buffer.from(`${normalized}${'='.repeat(paddingLength)}`, 'base64').toString('utf8')
}

function parsePayload(encodedPayload: string): PreviewTokenPayload | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<PreviewTokenPayload>
    if (
      typeof parsed.exp !== 'number'
      || typeof parsed.iat !== 'number'
      || typeof parsed.projectId !== 'string'
      || typeof parsed.docDir !== 'string'
      || parsed.v !== 1
    ) {
      return null
    }
    return parsed as PreviewTokenPayload
  }
  catch {
    return null
  }
}
