/**
 * Unit tests for the centralized cloud exit-code mapping (TEST-exit-codes).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Exit-Code Mapping (C-7).
 *
 * Covers BR-5.2, C-7, Edge-5: every failure cause maps to a stable documented
 * exit number through one place; no handler needs to call process.exit inline.
 */

import { CloudExitCode, CloudCommandError, exitCodeFor } from '../exit-codes'
import { CoordinatorError } from '@mdt/domain-contracts'
import { MachineCredentialFormatError } from '@mdt/shared/services/cloud-sync/credential-store'
import { ProjectStateFormatError, UntrustedServiceOriginError } from '@mdt/shared/services/cloud-sync/project-state-store'
import { describe, expect, it } from 'bun:test'

describe('cloud exit-code mapping (TEST-exit-codes)', () => {
  it('maps CloudCommandError to its declared exit code', () => {
    const err = new CloudCommandError('NO_PROJECT_CONTEXT', 'no project', CloudExitCode.NO_PROJECT_CONTEXT)
    expect(exitCodeFor(err)).toBe(2)
  })

  it('maps CONFIRMATION_REQUIRED to exit 12 (Edge-5)', () => {
    const err = new CloudCommandError('CONFIRMATION_REQUIRED', 'supply --yes', CloudExitCode.CONFIRMATION_REQUIRED)
    expect(exitCodeFor(err)).toBe(12)
  })

  it('maps each CoordinatorError code to a distinct stable exit', () => {
    const cases: Array<[CoordinatorError['code'], number]> = [
      ['authentication_required', 3],
      ['forbidden', 4],
      ['project_not_found', 5],
      ['reservation_not_found', 5],
      ['idempotency_key_reused', 6],
      ['reservation_state_conflict', 6],
      ['last_owner_required', 6],
      ['coordination_suspended', 7],
      ['coordination_unavailable', 8], // includes real 503 (Edge-4)
      ['rate_limited', 9],
      ['invalid_request', 10],
    ]
    for (const [code, expected] of cases) {
      const err = new CoordinatorError(code, { message: `mock ${code}` })
      expect(Number(exitCodeFor(err))).toBe(expected)
    }
  })

  it('maps config-trust errors', () => {
    expect(exitCodeFor(new UntrustedServiceOriginError())).toBe(11)
    expect(exitCodeFor(new ProjectStateFormatError())).toBe(10)
    expect(exitCodeFor(new MachineCredentialFormatError('bad'))).toBe(10)
  })

  it('maps unknown errors to generic CLI_ERROR (1)', () => {
    expect(exitCodeFor(new Error('boom'))).toBe(1)
    expect(exitCodeFor('string error')).toBe(1)
  })
})
