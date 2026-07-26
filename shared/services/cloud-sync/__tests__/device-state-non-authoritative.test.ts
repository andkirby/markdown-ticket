/**
 * TEST-device-state-non-authoritative — covers BR-3.1, C2, Edge-3.
 *
 * Source: docs/CRs/MDT-201/requirements.md § Known Constraints,
 *         docs/architecture/cloud-sync/README.md § Local Integration Contract.
 *
 * Verifies that device-local state is NEVER authoritative for cloud identity
 * or membership:
 *   - The CONFIG_DIR connection selects the cloud PATH but the cloud decides
 *     identity and membership per operation (BR-3.1).
 *   - A lost device whose user remains a valid member is blocked on the next
 *     protected operation after revocation; the local session/journal does not
 *     grant access (Edge-3).
 *   - Local credentials, journals, and caches never create a project or grant
 *     a role.
 *   - The management service consults the cloud (via probe) for every
 *     protected operation; there is no local authorization cache.
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'

import {
  CLOUD_SYNC_CONNECTION_VERSION,
  CloudSyncConnectionState,
  CoordinatorError,
  type CloudCredential,
  type ProjectBindingProbe,
} from '@mdt/domain-contracts'
import { CloudProjectManagementService, type CloudProjectManagementServiceOptions } from '../project-management'
import { ProjectStateStore } from '../project-state-store'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS, buildEffectiveCloudSyncConfig } from '../config'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'

const PROJECT_ID = 'markdown-ticket'
const DISTRIBUTION_ORIGIN = DISTRIBUTION_CLOUD_SYNC_ORIGINS[0]!

describe('device-local state is never authoritative (TEST-device-state-non-authoritative)', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-device-state-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function buildService(opts: {
    probeImpl?: (cloudProjectId: string, cred: CloudCredential) => Promise<ProjectBindingProbe>
    credentialForConnect?: CloudCredential | null
    seedConnection?: boolean
  }): { service: CloudProjectManagementService, probeCount: () => number } {
    const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
    const stateStore = new ProjectStateStore({ rootDir: root, profile })
    let probeCalls = 0
    const defaultProbe = async (id: string, _cred: CloudCredential): Promise<ProjectBindingProbe> => {
      probeCalls++
      return { projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }
    }
    const probe = opts.probeImpl
      ? async (id: string, cred: CloudCredential): Promise<ProjectBindingProbe> => { probeCalls++; return opts.probeImpl!(id, cred) }
      : defaultProbe
    const coordinator: import('../project-management').ManagementCoordinatorPort = {
      provision: async () => { throw new Error('not used') },
      probe,
      listMembers: async () => ({ items: [] }),
      upsertMember: async () => { throw new Error('not used') },
      removeMember: async () => {},
      updateCoordinationState: async () => ({ state: 'active' as const }),
    }
    const resolver = {
      forProvisioning: async () => null,
      requireForProvisioning: async () => ({ ok: false as const, reason: 'operator_authority_required' as const, message: 'denied' }),
      forConnect: async () => opts.credentialForConnect ?? null,
    }
    const service = new CloudProjectManagementService({
      localProjectId: PROJECT_ID,
      profile,
      stateStore,
      coordinator,
      resolver,
      provisioningOrigin: profile.provisioningOrigin,
      coordinationOrigin: DISTRIBUTION_ORIGIN,
      globalConfig: buildEffectiveCloudSyncConfig({ allowedOrigins: [] }),
      projectCode: 'MDT',
      initialOwnerEmail: 'owner@example.com',
    } satisfies CloudProjectManagementServiceOptions)
    return { service, probeCount: () => probeCalls }
  }

  async function seedEnabledConnection(service: CloudProjectManagementService): Promise<void> {
    // Write a connection directly through the state store to simulate an
    // installation that has a device-local enabled connection.
    const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
    const stateStore = new ProjectStateStore({ rootDir: root, profile })
    await stateStore.write(PROJECT_ID, {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: 'uuid-1',
      serviceOrigin: DISTRIBUTION_ORIGIN,
      pollIntervalSeconds: 15,
    })
    void service
  }

  it('a present CONFIG_DIR connection selects the cloud path but the cloud decides membership per operation', async () => {
    let cloudDenies = false
    const { service, probeCount } = buildService({
      probeImpl: async (id) => {
        if (cloudDenies) {
          throw new CoordinatorError('forbidden', { message: 'not a member' })
        }
        return { projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }
      },
      credentialForConnect: { kind: 'human', cfAccessToken: 'tok' },
    })
    await seedEnabledConnection(service)

    // First diagnostics call probes the cloud (the local connection alone does
    // not authorize anything).
    const first = await service.diagnostics()
    expect(first.probe?.role).toBe('owner')
    expect(probeCount()).toBeGreaterThan(0)

    // After the cloud denies, the SAME local connection yields no access — the
    // cloud is authoritative per operation.
    cloudDenies = true
    const second = await service.diagnostics()
    expect(second.probe).toBeNull()
  })

  it('a lost device with a valid local session is blocked after revocation on the next operation (Edge-3)', async () => {
    let revoked = false
    const { service } = buildService({
      probeImpl: async (id) => {
        if (revoked) {
          throw new CoordinatorError('forbidden', { message: 'revoked' })
        }
        return { projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }
      },
      credentialForConnect: { kind: 'human', cfAccessToken: 'session-from-lost-device' },
    })
    await seedEnabledConnection(service)

    const before = await service.diagnostics()
    expect(before.probe).not.toBeNull()

    // The member is revoked in the cloud (independent of this device).
    revoked = true

    // The next protected operation is blocked despite the valid local session.
    // The device's local journal/connection does NOT cache authorization.
    const after = await service.diagnostics()
    expect(after.probe).toBeNull()
  })

  it('device-local state never creates a project or grants a role', async () => {
    // The management service has no method that creates a project from local
    // state alone. Only enable() provisions, and only with the operator
    // audience. Local connection/credential/journal presence grants nothing.
    const { service } = buildService({
      credentialForConnect: null, // no cloud credential
    })
    await seedEnabledConnection(service)

    // With no coordination credential, diagnostics returns probe=null even
    // though a local connection exists. The local connection does not grant
    // identity.
    const diag = await service.diagnostics()
    expect(diag.connection).not.toBeNull() // local state exists
    expect(diag.probe).toBeNull() // but cloud identity is absent
  })

  it('the management service performs no local authorization cache (every protected op hits the cloud)', async () => {
    const { service, probeCount } = buildService({
      credentialForConnect: { kind: 'human', cfAccessToken: 'tok' },
    })
    await seedEnabledConnection(service)

    await service.diagnostics()
    await service.diagnostics()
    await service.diagnostics()
    // Three protected operations → three cloud probes. No local cache.
    expect(probeCount()).toBe(3)
  })

  it('local credentials cannot bypass the cloud per-operation check', async () => {
    // A machine credential installed locally is presented to the cloud, but the
    // cloud still decides membership. The local credential file does not grant
    // a role by itself.
    const { service } = buildService({
      probeImpl: async () => {
        throw new CoordinatorError('forbidden', { message: 'machine principal not a member' })
      },
      credentialForConnect: { kind: 'service', clientId: 'machine-local-id', clientSecret: 'local-secret' },
    })
    await seedEnabledConnection(service)

    const diag = await service.diagnostics()
    // The local machine credential was presented, but the cloud denied — the
    // credential file did not grant access.
    expect(diag.probe).toBeNull()
  })
})
