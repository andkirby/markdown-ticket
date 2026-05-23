import type { Request, Response } from 'express'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const READ_SESSION_COOKIE_NAME = 'mdt_read_session'
export const READ_SESSION_COOKIE_PATH = '/api'
export const READ_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60

interface ReadSessionPayload {
  exp: number
  iat: number
  projectRefs: string[]
  shareIds: string[]
  sid: string
}

export interface ReadSessionCookieOptions {
  secure: boolean
  maxAgeSeconds?: number
}

export interface ReadSessionState {
  authenticated: boolean
  projectRefs: string[]
  shareIds: string[]
}

export interface ReadSessionGrants {
  projectRefs?: string[]
  shareIds?: string[]
}

export interface ReadTokenScope {
  hash: string
  projectRefs: string[]
}

export function hashReadToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function parseReadTokenScopes(value: string | undefined): ReadTokenScope[] {
  if (!value?.trim()) {
    return []
  }

  return value.split(';')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash = '', refs = ''] = entry.split(':')
      return {
        hash: hash.trim().toLowerCase(),
        projectRefs: refs.split(',').map(ref => ref.trim()).filter(Boolean),
      }
    })
    .filter(scope => /^[a-f0-9]{64}$/u.test(scope.hash))
}

export function resolveReadTokenScope(submittedToken: string | undefined, scopes: ReadTokenScope[]): string[] | null {
  if (!submittedToken) {
    return null
  }

  const submittedHash = hashReadToken(submittedToken)
  for (const scope of scopes) {
    if (safeStringEquals(submittedHash, scope.hash)) {
      return scope.projectRefs
    }
  }

  return null
}

export function createReadSessionCookie(secret: string, grants: ReadSessionGrants, options: ReadSessionCookieOptions): string {
  const maxAgeSeconds = options.maxAgeSeconds ?? READ_SESSION_MAX_AGE_SECONDS
  const now = Math.floor(Date.now() / 1000)
  const payload: ReadSessionPayload = {
    exp: now + maxAgeSeconds,
    iat: now,
    projectRefs: [...new Set(grants.projectRefs ?? [])],
    shareIds: [...new Set(grants.shareIds ?? [])],
    sid: randomBytes(24).toString('hex'),
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload, secret)
  const securePart = options.secure ? '; Secure' : ''

  return `${READ_SESSION_COOKIE_NAME}=${encodedPayload}.${signature}; Max-Age=${maxAgeSeconds}; Path=${READ_SESSION_COOKIE_PATH}; HttpOnly; SameSite=Lax${securePart}`
}

export function appendReadSessionCookie(res: Response, secret: string, grants: ReadSessionGrants, options: ReadSessionCookieOptions): void {
  res.append('Set-Cookie', createReadSessionCookie(secret, grants, options))
}

export function getReadSessionState(req: Request, secret: string | undefined): ReadSessionState {
  if (!secret) {
    return { authenticated: false, projectRefs: [], shareIds: [] }
  }

  const cookieValue = extractCookieValue(req, READ_SESSION_COOKIE_NAME)
  if (!cookieValue) {
    return { authenticated: false, projectRefs: [], shareIds: [] }
  }

  const [encodedPayload, actualSignature] = cookieValue.split('.')
  if (!encodedPayload || !actualSignature) {
    return { authenticated: false, projectRefs: [], shareIds: [] }
  }

  const expectedSignature = signPayload(encodedPayload, secret)
  if (!safeStringEquals(actualSignature, expectedSignature)) {
    return { authenticated: false, projectRefs: [], shareIds: [] }
  }

  const payload = parsePayload(encodedPayload)
  if (!payload || payload.exp <= Math.floor(Date.now() / 1000)) {
    return { authenticated: false, projectRefs: [], shareIds: [] }
  }

  return {
    authenticated: true,
    projectRefs: payload.projectRefs,
    shareIds: payload.shareIds,
  }
}

export function getReadSessionSecret(ownerToken: string | undefined, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return ownerToken || env.API_READ_SESSION_SECRET
}

function extractCookieValue(req: Request, cookieName: string): string | null {
  const rawCookie = req.headers.cookie
  if (!rawCookie) {
    return null
  }

  for (const cookiePart of rawCookie.split(';')) {
    const [name, ...valueParts] = cookiePart.trim().split('=')
    if (name === cookieName) {
      return valueParts.join('=') || null
    }
  }

  return null
}

function parsePayload(encodedPayload: string): ReadSessionPayload | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<ReadSessionPayload>
    if (
      typeof parsed.exp !== 'number'
      || typeof parsed.iat !== 'number'
      || !Array.isArray(parsed.projectRefs)
      || !parsed.projectRefs.every(projectRef => typeof projectRef === 'string')
      || (parsed.shareIds !== undefined && (!Array.isArray(parsed.shareIds) || !parsed.shareIds.every(shareId => typeof shareId === 'string')))
      || typeof parsed.sid !== 'string'
    ) {
      return null
    }

    return {
      ...parsed,
      shareIds: parsed.shareIds ?? [],
    } as ReadSessionPayload
  }
  catch {
    return null
  }
}

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
