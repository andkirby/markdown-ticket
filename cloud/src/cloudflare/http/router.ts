/**
 * Versioned HTTP router for the coordination Worker.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md § Error Envelope,
 *         docs/architecture/cloud-sync/identity-and-access.md § Access Applications
 *
 * Routing model:
 *   /healthz                                  → 200 without Worker auth
 *   /v1/projects/*  (coordination audience)   → membership-required
 *   /v1/admin/*     (operator audience)        → operator-only
 *
 * Cloudflare Access may still protect the entire hostname, including
 * `/healthz`. Every Worker failure returns the typed CoordinationError
 * envelope. An unknown route returns invalid_request.
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { CloudPrincipal } from '@mdt/domain-contracts'
import type { AccessValidator } from '../access/jwt'
import type { RateLimitEnv } from '../rate-limit/guard'
import {
  COORDINATION_API_VERSION,
  COORDINATION_ROUTE_PREFIX,
  CoordinationError,
  HEALTH_ROUTE,
  OPERATOR_ROUTE_PREFIX,
} from '@mdt/domain-contracts'

/** A route handler receives the verified principal + original request. */
export interface RouteContext {
  principal: CloudPrincipal
  request: Request
  url: URL
  params: Record<string, string>
  /** D1 binding, threaded from the Worker env. */
  db: D1Database
  /** Per-request correlation id (also in the response envelope). */
  requestId: string
  /**
   * Rate-limit bindings (advisory abuse guard — C7). Optional so routes that
   * never enforce rate limits (and router unit tests without bindings) keep
   * working; mutation/polling handlers opt in.
   */
  rateLimit?: RateLimitEnv
}

type RouteHandler = (ctx: RouteContext) => Promise<Response>
type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface RouteDefinition {
  method: RouteMethod
  /** Regex matched against pathname; named groups populate params. */
  pattern: RegExp
  handler: RouteHandler
}

export class CoordinationRouter {
  private readonly validator: AccessValidator
  private readonly db: D1Database
  private readonly rateLimit?: RateLimitEnv
  private readonly routes: Map<'coordination' | 'operator', RouteDefinition[]> = new Map([
    ['coordination', []],
    ['operator', []],
  ])

  constructor(
    validator: AccessValidator,
    db: D1Database,
    rateLimit?: RateLimitEnv,
  ) {
    this.validator = validator
    this.db = db
    this.rateLimit = rateLimit
  }

  /** Register a coordination-audience route under /v1/projects. */
  coordination(method: RouteMethod, pattern: RegExp, handler: RouteHandler): this {
    this.routes.get('coordination')!.push({ method, pattern, handler })
    return this
  }

  /** Register an operator-audience route under /v1/admin. */
  operator(method: RouteMethod, pattern: RegExp, handler: RouteHandler): this {
    this.routes.get('operator')!.push({ method, pattern, handler })
    return this
  }

  /** Main entry: dispatch a request, returning the typed envelope on failure. */
  async handle(request: Request): Promise<Response> {
    const requestId = crypto.randomUUID()
    const url = new URL(request.url)

    if (url.pathname === HEALTH_ROUTE) {
      return this.tag(
        this.json({ requestId, data: { status: 'ok', version: COORDINATION_API_VERSION } }),
        requestId,
      )
    }

    const audience = this.audienceFor(url.pathname)
    if (!audience) {
      return this.tag(this.toErrorResponse(
        new CoordinationError('invalid_request', { requestId, message: 'not found' }),
        requestId,
      ), requestId)
    }
    const assertion = request.headers.get('Cf-Access-Jwt-Assertion')
    if (!assertion) {
      return this.tag(this.toErrorResponse(
        new CoordinationError('authentication_required', { requestId }),
        requestId,
      ), requestId)
    }

    let principal: CloudPrincipal
    try {
      principal = await this.validator.validate(assertion, audience)
    }
    catch (err) {
      return this.tag(this.toValidationErrorResponse(err, requestId), requestId)
    }

    const match = this.matchRoute(audience, request.method, url.pathname)
    if (!match) {
      return this.tag(this.toErrorResponse(
        new CoordinationError('invalid_request', { requestId, message: 'not found' }),
        requestId,
      ), requestId)
    }

    try {
      return this.tag(await match.def.handler({
        principal,
        request,
        url,
        params: match.params,
        db: this.db,
        requestId,
        rateLimit: this.rateLimit,
      }), requestId)
    }
    catch (err) {
      return this.tag(this.toErrorResponse(err, requestId), requestId)
    }
  }

  private audienceFor(pathname: string): 'coordination' | 'operator' | null {
    if (pathname.startsWith(COORDINATION_ROUTE_PREFIX)) {
      return 'coordination'
    }
    if (pathname.startsWith(OPERATOR_ROUTE_PREFIX)) {
      return 'operator'
    }
    return null
  }

  private matchRoute(
    audience: 'coordination' | 'operator',
    method: string,
    pathname: string,
  ): { def: RouteDefinition, params: Record<string, string> } | null {
    for (const def of this.routes.get(audience)!) {
      if (def.method !== method.toUpperCase()) {
        continue
      }
      const m = def.pattern.exec(pathname)
      if (m) {
        return { def, params: m.groups ?? {} }
      }
    }
    return null
  }

  private toErrorResponse(err: unknown, requestId: string): Response {
    if (err instanceof CoordinationError) {
      return this.errorJson(
        err.code,
        err.requestId || requestId,
        err.status,
        err.message,
        err.currentVersion,
      )
    }
    // An unexpected application/storage failure is recoverable unavailability,
    // never an authentication failure.
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('coordination error', JSON.stringify({ requestId, message }))
    return this.errorJson('coordination_unavailable', requestId, 503)
  }

  private toValidationErrorResponse(err: unknown, requestId: string): Response {
    if (err instanceof CoordinationError) {
      return this.toErrorResponse(err, requestId)
    }
    // Log the validator detail for ops; never leak assertion/claim detail.
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('access validation error', JSON.stringify({ requestId, message }))
    if (/jwks fetch failed|network/i.test(message)) {
      return this.errorJson('coordination_unavailable', requestId, 503)
    }
    return this.errorJson('authentication_required', requestId, 401)
  }

  private json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }

  private tag(response: Response, requestId: string): Response {
    response.headers.set('x-request-id', requestId)
    return response
  }

  private errorJson(
    code: import('@mdt/domain-contracts').CoordinationErrorCode,
    requestId: string,
    status: number,
    message: string = code,
    currentVersion?: number,
  ): Response {
    const retryable = code === 'coordination_unavailable' || code === 'rate_limited'
    return this.json({
      error: {
        code,
        message,
        requestId,
        retryable,
        ...(currentVersion === undefined ? {} : { currentVersion }),
      },
    }, status)
  }
}
