/**
 * Cloud Sync coordination error envelope.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md § Error Envelope
 *
 * Every Worker failure returns this shape as JSON with the matching HTTP status.
 * Messages must not contain SQL, stack traces, membership lists, paths, tokens,
 * or project existence details (tenant isolation — BR-2.4).
 */

export const COORDINATION_ERRORS = {
  invalid_request: { status: 400, code: 'invalid_request' },
  authentication_required: { status: 401, code: 'authentication_required' },
  forbidden: { status: 403, code: 'forbidden' },
  project_not_found: { status: 404, code: 'project_not_found' },
  reservation_not_found: { status: 404, code: 'reservation_not_found' },
  idempotency_key_reused: { status: 409, code: 'idempotency_key_reused' },
  reservation_state_conflict: { status: 409, code: 'reservation_state_conflict' },
  projection_version_conflict: { status: 409, code: 'projection_version_conflict' },
  last_owner_required: { status: 409, code: 'last_owner_required' },
  coordination_suspended: { status: 423, code: 'coordination_suspended' },
  rate_limited: { status: 429, code: 'rate_limited' },
  coordination_unavailable: { status: 503, code: 'coordination_unavailable' },
} as const

export type CoordinationErrorCode = keyof typeof COORDINATION_ERRORS
/** Backward-compatible local-client name for the same canonical code set. */
export type CoordinatorErrorCode = CoordinationErrorCode

/**
 * Typed coordination error envelope returned by the Worker on failure.
 */
export interface CoordinationErrorEnvelope {
  error: {
    /** Stable machine code from COORDINATION_ERRORS. */
    code: CoordinationErrorCode
    /** Human-readable; never leaks SQL, paths, tokens, or existence details. */
    message: string
    /** Opaque request id for correlation with audit and logs. */
    requestId: string
    /** Whether retrying later can reasonably succeed without changing input. */
    retryable: boolean
    /** Present for optimistic-concurrency failures. */
    currentVersion?: number
  }
}

/**
 * Thrown inside Worker handlers; the router converts it to the envelope above.
 * Carries the canonical status + code so handlers never hand-write HTTP status.
 */
export interface CoordinatorErrorOptions {
  requestId?: string
  message?: string
  currentVersion?: number
}

/**
 * One canonical error type for both Worker handlers and local clients.
 *
 * An options object deliberately avoids the former ambiguous two-string
 * constructors, where a message could be interpreted as a request id.
 */
export class CoordinatorError extends Error {
  readonly status: number
  readonly code: CoordinationErrorCode
  readonly requestId: string
  readonly currentVersion?: number

  constructor(
    code: CoordinationErrorCode,
    options: CoordinatorErrorOptions = {},
  ) {
    const def = COORDINATION_ERRORS[code]
    super(options.message ?? code)
    this.name = 'CoordinatorError'
    this.code = code
    this.status = def.status
    this.requestId = options.requestId ?? ''
    this.currentVersion = options.currentVersion
  }
}

/** Worker-facing name retained as an alias of the canonical class. */
export { CoordinatorError as CoordinationError }
