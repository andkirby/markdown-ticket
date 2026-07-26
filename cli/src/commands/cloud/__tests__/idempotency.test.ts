/**
 * Regression tests for cloud enable idempotency + exit-code reachability.
 *
 * Source: docs/CRs/MDT-202/requirements.md § BR-1.5 / Edge-6 (idempotent
 * rerun) and § C-7 (one centralized exit-code mapping).
 *
 * These lock invariants that the broader suites do not exercise through the
 * CLI adapter:
 *   - The idempotency key is DETERMINISTIC across invocations for the same
 *     project/owner/start-number. A random per-process key would defeat
 *     server-side idempotency on retry.
 *   - OUTPUT_FORMAT_CONFLICT maps to exit 13 (the dedicated code is reachable).
 */

import { describe, expect, it } from 'bun:test'
import { enableIdempotencyTokens } from '../../cloud'
import { CliCommandError } from '../../../output/structured'
import { CloudExitCode, exitCodeFor } from '../exit-codes'

describe('cloud enable idempotency tokens (TEST-enable-idempotency)', () => {
  it('produce identical tokens for identical inputs across calls (Edge-6)', () => {
    const a = enableIdempotencyTokens({
      projectCode: 'MDT',
      ownerEmail: 'owner@example.com',
      initialNextTicketNumber: 250,
    })
    const b = enableIdempotencyTokens({
      projectCode: 'MDT',
      ownerEmail: 'owner@example.com',
      initialNextTicketNumber: 250,
    })
    expect(a.idempotencyKey).toBe(b.idempotencyKey)
    expect(a.requestHash).toBe(b.requestHash)
  })

  it('change the tokens when any input changes', () => {
    const base = enableIdempotencyTokens({
      projectCode: 'MDT',
      ownerEmail: 'owner@example.com',
      initialNextTicketNumber: 250,
    })
    const changedOwner = enableIdempotencyTokens({
      projectCode: 'MDT',
      ownerEmail: 'other@example.com',
      initialNextTicketNumber: 250,
    })
    const changedNumber = enableIdempotencyTokens({
      projectCode: 'MDT',
      ownerEmail: 'owner@example.com',
      initialNextTicketNumber: 251,
    })
    expect(changedOwner.idempotencyKey).not.toBe(base.idempotencyKey)
    expect(changedNumber.idempotencyKey).not.toBe(base.idempotencyKey)
  })

  it('yield a 64-char hex key and hash', () => {
    const { idempotencyKey, requestHash } = enableIdempotencyTokens({
      projectCode: 'MDT',
      ownerEmail: 'owner@example.com',
      initialNextTicketNumber: 1,
    })
    expect(idempotencyKey).toMatch(/^[0-9a-f]{64}$/)
    expect(requestHash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('OUTPUT_FORMAT_CONFLICT exit-code reachability (TEST-exit-format-conflict)', () => {
  it('maps a CliCommandError with code OUTPUT_FORMAT_CONFLICT to exit 13', () => {
    // `assertSingleOutputFormat` throws exactly this shape.
    const err = new CliCommandError('OUTPUT_FORMAT_CONFLICT', '--json and --yaml are mutually exclusive')
    expect(exitCodeFor(err)).toBe(CloudExitCode.OUTPUT_FORMAT_CONFLICT)
    expect(CloudExitCode.OUTPUT_FORMAT_CONFLICT).toBe(13)
  })
})
