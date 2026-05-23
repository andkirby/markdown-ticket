import type { Request, Response } from 'express'
import { Router } from 'express'
import { extractApiCredential, OWNER_INTENT_HEADER, parseApiAuthConfig, timingSafeTokenMatches } from '../security/apiAuth.js'
import {
  appendClearOwnerSessionCookie,
  appendOwnerSessionCookie,
  getOwnerSessionState,
  invalidateOwnerSessions,
  OWNER_SESSION_MAX_AGE_SECONDS,
  shouldUseSecureSessionCookie,
} from '../security/apiSession.js'
import { createDefaultOriginPolicy } from '../security/originPolicy.js'
import { publicTokenExchangeRateLimit } from '../security/publicRateLimit.js'
import {
  appendReadSessionCookie,
  getReadSessionSecret,
  parseReadTokenScopes,
  resolveReadTokenScope,
} from '../security/readSession.js'

export function createAuthRouter(): Router {
  const router = Router()
  const originPolicy = createDefaultOriginPolicy()

  router.get('/session', (req: Request, res: Response) => {
    const config = parseApiAuthConfig()
    const session = getOwnerSessionState(req, config.token)

    res.json({
      authEnabled: config.enabled,
      authenticated: session.authenticated,
    })
  })

  router.post('/session', publicTokenExchangeRateLimit, (req: Request, res: Response) => {
    const config = parseApiAuthConfig()
    const submittedToken = readSubmittedToken(req.body)

    if (!config.enabled || !timingSafeTokenMatches(submittedToken, config.token)) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    appendOwnerSessionCookie(res, config.token!, {
      maxAgeSeconds: OWNER_SESSION_MAX_AGE_SECONDS,
      secure: shouldUseSecureSessionCookie(req),
    })

    res.json({ authenticated: true })
  })

  router.post('/read-token', publicTokenExchangeRateLimit, (req: Request, res: Response) => {
    const config = parseApiAuthConfig()
    const submittedToken = readSubmittedToken(req.body)
    const projectRefs = resolveReadTokenScope(submittedToken, parseReadTokenScopes(process.env.API_READ_TOKEN_HASHES))
    const readSessionSecret = getReadSessionSecret(config.token)

    if (!readSessionSecret || projectRefs === null) {
      res.status(401).json({ error: 'Token was not accepted' })
      return
    }

    appendReadSessionCookie(res, readSessionSecret, { projectRefs }, {
      secure: shouldUseSecureSessionCookie(req),
    })

    res.json({ authenticated: true })
  })

  router.delete('/session', publicTokenExchangeRateLimit, (req: Request, res: Response) => {
    const config = parseApiAuthConfig()
    const credential = extractApiCredential(req)
    const hasOwnerCredential = timingSafeTokenMatches(credential ?? undefined, config.token)
    const hasOwnerCookie = getOwnerSessionState(req, config.token).authenticated
    const origin = req.headers.origin
    const hasOwnerIntent = typeof origin === 'string'
      && req.headers[OWNER_INTENT_HEADER] === '1'
      && originPolicy.isAllowedOrigin(origin)

    if (hasOwnerCredential || (hasOwnerCookie && hasOwnerIntent)) {
      invalidateOwnerSessions()
    }

    appendClearOwnerSessionCookie(res, shouldUseSecureSessionCookie(req))
    res.status(204).send()
  })

  return router
}

function readSubmittedToken(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined
  }

  const token = (body as { token?: unknown }).token
  return typeof token === 'string' ? token : undefined
}
