/**
 * TEST-factory-wiring — covers MDT-202 TASK-1 / ART-shared-mgmt-factory.
 *
 * Source: docs/CRs/MDT-202/architecture.md § The Shared Composition Seam.
 *
 * Verifies `createManagementService`:
 *   - Composes a working `CloudProjectManagementService` from existing parts.
 *   - The composed service delegates enable/connect/disable to the injected
 *     coordinator (operator audience for provisioning, coordination for the
 *     rest).
 *   - Connection state lands under the injected `configDirRoot`.
 *   - No lifecycle rule lives in the factory itself (it only wires).
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'

import {
  CloudSyncConnectionState,
  type CloudCredential,
  type ProjectBindingProbe,
} from '@mdt/domain-contracts'
import type { AudienceAwareCredentialProvider, CloudAccessAudienceValue } from '@mdt/domain-contracts'
import { createManagementService } from '../create-management-service'
import { ProjectStateStore } from '../project-state-store'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'

const PROJECT_ID = 'markdown-ticket'

describe('createManagementService (TEST-factory-wiring)', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-factory-'))
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('composes a service whose enable delegates to the injected coordinator exactly once and writes under configDirRoot', async () => {
    let provisionCalls = 0
    const fakeFetch = makeFakeFetch({
      provision: () => {
        provisionCalls++
        return { projectId: '8a4d-uuid', replayed: false }
      },
      probe: (): ProjectBindingProbe => ({
        projectId: '8a4d-uuid',
        projectCode: 'MDT',
        coordinationState: 'active',
        role: 'owner',
      }),
    })

    const provider: AudienceAwareCredentialProvider = {
      resolve: async (_origin: string, audience: CloudAccessAudienceValue): Promise<CloudCredential | null> => {
        // Both audiences resolve in this test; the service requires operator
        // for provisioning and coordination for the membership probe.
        if (audience === 'operator' || audience === 'coordination') {
          return { kind: 'human', cfAccessToken: 'op-token' }
        }
        return null
      },
    }

    const { service } = createManagementService({
      localProjectId: PROJECT_ID,
      projectCode: 'MDT',
      initialOwnerEmail: 'owner@example.com',
      credentialProvider: provider,
      fetchImpl: fakeFetch,
      configDirRoot: root,
    })

    const result = await service.enable({
      projectCode: 'MDT',
      initialOwnerEmail: 'owner@example.com',
      initialNextTicketNumber: 250,
      idempotencyKey: 'k1',
      requestHash: 'h1',
    })

    expect(result.cloudProjectId).toBe('8a4d-uuid')
    expect(provisionCalls).toBe(1)

    // Connection landed under the injected configDirRoot, not the real CONFIG_DIR.
    const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
    const store = new ProjectStateStore({ rootDir: root, profile })
    const read = await store.read(PROJECT_ID)
    expect(read.kind).toBe('enabled')
    if (read.kind === 'enabled') {
      expect(read.connection.state).toBe(CloudSyncConnectionState.ENABLED)
      expect(read.connection.cloudProjectId).toBe('8a4d-uuid')
    }
  })

  it('connect writes state with zero provisioning calls (login != bound)', async () => {
    let provisionCalls = 0
    const fakeFetch = makeFakeFetch({
      provision: () => { provisionCalls++; return { projectId: '8a4d-uuid', replayed: false } },
      probe: (): ProjectBindingProbe => ({
        projectId: '8a4d-uuid',
        projectCode: 'MDT',
        coordinationState: 'active',
        role: 'contributor',
      }),
    })

    const provider: AudienceAwareCredentialProvider = {
      resolve: async () => ({ kind: 'human', cfAccessToken: 'coord-token' }),
    }

    const { service } = createManagementService({
      localProjectId: PROJECT_ID,
      projectCode: 'MDT',
      initialOwnerEmail: 'owner@example.com',
      credentialProvider: provider,
      fetchImpl: fakeFetch,
      configDirRoot: root,
    })

    const result = await service.connect({ cloudProjectId: '8a4d-uuid' })
    expect(result.role).toBe('contributor')
    expect(provisionCalls).toBe(0)

    const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
    const store = new ProjectStateStore({ rootDir: root, profile })
    const read = await store.read(PROJECT_ID)
    expect(read.kind).toBe('enabled')
  })
})

/**
 * Minimal fetch fake satisfying the ManagementCoordinator's HTTP contract.
 * The coordinator POSTs to /v1/... routes; we route by URL substring.
 */
function makeFakeFetch(handlers: {
  provision: () => { projectId: string, replayed: boolean }
  probe: () => ProjectBindingProbe
}): (url: string, init?: RequestInit) => Promise<Response> {
  return async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    // Provisioning: POST /v1/admin/projects → 201 (operator audience origin).
    if (url.includes('/v1/admin/projects') && method === 'POST') {
      const body = handlers.provision()
      return makeResponse(201, { data: body })
    }
    // Membership probe: GET /v1/projects/{id} (coordination audience origin).
    if (url.includes('/v1/projects/') && method === 'GET' && !url.includes('/members')) {
      return makeResponse(200, { data: handlers.probe() })
    }
    return makeResponse(404, { error: { code: 'not_found', message: `unhandled ${method} ${url}`, requestId: '', retryable: false } })
  }
}

function makeResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
