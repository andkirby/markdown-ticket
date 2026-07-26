/**
 * Unit tests for the confirmation gate (TEST-confirm-gate).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Non-Interactive Safety (Edge-5),
 *         BR-5.3.
 *
 * Verifies:
 *   - `--yes` skips the prompt.
 *   - Interactive sessions confirm on `y`/`yes` and decline otherwise.
 *   - Non-interactive sessions without `--yes` throw CONFIRMATION_REQUIRED
 *     (exit 12) instead of hanging.
 */

import { describe, expect, it } from 'bun:test'
import { CloudExitCode } from '../exit-codes'
import { confirmDestructive } from '../confirm'

describe('cloud confirm gate (TEST-confirm-gate)', () => {
  it('--yes skips the prompt entirely', async () => {
    let prompted = false
    await confirmDestructive('destroy?', { yes: true, writePrompt: () => { prompted = true } })
    expect(prompted).toBe(false)
  })

  it('interactive yes confirms', async () => {
    let written = ''
    await confirmDestructive('destroy?', {
      isInteractive: true,
      writePrompt: (m) => { written = m },
      readLine: async () => 'yes',
    })
    expect(written).toContain('destroy?')
  })

  it('interactive "y" confirms (case-insensitive)', async () => {
    await confirmDestructive('destroy?', {
      isInteractive: true,
      writePrompt: () => {},
      readLine: async () => 'Y',
    })
  })

  it('interactive anything else declines', async () => {
    await expect(confirmDestructive('destroy?', {
      isInteractive: true,
      writePrompt: () => {},
      readLine: async () => 'n',
    })).rejects.toMatchObject({ exitCode: CloudExitCode.CLI_ERROR })
  })

  it('non-interactive without --yes throws CONFIRMATION_REQUIRED (Edge-5)', async () => {
    await expect(confirmDestructive('destroy?', { isInteractive: false })).rejects.toMatchObject({
      exitCode: CloudExitCode.CONFIRMATION_REQUIRED,
      code: 'CONFIRMATION_REQUIRED',
    })
  })
})
