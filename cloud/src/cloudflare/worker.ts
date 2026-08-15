/**
 * Cloud Sync Coordination Worker entry point.
 *
 * Boundary owner: docs/CRs/MDT-200/cloud-package-boundary.md
 * Operations:     docs/architecture/cloud-sync/operations.md
 * Identity:       docs/architecture/cloud-sync/identity-and-access.md
 *
 * MDT-200: versioned routing, Access JWT validation, typed errors, health,
 * allocation, membership, recovery, projection, audit, rate limiting, and
 * scheduled maintenance. All HTTP capabilities register through one router.
 *
 * PLATFORM LIMITATION: wrangler types does not emit rate-limit bindings in the
 * generated Env. We add the two bindings via interface declaration merging
 * rather than maintaining a parallel hand-written Env (operations.md: "does not
 * hand-write a duplicate Env interface").
 */

import type { RouteContext } from './http/router'
import { CoordinationError, PROJECTION_STREAM_PROTOCOL_VERSION } from '@mdt/domain-contracts'
import { AccessValidator } from './access/jwt'
import { requireProjectRole } from './application/authorization'
import {
  getMembers,
  probeProject,
  putMember,
  removeMember,
  updateCoordinationState,
} from './application/membership'
import {
  getProjection,
  poll as pollProjections,
  publish as publishProjection,
} from './application/projection-usecase'
import { provisionProject } from './application/provisioning'
import { acknowledge, createReservation, getReservation } from './application/reservation'
import { recordAudit } from './d1/audit'
import {
  authorizeProjectionStreamSession,
  buildHubForwardedHeaders,
  projectionStreamRouteName,
} from './durable/projection-hub-helpers'
import { ProjectProjectionHub } from './durable/ProjectProjectionHub'
import { readJsonObject } from './http/body'
import { CoordinationRouter } from './http/router'
import { rateLimitKey, withinRateLimit } from './rate-limit/guard'
import { expireStaleReservations } from './scheduled/maintenance'

// Export the Durable Object class so Wrangler can bind it (MDT-226).
export { ProjectProjectionHub }

// `wrangler types` generates worker-configuration.d.ts, which declares the
// global Env covering D1, vars, and version metadata. See cloud/README.md.
//
// PLATFORM LIMITATION: wrangler types does not emit rate-limit bindings in the
// generated Env. We merge the two bindings into the global Env rather than
// maintaining a parallel hand-written Env (operations.md: "does not hand-write
// a duplicate Env interface"). Remove this augmentation if a future wrangler
// version emits rate-limit bindings automatically.
interface RateLimit {
  limit: (options: { key: string }) => Promise<{ success: boolean }>
}

declare global {

  interface Env {
    RATE_LIMIT_READ: RateLimit
    RATE_LIMIT_MUTATE: RateLimit
  }
}

/** Build the router once per Worker instance (not per request — no global request state). */
function buildRouter(env: Env): CoordinationRouter {
  const validator = new AccessValidator({
    teamDomain: env.TEAM_DOMAIN,
    coordinationAud: env.COORDINATION_AUD,
    operatorAud: env.OPERATOR_AUD,
  })
  const router = new CoordinationRouter(validator, env.DB, {
    RATE_LIMIT_READ: env.RATE_LIMIT_READ,
    RATE_LIMIT_MUTATE: env.RATE_LIMIT_MUTATE,
  }, env.PROJECT_HUB as unknown as DurableObjectNamespace)

  // Slice 2: coordination routes (membership enforced inside each use case).
  router.coordination(
    'GET',
    /^\/v1\/projects\/(?<projectId>[^/]+)$/,
    async ctx => json(
      ctx.requestId,
      await probeProject(ctx.db, ctx.principal, ctx.params.projectId, ctx.requestId),
      200,
    ),
  )
  router.coordination(
    'GET',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/members$/,
    async ctx => json(
      ctx.requestId,
      await getMembers(ctx.db, ctx.principal, ctx.params.projectId, ctx.requestId),
      200,
    ),
  )
  router.coordination(
    'GET',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/tickets\/(?<ticketNumber>\d+)\/projection$/,
    async (ctx) => {
      const result = await getProjection(
        ctx.db,
        ctx.principal,
        ctx.params.projectId,
        Number.parseInt(ctx.params.ticketNumber, 10),
        ctx.requestId,
      )
      return new Response(JSON.stringify({ requestId: ctx.requestId, data: result }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'etag': `"${result.projectionVersion}"`,
        },
      })
    },
  )
  router.coordination(
    'PUT',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/members\/(?<kind>[^/]+)\/(?<principalId>[^/]+)$/,
    async (ctx) => {
      const body = await readJsonObject(ctx.request, ctx.requestId)
      return json(
        ctx.requestId,
        await putMember(
          ctx.db,
          ctx.principal,
          ctx.params.projectId,
          ctx.params.kind,
          ctx.params.principalId,
          body,
          ctx.requestId,
        ),
        200,
      )
    },
  )
  router.coordination(
    'DELETE',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/members\/(?<kind>[^/]+)\/(?<principalId>[^/]+)$/,
    async (ctx) => {
      await removeMember(
        ctx.db,
        ctx.principal,
        ctx.params.projectId,
        ctx.params.kind,
        ctx.params.principalId,
        ctx.requestId,
      )
      // MDT-226 (Edge-4): exclude and close the revoked member's active sockets
      // before any later projection delivery, routed through the project hub.
      if (ctx.projectHub) {
        const id = ctx.projectHub.idFromName(ctx.params.projectId)
        const stub = ctx.projectHub.get(id) as DurableObjectStub<ProjectProjectionHub>
        await stub.revokeSockets(ctx.params.principalId)
      }
      return new Response(null, { status: 204 })
    },
  )
  router.coordination(
    'PUT',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/coordination-state$/,
    async (ctx) => {
      const body = await readJsonObject(ctx.request, ctx.requestId)
      return json(
        ctx.requestId,
        await updateCoordinationState(ctx.db, ctx.principal, ctx.params.projectId, body, ctx.requestId),
        200,
      )
    },
  )
  router.coordination(
    'POST',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/reservations$/,
    async (ctx) => {
      // Advisory abuse guard (C7): denial returns 429 but never gates D1
      // allocation correctness. Applied before the allocation work.
      if (ctx.rateLimit && !await withinRateLimit(ctx.rateLimit, 'RATE_LIMIT_MUTATE', rateLimitKey(ctx.principal, ctx.params.projectId, 'mutate'))) {
        return rateLimited(ctx, 'reservation.create')
      }
      const body = await readJsonObject(ctx.request, ctx.requestId)
      const result = await createReservation(ctx.db, ctx.principal, ctx.params.projectId, body, ctx.requestId)
      return json(ctx.requestId, result, 201)
    },
  )
  router.coordination(
    'GET',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/reservations\/(?<reservationId>[^/]+)$/,
    async ctx => json(
      ctx.requestId,
      await getReservation(
        ctx.db,
        ctx.principal,
        ctx.params.projectId,
        ctx.params.reservationId,
        ctx.requestId,
      ),
      200,
    ),
  )
  router.coordination(
    'PUT',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/reservations\/(?<reservationId>[^/]+)\/acknowledgement$/,
    async (ctx) => {
      if (ctx.rateLimit && !await withinRateLimit(ctx.rateLimit, 'RATE_LIMIT_MUTATE', rateLimitKey(ctx.principal, ctx.params.projectId, 'mutate'))) {
        return rateLimited(ctx, 'reservation.acknowledge')
      }
      const body = await readJsonObject(ctx.request, ctx.requestId)
      const ack = await acknowledge(ctx.db, ctx.principal, ctx.params.projectId, ctx.params.reservationId, {
        operationId: body.operationId ?? '',
        contentHash: body.contentHash ?? '',
        header: body.header as AcknowledgeHeader,
      }, ctx.requestId)
      return json(ctx.requestId, ack, 200)
    },
  )

  // Slice 4: projection routes.
  router.coordination(
    'GET',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/projections$/,
    async (ctx) => {
      const url = new URL(ctx.request.url)
      // Polling uses the read budget (operations.md § Rate Limits).
      if (ctx.rateLimit && !await withinRateLimit(ctx.rateLimit, 'RATE_LIMIT_READ', rateLimitKey(ctx.principal, ctx.params.projectId, 'read'))) {
        return rateLimited(ctx, 'projection.poll')
      }
      const after = parseQueryInteger(url.searchParams.get('after'), 0, 0, Number.MAX_SAFE_INTEGER, 'after', ctx.requestId)
      const limit = parseQueryInteger(url.searchParams.get('limit'), 100, 1, 500, 'limit', ctx.requestId)
      const items = await pollProjections(ctx.db, ctx.principal, ctx.params.projectId, after, limit, ctx.requestId)
      return json(ctx.requestId, items, 200)
    },
  )
  router.coordination(
    'PUT',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/tickets\/(?<ticketNumber>\d+)\/(?<operation>projection|lifecycle)$/,
    async (ctx) => {
      if (ctx.rateLimit && !await withinRateLimit(ctx.rateLimit, 'RATE_LIMIT_MUTATE', rateLimitKey(ctx.principal, ctx.params.projectId, 'mutate'))) {
        return rateLimited(ctx, 'projection.publish')
      }
      const body = await readJsonObject(ctx.request, ctx.requestId)
      const expectedProjectionVersion = parseIfMatch(ctx.request.headers.get('If-Match'))
      const requestedLifecycle = body.lifecycle === 'deleted' ? 'deleted' : 'active'
      const publishBody = {
        ...body,
        ticketNumber: Number.parseInt(ctx.params.ticketNumber, 10),
        expectedProjectionVersion,
        lifecycle: ctx.params.operation === 'lifecycle' ? requestedLifecycle : 'active',
      }
      // MDT-226: route the projection mutation through the deterministic project
      // hub so the hub arms its alarm before the D1 commit and broadcasts the
      // committed delta (commit-before-broadcast, OBL-commit-before-delivery).
      if (ctx.projectHub) {
        const id = ctx.projectHub.idFromName(ctx.params.projectId)
        const stub = ctx.projectHub.get(id) as DurableObjectStub<ProjectProjectionHub>
        const result = await stub.commitAndDeliver(ctx.params.projectId, {
          principal: ctx.principal,
          body: publishBody,
          requestId: ctx.requestId,
        })
        // The hub returns a typed outcome: DO RPC rejections lose the error
        // class, which used to turn version conflicts into untyped 503s.
        if (!result.ok) {
          throw new CoordinationError(result.code, {
            requestId: ctx.requestId,
            ...(result.currentVersion !== undefined ? { currentVersion: result.currentVersion } : {}),
          })
        }
        return new Response(JSON.stringify({ requestId: ctx.requestId, data: result }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'etag': `"${result.projectionVersion}"`,
          },
        })
      }
      // Fallback (router unit tests without the binding): commit directly.
      const result = await publishProjection(ctx.db, ctx.principal, ctx.params.projectId, publishBody, ctx.requestId)
      return new Response(JSON.stringify({ requestId: ctx.requestId, data: result }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'etag': `"${result.projectionVersion}"`,
        },
      })
    },
  )

  // MDT-226 incident recovery: the stream-session CONTROL PLANE. One typed
  // HTTPS request per activation; the hub caches the bounded membership
  // decision so an unchanged activation fingerprint performs at most one D1
  // membership decision and one denial audit (C-14, C-15). The grant is
  // server-only and returned to the caller exactly once.
  router.coordination(
    'POST',
    /^\/v1\/projects\/(?<projectId>[^/]+)\/projection-stream-sessions$/,
    async (ctx) => {
      // Rate-limit before any D1 work (operations.md § Rate Limits).
      if (ctx.rateLimit && !await withinRateLimit(ctx.rateLimit, 'RATE_LIMIT_READ', rateLimitKey(ctx.principal, ctx.params.projectId, 'read'))) {
        return rateLimited(ctx, 'projection.stream.session')
      }
      const body = await readJsonObject(ctx.request, ctx.requestId)
      const activationId = typeof body.activationId === 'string' ? body.activationId : ''
      if (!activationId) {
        throw new CoordinationError('invalid_request', { requestId: ctx.requestId, message: 'invalid activationId' })
      }
      const tokenExpiry = typeof body.tokenExpiry === 'number' && Number.isSafeInteger(body.tokenExpiry) && body.tokenExpiry >= 0
        ? body.tokenExpiry
        : 0
      if (!ctx.projectHub) {
        throw new CoordinationError('coordination_unavailable', { requestId: ctx.requestId })
      }
      const stub = ctx.projectHub.get(
        ctx.projectHub.idFromName(ctx.params.projectId),
      ) as DurableObjectStub<ProjectProjectionHub>

      const result = await authorizeProjectionStreamSession({
        hub: {
          cachedSessionDecision: (principal, activationId) =>
            stub.sessionDecision({ principal, activationId }),
          recordSessionDecision: (principal, activationId, outcome, opts) =>
            stub.recordSessionDecision({ principal, activationId, outcome, ...opts }),
        },
        membership: {
          // The single D1 membership decision (+ one denial audit on failure).
          authorizeOnce: async () => {
            try {
              await requireProjectRole(ctx.db, ctx.principal, ctx.params.projectId, 'viewer', 'projection.stream.session', ctx.requestId)
              return { ok: true as const }
            }
            catch (err) {
              if (err instanceof CoordinationError)
                return { ok: false as const, code: err.code, status: err.status }
              throw err
            }
          },
        },
        principal: { principalKind: ctx.principal.kind, principalId: ctx.principal.id },
        activationId,
        tokenExpiry,
      })

      if (!result.ok) {
        throw new CoordinationError(result.code, { requestId: ctx.requestId })
      }
      return json(ctx.requestId, {
        grant: result.grant,
        grantExpiresAt: result.expiresAt,
        streamProtocol: PROJECTION_STREAM_PROTOCOL_VERSION,
      }, 201)
    },
  )

  // Slice 2: operator routes.
  router.operator(
    'POST',
    /^\/v1\/admin\/projects$/,
    async (ctx) => {
      if (ctx.rateLimit && !await withinRateLimit(ctx.rateLimit, 'RATE_LIMIT_MUTATE', rateLimitKey(ctx.principal, 'operator', 'operator'))) {
        return rateLimited(ctx, 'project.provision')
      }
      const body = await readJsonObject(ctx.request, ctx.requestId)
      const result = await provisionProject(ctx.db, body, ctx.requestId)
      return json(ctx.requestId, result, 201)
    },
  )

  return router
}

function json(requestId: string, data: unknown, status: number): Response {
  return new Response(JSON.stringify({ requestId, data }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * 429 rate_limited envelope. The guard is advisory (C7): this only fires when
 * the abuse budget is exhausted; it never gates allocation correctness because
 * the D1 transaction is the only correctness control.
 */
async function rateLimited(ctx: RouteContext, action: string): Promise<Response> {
  await recordAudit(ctx.db, {
    cloudProjectId: ctx.params.projectId ?? null,
    requestId: ctx.requestId,
    principal: ctx.principal,
    action,
    outcome: 'rate_limited',
    resourceType: ctx.params.projectId ? 'project' : 'operator',
    resourceId: ctx.params.projectId ?? null,
  })
  return new Response(
    JSON.stringify({
      error: {
        code: 'rate_limited',
        message: 'rate_limited',
        requestId: ctx.requestId,
        retryable: true,
      },
    }),
    { status: 429, headers: { 'content-type': 'application/json' } },
  )
}

function parseIfMatch(value: string | null): number {
  if (!value) {
    return 0
  }
  const normalized = value.trim().replace(/^W\//, '').replace(/^"|"$/g, '')
  const parsed = Number.parseInt(normalized, 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0
}

function parseQueryInteger(
  value: string | null,
  defaultValue: number,
  minimum: number,
  maximum: number,
  field: string,
  requestId: string,
): number {
  if (value === null)
    return defaultValue
  if (!/^\d+$/u.test(value)) {
    throw new CoordinationError('invalid_request', { requestId, message: `invalid ${field}` })
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new CoordinationError('invalid_request', { requestId, message: `invalid ${field}` })
  }
  return parsed
}

/** The projected header fields accepted on acknowledgement (ProjectedHeader). */
interface AcknowledgeHeader {
  code: string
  title: string
  status: string
  type: string | null
  priority: string | null
  assignee: string | null
  date_created: string | null
  last_modified: string
}

const fetch: ExportedHandler<Env>['fetch'] = async (
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
): Promise<Response> => {
  const startedAt = Date.now()
  const router = buildRouter(env)

  // MDT-226: projection-stream WebSocket upgrade — backend-only, never browser.
  // Validates the Access assertion and current membership, then routes by exact
  // cloud project UUID to the deterministic ProjectProjectionHub.
  const streamMatch = matchProjectionStream(request)
  if (streamMatch) {
    const response = await handleProjectionStreamUpgrade(request, env, router, streamMatch)
    logRequest(request, response, env)
    return response
  }

  const response = await router.handle(request)
  logRequest(request, response, env, startedAt)
  return response
}

/** Structured request-completion telemetry (MDT-200 + MDT-226 stream upgrades). */
function logRequest(request: Request, response: Response, env: Env, startedAt = Date.now()): void {
  // eslint-disable-next-line no-console -- structured request-completion telemetry
  console.info(JSON.stringify({
    event: 'cloud_sync_request',
    requestId: response.headers.get('x-request-id'),
    workerVersion: env.VERSION_METADATA.id,
    route: routeName(request),
    status: response.status,
    durationMs: Date.now() - startedAt,
  }))
}

/**
 * Match a projection-stream WebSocket upgrade request. Returns the parsed cloud
 * project id, or null if this is not a stream upgrade. The endpoint is a cloud
 * service endpoint used only by the local backend (C-11).
 */
function matchProjectionStream(request: Request): string | null {
  if (request.headers.get('upgrade') !== 'websocket') {
    return null
  }
  const url = new URL(request.url)
  const match = /^\/v1\/projects\/(?<projectId>[^/]+)\/projection-stream$/.exec(url.pathname)
  return match?.groups?.projectId ?? null
}

/**
 * Handle the projection-stream DATA-PLANE upgrade: validate the Access
 * assertion (no D1), then forward the request — with its WebSocket upgrade
 * headers preserved — to the deterministic project hub, which validates the
 * stream grant without a membership query (C-5, C-10, C-15, Edge-8).
 *
 * The typed authorization outcome already happened on the session control
 * plane; Bun cannot read an upgrade rejection body, so this path deliberately
 * performs no membership decision.
 */
async function handleProjectionStreamUpgrade(
  request: Request,
  env: Env,
  router: CoordinationRouter,
  cloudProjectId: string,
): Promise<Response> {
  const validated = await router.validateUpgrade(request, 'coordination')
  if (!validated.ok) {
    return validated.response
  }

  // Route by exact cloud project UUID to the deterministic hub (C-5).
  const id = env.PROJECT_HUB.idFromName(cloudProjectId)
  const stub = env.PROJECT_HUB.get(id)

  // Preserve EVERY client header — including `Upgrade: websocket` and the
  // `Sec-WebSocket-*` handshake — then append the internal context the hub
  // validates against its grant digests. Replacing the header set is what
  // lost the upgrade in the 2026-08-15 incident (Edge-8).
  const hubRequest = new Request(request, {
    headers: buildHubForwardedHeaders(request.headers, {
      'x-mdt-cloud-project-id': cloudProjectId,
      'x-mdt-stream-grant': request.headers.get('x-mdt-stream-grant') ?? '',
    }),
  })
  return stub.fetch(hubRequest)
}

function routeName(request: Request): string {
  const pathname = new URL(request.url).pathname
  const method = request.method.toUpperCase()
  // MDT-226 incident recovery: accurate stream route labels BEFORE the
  // generic /v1/projects/ fallthrough (a `project.probe` label hid the
  // failing loops during the incident).
  const streamRoute = projectionStreamRouteName(method, pathname)
  if (streamRoute)
    return streamRoute
  if (pathname === '/healthz')
    return 'health'
  if (pathname.startsWith('/v1/admin/'))
    return `${method} operator`
  if (pathname.includes('/reservations/') && pathname.endsWith('/acknowledgement'))
    return 'reservation.acknowledge'
  if (pathname.endsWith('/reservations'))
    return 'reservation.create'
  if (pathname.includes('/reservations/'))
    return 'reservation.recover'
  if (pathname.endsWith('/projections'))
    return 'projection.poll'
  if (pathname.endsWith('/projection') || pathname.endsWith('/lifecycle'))
    return method === 'GET' ? 'projection.read' : 'projection.publish'
  if (pathname.includes('/members/'))
    return `membership.${method === 'DELETE' ? 'delete' : 'upsert'}`
  if (pathname.endsWith('/members'))
    return 'membership.list'
  if (pathname.endsWith('/coordination-state'))
    return 'project.coordination-state'
  if (pathname.startsWith('/v1/projects/'))
    return 'project.probe'
  return 'unknown'
}

/**
 * Scheduled entry point — invoked by the Cron Trigger every 15 minutes (UTC).
 * Expires stale `reserved` reservations (>24h) to `abandoned` in bounded batches
 * with audit. Never decrements the counter or deletes a reservation (C3).
 */
const scheduled: ExportedHandler<Env>['scheduled'] = async (
  _controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> => {
  const result = expireStaleReservations(env.DB)
  ctx.waitUntil(result)
  await result
}

const handler: ExportedHandler<Env> = { fetch, scheduled }

export default handler
