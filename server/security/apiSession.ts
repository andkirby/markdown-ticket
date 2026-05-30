import type { Request, Response } from 'express'
import { Buffer } from 'node:buffer'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const OWNER_SESSION_COOKIE_NAME = 'mdt_owner_session'
export const OWNER_SESSION_COOKIE_PATH = '/api'

interface OwnerSessionPayload {
  exp: number
  gen: number
  iat: number
  sid: string
}

export interface OwnerSessionCookieOptions {
  secure: boolean
  maxAgeSeconds: number
}

export interface OwnerSessionState {
  authenticated: boolean
}

let sessionGeneration = 0

export function createOwnerSessionCookie(expectedToken: string, options: OwnerSessionCookieOptions): string {
  const maxAgeSeconds = options.maxAgeSeconds
  const now = Math.floor(Date.now() / 1000)
  const payload: OwnerSessionPayload = {
    exp: now + maxAgeSeconds,
    gen: sessionGeneration,
    iat: now,
    sid: randomBytes(24).toString('hex'),
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload, expectedToken)
  const securePart = options.secure ? '; Secure' : ''

  return `${OWNER_SESSION_COOKIE_NAME}=${encodedPayload}.${signature}; Max-Age=${maxAgeSeconds}; Path=${OWNER_SESSION_COOKIE_PATH}; HttpOnly; SameSite=Strict${securePart}`
}

export function getOwnerSessionState(req: Request, expectedToken?: string): OwnerSessionState {
  return { authenticated: verifyOwnerSessionCookie(req, expectedToken) }
}

export function verifyOwnerSessionCookie(req: Request, expectedToken: string | undefined): boolean {
  if (!expectedToken) {
    return false
  }

  const cookieValue = extractCookieValue(req, OWNER_SESSION_COOKIE_NAME)
  if (!cookieValue) {
    return false
  }

  const [encodedPayload, actualSignature] = cookieValue.split('.')
  if (!encodedPayload || !actualSignature) {
    return false
  }

  const expectedSignature = signPayload(encodedPayload, expectedToken)
  if (!safeStringEquals(actualSignature, expectedSignature)) {
    return false
  }

  const payload = parsePayload(encodedPayload)
  if (!payload) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  return payload.exp > now && payload.gen === sessionGeneration
}

export function invalidateOwnerSessions(): void {
  sessionGeneration += 1
}

export function shouldUseSecureSessionCookie(req: Request, nodeEnv: string | undefined): boolean {
  return nodeEnv === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https'
}

export function appendOwnerSessionCookie(res: Response, expectedToken: string, options: OwnerSessionCookieOptions): void {
  res.append('Set-Cookie', createOwnerSessionCookie(expectedToken, options))
}

export function appendClearOwnerSessionCookie(res: Response, secure = false): void {
  const securePart = secure ? '; Secure' : ''
  res.append(
    'Set-Cookie',
    `${OWNER_SESSION_COOKIE_NAME}=; Max-Age=0; Path=${OWNER_SESSION_COOKIE_PATH}; HttpOnly; SameSite=Strict${securePart}`,
  )
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

function parsePayload(encodedPayload: string): OwnerSessionPayload | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<OwnerSessionPayload>
    if (
      typeof parsed.exp !== 'number'
      || typeof parsed.gen !== 'number'
      || typeof parsed.iat !== 'number'
      || typeof parsed.sid !== 'string'
    ) {
      return null
    }

    return parsed as OwnerSessionPayload
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
