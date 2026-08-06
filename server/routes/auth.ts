import type { Request, Response } from 'express'
import { Router } from 'express'
import { getRuntimeConfig } from '../config/runtimeConfig.js'
import { extractApiCredential, isLoopbackBypassEligible, OWNER_INTENT_HEADER, resolveActiveReadSession, timingSafeTokenMatches } from '../security/apiAuth.js'
import {
  appendClearOwnerSessionCookie,
  appendOwnerSessionCookie,
  getOwnerSessionState,
  invalidateOwnerSessions,
  shouldUseSecureSessionCookie,
} from '../security/apiSession.js'
import { createOriginPolicy } from '../security/originPolicy.js'
import { publicTokenExchangeRateLimit } from '../security/publicRateLimit.js'
import {
  appendMergedReadSessionCookie,
  getReadSessionState,
  resolveReadTokenScope,
} from '../security/readSession.js'
import { createReadTokenStore, ReadTokenRejectedError } from '../security/readTokenStore.js'

export function createAuthRouter(): Router {
  const router = Router()

  router.get('/session', async (req: Request, res: Response) => {
    const runtimeConfig = getRuntimeConfig(req)
    const session = getOwnerSessionState(req, runtimeConfig.auth.token)
    const readSession = await resolveActiveReadSession(
      getReadSessionState(req, runtimeConfig.readSessions.secret),
      {
        allowLocalReadSessionFallback: runtimeConfig.readSessions.allowLocalFallback,
        configDir: runtimeConfig.configDir,
        readSessionSecret: runtimeConfig.readSessions.secret,
      },
    )
    const readAuthenticated = readSession.authenticated
      && (readSession.projectRefs.length > 0 || readSession.shareIds.length > 0)
    // MDT-157 UAT 2026-08-06: localExempt mirrors the protected /api gate's
    // loopback decision EXACTLY by sharing isLoopbackBypassEligible. Read-only
    // precedence (C12) keys on readSession.authenticated (not on non-empty
    // scopes), so a valid-but-empty/revoked read session still blocks bypass —
    // otherwise the UI would enter no-auth-dev while the gate denies owner
    // (review P2 fix).
    const localExempt = isLoopbackBypassEligible(req, runtimeConfig.auth, readSession)

    // Effective auth state for THIS caller. If backend auth is config-disabled
    // but this request is not loopback-exempt (e.g. a tunnel Host on a
    // disabled-auth instance), the caller still must authenticate — report
    // authEnabled: true so the UI shows locked rather than misleadingly entering
    // no-auth-dev and then failing on writes.
    const authEnabled = runtimeConfig.auth.enabled || !localExempt

    res.json({
      authEnabled,
      authenticated: session.authenticated,
      readAuthenticated,
      localExempt,
    })
  })

  router.post('/session', publicTokenExchangeRateLimit, (req: Request, res: Response) => {
    const runtimeConfig = getRuntimeConfig(req)
    const submittedToken = readSubmittedToken(req.body)

    if (!runtimeConfig.auth.enabled || !timingSafeTokenMatches(submittedToken, runtimeConfig.auth.token)) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    appendOwnerSessionCookie(res, runtimeConfig.auth.token!, {
      maxAgeSeconds: runtimeConfig.ownerSessions.maxAgeSeconds,
      secure: shouldUseSecureSessionCookie(req, runtimeConfig.nodeEnv),
    })

    res.json({ authenticated: true })
  })

  router.post('/read-token', publicTokenExchangeRateLimit, async (req: Request, res: Response) => {
    const runtimeConfig = getRuntimeConfig(req)
    const submittedToken = readSubmittedToken(req.body)
    const readSessionSecret = runtimeConfig.readSessions.secret

    if (!readSessionSecret || !submittedToken) {
      res.status(401).json({ error: 'Token was not accepted' })
      return
    }

    const envProjectRefs = resolveReadTokenScope(submittedToken, runtimeConfig.readTokens.staticScopes)
    if (envProjectRefs !== null) {
      appendMergedReadSessionCookie({
        req,
        res,
        secret: readSessionSecret,
        projectRefs: envProjectRefs,
        secure: shouldUseSecureSessionCookie(req, runtimeConfig.nodeEnv),
      })

      res.json({ authenticated: true })
      return
    }

    try {
      const persistedToken = await getReadTokenStore(req).resolveToken(submittedToken)
      appendMergedReadSessionCookie({
        req,
        res,
        secret: readSessionSecret,
        projectRefs: persistedToken.projectRefs,
        tokenIds: [persistedToken.tokenId],
        expiresAt: persistedToken.expiresAt ? new Date(persistedToken.expiresAt) : undefined,
        secure: shouldUseSecureSessionCookie(req, runtimeConfig.nodeEnv),
      })

      res.json({ authenticated: true })
    }
    catch (error) {
      if (error instanceof ReadTokenRejectedError) {
        res.status(401).json({ error: 'Token was not accepted' })
        return
      }

      res.status(500).json({ error: 'Token was not accepted' })
    }
  })

  router.delete('/session', publicTokenExchangeRateLimit, (req: Request, res: Response) => {
    const runtimeConfig = getRuntimeConfig(req)
    const originPolicy = createOriginPolicy(runtimeConfig.origins.allowedOrigins)
    const credential = extractApiCredential(req)
    const hasOwnerCredential = timingSafeTokenMatches(credential ?? undefined, runtimeConfig.auth.token)
    const hasOwnerCookie = getOwnerSessionState(req, runtimeConfig.auth.token).authenticated
    const origin = req.headers.origin
    const hasOwnerIntent = typeof origin === 'string'
      && req.headers[OWNER_INTENT_HEADER] === '1'
      && originPolicy.isAllowedOrigin(origin)

    if (hasOwnerCredential || (hasOwnerCookie && hasOwnerIntent)) {
      invalidateOwnerSessions()
    }

    appendClearOwnerSessionCookie(res, shouldUseSecureSessionCookie(req, runtimeConfig.nodeEnv))
    res.status(204).send()
  })

  return router
}

function getReadTokenStore(req: Request) {
  return createReadTokenStore({ configDir: getRuntimeConfig(req).configDir })
}

function readSubmittedToken(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined
  }

  const token = (body as { token?: unknown }).token
  return typeof token === 'string' ? token : undefined
}
