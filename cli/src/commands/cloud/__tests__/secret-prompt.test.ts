/**
 * Unit tests for the hidden client-secret reader (TEST-secret-stdin).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Redaction (C-6), BR-3.1, Edge-8.
 *
 * Verifies:
 *   - The secret is read from stdin when non-interactive.
 *   - The secret is read from a hidden prompt when interactive.
 *   - An empty/whitespace secret fails closed (Edge-8).
 *   - The secret is never logged by this module (it returns it; the caller
 *     passes it straight to the credential store).
 */

import { describe, expect, it } from 'bun:test'
import { CloudExitCode } from '../exit-codes'
import { readClientSecret } from '../secret-prompt'

describe('cloud secret prompt (TEST-secret-stdin)', () => {
  it('reads the secret from stdin when non-interactive', async () => {
    const secret = await readClientSecret({
      isInteractive: false,
      readAll: async () => 'super-secret-value\n',
    })
    expect(secret).toBe('super-secret-value')
  })

  it('reads the secret from the hidden prompt when interactive', async () => {
    let prompted = ''
    const secret = await readClientSecret({
      isInteractive: true,
      readHidden: async (p) => { prompted = p; return 'super-secret-value' },
    })
    expect(secret).toBe('super-secret-value')
    expect(prompted).toContain('Client secret')
  })

  it('trims surrounding whitespace', async () => {
    const secret = await readClientSecret({
      isInteractive: false,
      readAll: async () => '  super-secret-value  \n',
    })
    expect(secret).toBe('super-secret-value')
  })

  it('empty stdin fails closed with SECRET_REQUIRED (Edge-8)', async () => {
    await expect(readClientSecret({
      isInteractive: false,
      readAll: async () => '',
    })).rejects.toMatchObject({
      exitCode: CloudExitCode.CONFIG_INVALID,
      code: 'SECRET_REQUIRED',
    })
  })

  it('whitespace-only stdin fails closed (Edge-8)', async () => {
    await expect(readClientSecret({
      isInteractive: false,
      readAll: async () => '   \n\t',
    })).rejects.toMatchObject({ code: 'SECRET_REQUIRED' })
  })
})
