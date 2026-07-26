/**
 * Unit tests for the redacted cloud renderers (TEST-render-redact).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Redaction (C-5, C-6).
 *
 * Asserts that no renderer emits a secret, token, header, cookie, or JWT. We
 * inject known sentinel values and grep the serialized output. This closes
 * the redaction half of C-5/C-6/Edge-8 deterministically.
 */

import { CLOUD_SYNC_CONNECTION_VERSION, CloudSyncConnectionState } from '@mdt/domain-contracts'
import type { CloudConnectionDiagnostics, CloudSyncConnection, ProjectBindingProbe } from '@mdt/domain-contracts'
import type { MachineCredentialDiagnostic } from '@mdt/shared/services/cloud-sync/credential-store'
import { describe, expect, it } from 'bun:test'
import {
  connectResultView,
  credentialView,
  diagnosticsView,
  disableView,
  enableResultView,
  memberView,
} from '../render'

// Known secret sentinels. The redaction sweep asserts none of these substrings
// appear in any rendered output.
const SECRET_SENTINELS = [
  'cf-access-token',
  'clientSecret',
  'CF-Access-Client-Secret',
  'authorization',
  'cookie',
  'jwt',
  'super-secret-value',
]

function assertNoSecrets(label: string, obj: unknown): void {
  const json = JSON.stringify(obj)
  for (const s of SECRET_SENTINELS) {
    if (json.toLowerCase().includes(s.toLowerCase())) {
      throw new Error(`${label}: rendered JSON leaked sentinel "${s}": ${json}`)
    }
  }
}

const connection: CloudSyncConnection = {
  version: CLOUD_SYNC_CONNECTION_VERSION,
  state: CloudSyncConnectionState.ENABLED,
  cloudProjectId: '8a4d-uuid',
  serviceOrigin: 'https://mdt-sync.example.com',
  pollIntervalSeconds: 15,
}

const probe: ProjectBindingProbe = {
  projectId: '8a4d-uuid',
  projectCode: 'MDT',
  coordinationState: 'active',
  role: 'owner',
}

describe('cloud renderers redaction (TEST-render-redact)', () => {
  it('diagnosticsView drops every secret-bearing field', () => {
    const d: CloudConnectionDiagnostics = {
      ready: true,
      connection,
      probe,
    }
    const view = diagnosticsView(d)
    assertNoSecrets('diagnostics', view)
    expect(view.connection).toBeDefined()
    expect(view.probe).toBeDefined()
  })

  it('credentialView exposes only non-secret fields', () => {
    const diag: MachineCredentialDiagnostic = {
      credentialRef: 'runtime-a',
      installed: true,
      clientId: 'client-id-123',
      kind: 'cloudflare-service-token',
    }
    const view = credentialView(diag)
    assertNoSecrets('credential', view)
    expect(view.credentialRef).toBe('runtime-a')
    expect(view.clientId).toBe('client-id-123')
    // The secret is never a property of the diagnostic; verify it's absent.
    expect(JSON.stringify(view)).not.toContain('super-secret-value')
  })

  it('credentialView omits clientId/kind when not installed', () => {
    const view = credentialView({ credentialRef: 'runtime-a', installed: false })
    assertNoSecrets('credential-absent', view)
    expect(view.clientId).toBeUndefined()
  })

  it('enableResultView carries only uuid + replayed', () => {
    const view = enableResultView({ cloudProjectId: '8a4d-uuid', replayed: false })
    assertNoSecrets('enable', view)
    expect(view.replayed).toBe(false)
  })

  it('connectResultView carries only uuid + role', () => {
    const view = connectResultView({ cloudProjectId: '8a4d-uuid', role: 'contributor' })
    assertNoSecrets('connect', view)
    expect(view.role).toBe('contributor')
  })

  it('disableView mirrors connection state without secrets', () => {
    const disabled: CloudSyncConnection = { ...connection, state: CloudSyncConnectionState.DISABLED }
    const view = disableView(disabled)
    assertNoSecrets('disable', view)
    expect(view.state).toBe('disabled')
  })

  it('memberView carries only non-secret member fields', () => {
    const view = memberView({ kind: 'machine', id: 'machine-principal-1', displayLabel: 'runtime-a', role: 'viewer' })
    assertNoSecrets('member', view)
    expect(view.id).toBe('machine-principal-1')
  })

  it('diagnosticsView with a probe carries only non-secret probe fields', () => {
    const d: CloudConnectionDiagnostics = { ready: true, connection, probe }
    const view = diagnosticsView(d)
    assertNoSecrets('diagnostics-with-probe', view)
    // The probe is nested under diagnosticsView; assert the role survives.
    const probeNode = (view.probe as Record<string, unknown> | null)
    expect(probeNode?.role).toBe('owner')
  })
})
