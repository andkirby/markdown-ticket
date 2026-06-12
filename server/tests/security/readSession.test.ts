/// <reference types="jest" />

import type { Request, Response } from 'express'
import {
  createReadSessionCookie,
  getReadSessionState,
  READ_SESSION_COOKIE_NAME,
} from '../../security/readSession'

interface MergeReadSessionInput {
  req: Request
  res: Response
  secret: string
  projectRefs?: string[]
  shareIds?: string[]
  expiresAt?: Date
  secure?: boolean
}

type AppendMergedReadSessionCookie = (input: MergeReadSessionInput) => void

const readSessionModulePath = '../../security/readSession'

async function loadAppendMergedReadSessionCookie(): Promise<AppendMergedReadSessionCookie> {
  const module = await import(readSessionModulePath) as { appendMergedReadSessionCookie?: AppendMergedReadSessionCookie }
  if (typeof module.appendMergedReadSessionCookie !== 'function') {
    throw new TypeError('appendMergedReadSessionCookie is required for MDT-177 read-session merge behavior')
  }
  return module.appendMergedReadSessionCookie
}

function createRequest(cookie?: string): Request {
  return {
    headers: cookie ? { cookie } : {},
  } as Request
}

function createResponse(): Response & { appendedCookies: string[] } {
  const appendedCookies: string[] = []
  return {
    appendedCookies,
    append(name: string, value: string) {
      if (name === 'Set-Cookie') {
        appendedCookies.push(value)
      }
      return this as Response
    },
  } as Response & { appendedCookies: string[] }
}

function cookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? ''
}

function maxAge(setCookieHeader: string): number {
  const match = /Max-Age=(\d+)/iu.exec(setCookieHeader)
  if (!match) {
    throw new Error(`Missing Max-Age in cookie: ${setCookieHeader}`)
  }
  return Number(match[1])
}

describe('readSession merge helper - MDT-177', () => {
  const secret = 'mdt-177-read-session-secret'

  it('unions projectRefs and shareIds, de-duplicates grants, and keeps the earliest active expiry', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T10:00:00.000Z'))
    try {
      const appendMergedReadSessionCookie = await loadAppendMergedReadSessionCookie()
      const existingCookie = createReadSessionCookie(secret, {
        projectRefs: ['MDT', 'DOCS'],
        shareIds: ['share-a'],
      }, {
        secure: false,
        maxAgeSeconds: 300,
      })
      const res = createResponse()

      appendMergedReadSessionCookie({
        req: createRequest(cookiePair(existingCookie)),
        res,
        secret,
        projectRefs: ['DOCS', 'OPS'],
        shareIds: ['share-a', 'share-b'],
        expiresAt: new Date('2026-05-23T10:15:00.000Z'),
        secure: false,
      })

      expect(res.appendedCookies).toHaveLength(1)
      expect(maxAge(res.appendedCookies[0])).toBeLessThanOrEqual(300)

      const state = getReadSessionState(createRequest(cookiePair(res.appendedCookies[0])), secret)
      expect(state.authenticated).toBe(true)
      expect(state.projectRefs).toEqual(['MDT', 'DOCS', 'OPS'])
      expect(state.shareIds).toEqual(['share-a', 'share-b'])
    }
    finally {
      jest.useRealTimers()
    }
  })

  it('falls back to the new grants when the existing read-session cookie is malformed or invalid', async () => {
    const appendMergedReadSessionCookie = await loadAppendMergedReadSessionCookie()
    const res = createResponse()

    appendMergedReadSessionCookie({
      req: createRequest(`${READ_SESSION_COOKIE_NAME}=not-a-valid-cookie`),
      res,
      secret,
      projectRefs: ['MDT'],
      shareIds: ['share-a'],
      secure: false,
    })

    expect(res.appendedCookies).toHaveLength(1)
    const state = getReadSessionState(createRequest(cookiePair(res.appendedCookies[0])), secret)
    expect(state).toMatchObject({
      authenticated: true,
      projectRefs: ['MDT'],
      shareIds: ['share-a'],
    })
  })
})
