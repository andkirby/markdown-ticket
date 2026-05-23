import type { Request, Response } from 'express'
import { Router } from 'express'
import { parseApiAuthConfig, timingSafeTokenMatches } from '../security/apiAuth.js'
import {
  appendClearOwnerSessionCookie,
  appendOwnerSessionCookie,
  getOwnerSessionState,
  invalidateOwnerSessions,
  OWNER_SESSION_MAX_AGE_SECONDS,
  shouldUseSecureSessionCookie,
} from '../security/apiSession.js'

export function createAuthRouter(): Router {
  const router = Router()

  router.get('/session', (req: Request, res: Response) => {
    const config = parseApiAuthConfig()
    const session = getOwnerSessionState(req, config.token)

    res.json({
      authEnabled: config.enabled,
      authenticated: session.authenticated,
    })
  })

  router.post('/session', (req: Request, res: Response) => {
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

  router.delete('/session', (req: Request, res: Response) => {
    invalidateOwnerSessions()
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
