import type {
  ReadTokenInviteResponse,
  ReadTokenInviteSessionResponse,
  ReadTokenListResponse,
} from '@mdt/domain-contracts'
import type { Request, Response } from 'express'
import type { RuntimeConfig } from '../config/runtimeConfig.js'
import type { TokenResolution } from '../security/readTokenStore.js'
import { Router } from 'express'
import { getRuntimeConfig } from '../config/runtimeConfig.js'
import { getRequestAccess } from '../security/apiAuth.js'
import { shouldUseSecureSessionCookie } from '../security/apiSession.js'
import { resolvePublicLinkOriginOptions } from '../security/publicLinkOrigins.js'
import { publicTokenExchangeRateLimit } from '../security/publicRateLimit.js'
import { appendMergedReadSessionCookie } from '../security/readSession.js'
import { createReadTokenStore, ReadTokenRejectedError } from '../security/readTokenStore.js'

const ephemeralInvites = new Map<string, TokenResolution>()

export function createPublicReadTokensRouter(): Router {
  const router = Router()

  router.post('/invites/:code/session', publicTokenExchangeRateLimit, async (req: Request, res: Response) => {
    const code = req.params.code
    const runtimeConfig = getRuntimeConfig(req)
    const secret = runtimeConfig.readSessions.secret
    if (!code || !secret) {
      res.status(401).json({ error: 'Invite was not accepted' })
      return
    }

    try {
      const token = await consumeInviteFromCandidateStores(req, code)
      appendMergedReadSessionCookie({
        req,
        res,
        secret,
        projectRefs: token.projectRefs,
        tokenIds: [token.tokenId],
        expiresAt: token.expiresAt ? new Date(token.expiresAt) : undefined,
        secure: shouldUseSecureSessionCookie(req, runtimeConfig.nodeEnv),
      })

      const response: ReadTokenInviteSessionResponse = {
        authenticated: true,
        projectRefs: token.projectRefs,
      }
      res.json(response)
    }
    catch {
      res.status(401).json({ error: 'Invite was not accepted' })
    }
  })

  return router
}

export function createReadTokensRouter(): Router {
  const router = Router()

  router.get('/', async (req: Request, res: Response) => {
    if (!getRequestAccess(req).canWrite) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const response: ReadTokenListResponse = {
      tokens: await getReadTokenStore(req).listTokens(),
      linkOrigins: getPublicLinkOriginOptions(req),
    }
    res.json(response)
  })

  router.post('/', async (req: Request, res: Response) => {
    if (!getRequestAccess(req).canWrite) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    try {
      const token = await getReadTokenStore(req).createToken({
        name: readString(req.body, 'name'),
        projectRefs: readStringArray(req.body, 'projectRefs'),
        expiresAt: readOptionalString(req.body, 'expiresAt'),
      })

      res.status(201).json(token)
    }
    catch (error) {
      sendRejected(error, res)
    }
  })

  router.post('/:tokenId/invites', async (req: Request, res: Response) => {
    if (!getRequestAccess(req).canWrite) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    try {
      const origin = resolveInviteOrigin(req, getRuntimeConfig(req))
      if (!origin) {
        res.status(400).json({ error: 'No allowed public origin is available for invite links' })
        return
      }

      const invite = await getReadTokenStore(req).createInvite(req.params.tokenId)
      if (allowsEphemeralInviteFallback(req)) {
        ephemeralInvites.set(invite.code, await getReadTokenStore(req).resolveTokenById(req.params.tokenId))
      }
      const response: ReadTokenInviteResponse = {
        expiresAt: invite.expiresAt,
        inviteUrl: `${origin}/invite/${encodeURIComponent(invite.code)}`,
      }
      res.status(201).json(response)
    }
    catch (error) {
      sendRejected(error, res)
    }
  })

  router.post('/:tokenId/revoke', async (req: Request, res: Response) => {
    if (!getRequestAccess(req).canWrite) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    try {
      const revokedToken = await getReadTokenStore(req).revokeToken(req.params.tokenId)
      for (const [code, invite] of ephemeralInvites) {
        if (invite.tokenId === req.params.tokenId) {
          ephemeralInvites.delete(code)
        }
      }
      res.json(revokedToken)
    }
    catch (error) {
      sendRejected(error, res)
    }
  })

  return router
}

function resolveInviteOrigin(req: Request, runtimeConfig: RuntimeConfig): string | null {
  const requestedOrigin = readOptionalString(req.body, 'origin')
  const options = getPublicLinkOriginOptions(req, requestedOrigin ?? undefined, runtimeConfig)
  if (requestedOrigin && options.selectedOrigin !== requestedOrigin.replace(/\/+$/u, '')) {
    return null
  }

  return options.selectedOrigin ?? null
}

function getPublicLinkOriginOptions(req: Request, selectedOrigin?: string, runtimeConfig = getRuntimeConfig(req)) {
  return resolvePublicLinkOriginOptions({
    allowedOrigins: runtimeConfig.origins.allowedOrigins,
    currentOrigin: getRequestOrigin(req),
    publicOrigin: runtimeConfig.origins.publicOrigin,
    selectedOrigin,
  })
}

function getRequestOrigin(req: Request): string | undefined {
  if (req.headers.origin) {
    return req.headers.origin
  }

  const referer = req.headers.referer
  if (!referer) {
    return undefined
  }

  try {
    return new URL(referer).origin
  }
  catch {
    return undefined
  }
}

function getReadTokenStore(req: Request) {
  return createReadTokenStore({ configDir: getRuntimeConfig(req).configDir })
}

async function consumeInviteFromCandidateStores(req: Request, code: string) {
  let lastError: unknown
  for (const configDir of getCandidateConfigDirs(req)) {
    try {
      const token = await createReadTokenStore({ configDir }).consumeInvite(code)
      ephemeralInvites.delete(code)
      return token
    }
    catch (error) {
      lastError = error
    }
  }

  const ephemeralInvite = allowsEphemeralInviteFallback(req) ? ephemeralInvites.get(code) : undefined
  if (ephemeralInvite) {
    ephemeralInvites.delete(code)
    return ephemeralInvite
  }

  throw lastError
}

function getCandidateConfigDirs(req: Request): string[] {
  const runtimeConfig = getRuntimeConfig(req)

  return Array.from(new Set([
    runtimeConfig.configDir,
  ]))
}

function allowsEphemeralInviteFallback(req: Request): boolean {
  return getRuntimeConfig(req).readSessions.allowLocalFallback
}

function readString(body: unknown, key: string): string {
  const value = readOptionalString(body, key)
  if (!value) {
    throw new ReadTokenRejectedError()
  }
  return value
}

function readOptionalString(body: unknown, key: string): string | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

function readStringArray(body: unknown, key: string): string[] {
  if (!body || typeof body !== 'object') {
    throw new ReadTokenRejectedError()
  }

  const value = (body as Record<string, unknown>)[key]
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new ReadTokenRejectedError()
  }

  return value
}

function sendRejected(error: unknown, res: Response): void {
  const status = error instanceof ReadTokenRejectedError ? 400 : 500
  res.status(status).json({ error: 'Read access token request was not accepted' })
}
