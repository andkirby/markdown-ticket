/**
 * TEST-credential-audience — covers BR-1.2, C5.
 *
 * Source: docs/CRs/MDT-201/requirements.md § Lifecycle Decisions,
 *         docs/architecture/cloud-sync/identity-and-access.md § Access Applications.
 *
 * Verifies audience-aware credential resolution:
 *   - Provisioning requests the `operator` Access audience.
 *   - All other operations (connect, membership, diagnostics, disable, normal
 *     coordination) request the `coordination` audience.
 *   - A principal who is a project owner but is NOT admitted by the operator
 *     Access policy is denied for provisioning (operator authority required).
 *
 * The audience resolver is pure routing — it does NOT create credentials. It
 * selects which credential an operation resolves for a validated origin.
 */

import { describe, expect, it, jest } from '@jest/globals'

import {
  CloudAccessAudience,
  type CloudCredential,
} from '@mdt/domain-contracts'
import { AudienceAwareCredentialResolver } from '../credential-providers'

const ORIGIN = 'https://mdt-sync.example.com'

describe('AudienceAwareCredentialResolver (TEST-credential-audience)', () => {
  it('routes provisioning to the operator audience', async () => {
    const calls: string[] = []
    const resolver = new AudienceAwareCredentialResolver({
      resolve: async (_origin, audience) => {
        calls.push(audience)
        return { kind: 'human', cfAccessToken: `tok-${audience}` } satisfies CloudCredential
      },
    })
    const cred = await resolver.forProvisioning(ORIGIN)
    expect(calls).toEqual([CloudAccessAudience.OPERATOR])
    expect(cred?.kind).toBe('human')
    if (cred?.kind === 'human') {
      expect(cred.cfAccessToken).toBe('tok-operator')
    }
  })

  it('routes connect to the coordination audience (never operator)', async () => {
    const calls: string[] = []
    const resolver = new AudienceAwareCredentialResolver({
      resolve: async (_origin, audience) => {
        calls.push(audience)
        return null
      },
    })
    await resolver.forConnect(ORIGIN)
    expect(calls).toEqual([CloudAccessAudience.COORDINATION])
  })

  it('routes membership, diagnostics, and disable to the coordination audience', async () => {
    const calls: string[] = []
    const resolver = new AudienceAwareCredentialResolver({
      resolve: async (_origin, audience) => {
        calls.push(audience)
        return null
      },
    })
    await resolver.forMembership(ORIGIN)
    await resolver.forDiagnostics(ORIGIN)
    await resolver.forDisable(ORIGIN)
    await resolver.forNormalOperation(ORIGIN)
    expect(calls).toEqual([
      CloudAccessAudience.COORDINATION,
      CloudAccessAudience.COORDINATION,
      CloudAccessAudience.COORDINATION,
      CloudAccessAudience.COORDINATION,
    ])
  })

  it('denies provisioning when no operator-audience credential is available (owner-not-operator)', async () => {
    // The principal may be a project owner, but without an operator Access
    // credential, provisioning is denied with a clear operator-authority
    // reason. There is no fallback to a coordination credential.
    const resolver = new AudienceAwareCredentialResolver({
      resolve: async (_origin, audience) => {
        if (audience === CloudAccessAudience.OPERATOR)
          return null
        return { kind: 'human', cfAccessToken: 'coord-only' }
      },
    })
    const cred = await resolver.forProvisioning(ORIGIN)
    expect(cred).toBeNull()
  })

  it('never falls back to coordination when provisioning requires operator', async () => {
    const resolver = new AudienceAwareCredentialResolver({
      resolve: async (_origin, audience) => {
        return audience === CloudAccessAudience.OPERATOR
          ? null
          : ({ kind: 'human', cfAccessToken: 'coord-only' } satisfies CloudCredential)
      },
    })
    expect(await resolver.forProvisioning(ORIGIN)).toBeNull()
  })

  it('surfaces the operator-authority denial reason without leaking a secret', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const resolver = new AudienceAwareCredentialResolver({
      resolve: async () => null,
    })
    const outcome = await resolver.requireForProvisioning(ORIGIN)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.reason).toBe('operator_authority_required')
      expect(outcome.message).not.toContain('secret')
    }
    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('secret'))
    spy.mockRestore()
  })

  it('returns the credential when operator authority is present', async () => {
    const resolver = new AudienceAwareCredentialResolver({
      resolve: async () => ({ kind: 'human', cfAccessToken: 'operator-tok' } satisfies CloudCredential),
    })
    const outcome = await resolver.requireForProvisioning(ORIGIN)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.credential.kind).toBe('human')
      if (outcome.credential.kind === 'human') {
        expect(outcome.credential.cfAccessToken).toBe('operator-tok')
      }
    }
  })
})
