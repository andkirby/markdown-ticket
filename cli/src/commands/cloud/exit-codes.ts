/**
 * Centralized cloud-command exit-code mapping (MDT-202 TASK-2 / ART-cli-cloud-exit).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Exit-Code Mapping (C-7).
 *
 * One place owns the mapping from a failure cause to a numeric process exit
 * code. Cloud command handlers throw a {@link CloudCommandError} (or let a
 * `CoordinatorError`/`ProjectStateFormatError`/`UntrustedServiceOriginError`
 * propagate); the top-level cloud action wrapper calls {@link exitCodeFor}
 * and sets `process.exitCode`. No cloud handler calls `process.exit` inline.
 *
 * Exit numbers are stable and documented; downstream automation may branch on
 * them. `1` is reserved for generic CLI errors so the existing `runCliAction`
 * default behavior is preserved for non-cloud commands.
 */

import { CoordinatorError } from '@mdt/domain-contracts'
import { MachineCredentialFormatError } from '@mdt/shared/services/cloud-sync/credential-store.js'
import { ProjectStateFormatError, UntrustedServiceOriginError } from '@mdt/shared/services/cloud-sync/project-state-store.js'

/**
 * Stable exit codes for the `mdt-cli cloud` command group. Numbers are part
 * of the public contract for automation; do not renumber.
 */
export const CloudExitCode = {
  SUCCESS: 0,
  CLI_ERROR: 1,
  NO_PROJECT_CONTEXT: 2,
  AUTHENTICATION_REQUIRED: 3,
  FORBIDDEN: 4,
  NOT_FOUND: 5,
  CONFLICT: 6,
  COORDINATION_SUSPENDED: 7,
  COORDINATION_UNAVAILABLE: 8,
  RATE_LIMITED: 9,
  CONFIG_INVALID: 10,
  UNTRUSTED_ORIGIN: 11,
  CONFIRMATION_REQUIRED: 12,
  OUTPUT_FORMAT_CONFLICT: 13,
} as const

type CloudExitCodeValue = (typeof CloudExitCode)[keyof typeof CloudExitCode]

/**
 * A CLI error carrying the cloud exit code that should result. Handlers throw
 * this (or a plain error); the wrapper maps it through {@link exitCodeFor}.
 */
export class CloudCommandError extends Error {
  public readonly code: string
  public readonly exitCode: CloudExitCodeValue
  public readonly details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    exitCode: CloudExitCodeValue,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'CloudCommandError'
    this.code = code
    this.exitCode = exitCode
    this.details = details
  }
}

/** Map any thrown value to its stable cloud exit code. */
export function exitCodeFor(error: unknown): CloudExitCodeValue {
  if (error instanceof CloudCommandError) {
    return error.exitCode
  }
  if (error instanceof CoordinatorError) {
    return coordinatorExitCode(error.code)
  }
  if (error instanceof UntrustedServiceOriginError) {
    return CloudExitCode.UNTRUSTED_ORIGIN
  }
  if (error instanceof ProjectStateFormatError || error instanceof MachineCredentialFormatError) {
    return CloudExitCode.CONFIG_INVALID
  }
  return CloudExitCode.CLI_ERROR
}

/** Map a `CoordinatorError.code` to its stable exit code. */
function coordinatorExitCode(code: CoordinatorError['code']): CloudExitCodeValue {
  switch (code) {
    case 'authentication_required':
      return CloudExitCode.AUTHENTICATION_REQUIRED
    case 'forbidden':
      return CloudExitCode.FORBIDDEN
    case 'project_not_found':
    case 'reservation_not_found':
      return CloudExitCode.NOT_FOUND
    case 'idempotency_key_reused':
    case 'reservation_state_conflict':
    case 'projection_version_conflict':
    case 'last_owner_required':
      return CloudExitCode.CONFLICT
    case 'coordination_suspended':
      return CloudExitCode.COORDINATION_SUSPENDED
    case 'coordination_unavailable':
      // Includes a real 503 service_not_ready response (Edge-4).
      return CloudExitCode.COORDINATION_UNAVAILABLE
    case 'rate_limited':
      return CloudExitCode.RATE_LIMITED
    case 'invalid_request':
      return CloudExitCode.CONFIG_INVALID
    default:
      return CloudExitCode.CLI_ERROR
  }
}
