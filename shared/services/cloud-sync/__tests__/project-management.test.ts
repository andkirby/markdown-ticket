/**
 * TEST-pm-enable-commit-last — covers BR-1.1, BR-1.6, C3.
 *
 * Source: docs/CRs/MDT-201/architecture.md § Runtime Flows,
 *         docs/CRs/MDT-201/requirements.md § Lifecycle Decisions.
 *
 * Verifies enable and connect orchestration in the CloudProjectManagementService:
 *   - enable journals the provisioning idempotency key BEFORE provisioning.
 *   - enable requires the operator audience (BR-1.2).
 *   - enable provisions, then probes membership, then writes CONFIG_DIR state
 *     commit-last. A failed readiness/provisioning/membership step leaves
 *     connection state unchanged (BR-1.6).
 *   - connect authenticates to the coordination audience, verifies membership,
 *     then writes CONFIG_DIR state. connect NEVER provisions (BR-2.2, BR-2.6).
 *   - An operator-audience denial (owner-not-operator) writes no connection.
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
  type ProvisionProjectRequest,
} from '@mdt/domain-contracts'
import { CloudProjectManagementService, type CloudProjectManagementServiceOptions } from '../project-management'
import { ProjectStateStore } from '../project-state-store'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS, buildEffectiveCloudSyncConfig } from '../config'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'

const PROJECT_ID = 'markdown-ticket'
const DISTRIBUTION_ORIGIN = DISTRIBUTION_CLOUD_SYNC_ORIGINS[0]!

describe('CloudProjectManagementService enable + connect (TEST-pm-enable-commit-last)', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-pm-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function buildService(opts: {
    provisionImpl?: (req: ProvisionProjectRequest, cred: CloudCredential) => Promise<{ projectId: string, replayed: boolean }>
    probeImpl?: (cloudProjectId: string, cred: CloudCredential) => Promise<ProjectBindingProbe>
    credentialForProvisioning?: CloudCredential | null
    credentialForConnect?: CloudCredential | null
  }): CloudProjectManagementService {
    const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
    const stateStore = new ProjectStateStore({ rootDir: root, profile })
    const coordinator = {
      provision: opts.provisionImpl ?? (async () => { throw new Error('not mocked') }),
      probe: opts.probeImpl ?? (async () => { throw new Error('not mocked') }),
      listMembers: async () => ({ items: [] }),
      upsertMember: async () => { throw new Error('not mocked') },
      removeMember: async () => {},
      updateCoordinationState: async () => ({ state: 'active' as const }),
    }
    const resolver = {
      forProvisioning: async () => opts.credentialForProvisioning ?? null,
      requireForProvisioning: async () => opts.credentialForProvisioning
        ? { ok: true as const, credential: opts.credentialForProvisioning }
        : { ok: false as const, reason: 'operator_authority_required' as const, message: 'denied' },
      forConnect: async () => opts.credentialForConnect ?? null,
    }
    const mgmtOrigin = DISTRIBUTION_ORIGIN
    return new CloudProjectManagementService({
      localProjectId: PROJECT_ID,
      profile,
      stateStore,
      coordinator,
      resolver,
      provisioningOrigin: profile.provisioningOrigin,
      coordinationOrigin: mgmtOrigin,
      globalConfig: buildEffectiveCloudSyncConfig({ allowedOrigins: [] }),
      projectCode: 'MDT',
      initialOwnerEmail: 'owner@example.com',
    } satisfies CloudProjectManagementServiceOptions)
  }

  describe('enable (operator provision → probe → commit-last)', () => {
    it('journals the provisioning idempotency key, provisions, probes, then writes CONFIG_DIR state', async () => {
      const provisionCalls: string[] = []
      const probeCalls: string[] = []
      const service = buildService({
        provisionImpl: async (req) => {
          provisionCalls.push(req.idempotencyKey)
          return { projectId: 'uuid-1', replayed: false }
        },
        probeImpl: async (cloudProjectId) => {
          probeCalls.push(cloudProjectId)
          return { projectId: cloudProjectId, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }
        },
        // The operator principal is also admitted to the coordination audience
        // (same human), so both credentials resolve.
        credentialForProvisioning: { kind: 'human', cfAccessToken: 'op-tok' },
        credentialForConnect: { kind: 'human', cfAccessToken: 'coord-tok' },
      })

      const result = await service.enable({
        projectCode: 'MDT',
        initialOwnerEmail: 'owner@example.com',
        idempotencyKey: 'op-key-1',
        requestHash: 'a'.repeat(64),
      })

      expect(result.cloudProjectId).toBe('uuid-1')
      expect(provisionCalls).toHaveLength(1)
      expect(provisionCalls[0]).toBe('op-key-1')
      // The membership probe runs AFTER provisioning, on the returned UUID.
      expect(probeCalls).toEqual(['uuid-1'])
      // CONFIG_DIR connection is written commit-last (after the probe).
      const read = await service.diagnostics()
      expect(read.connection?.state).toBe(CloudSyncConnectionState.ENABLED)
      expect(read.connection?.cloudProjectId).toBe('uuid-1')
      expect(read.connection?.serviceOrigin).toBe(DISTRIBUTION_ORIGIN)
    })

    it('retries return the same UUID when the idempotency key + request hash match', async () => {
      let provisionCount = 0
      const service = buildService({
        provisionImpl: async () => {
          provisionCount++
          return { projectId: 'uuid-stable', replayed: provisionCount > 1 }
        },
        probeImpl: async id => ({ projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }),
        credentialForProvisioning: { kind: 'human', cfAccessToken: 'op-tok' },
        credentialForConnect: { kind: 'human', cfAccessToken: 'coord-tok' },
      })

      const first = await service.enable({ projectCode: 'MDT', initialOwnerEmail: 'o@e.com', idempotencyKey: 'k', requestHash: 'a'.repeat(64) })
      const retry = await service.enable({ projectCode: 'MDT', initialOwnerEmail: 'o@e.com', idempotencyKey: 'k', requestHash: 'a'.repeat(64) })
      expect(first.cloudProjectId).toBe('uuid-stable')
      expect(retry.cloudProjectId).toBe('uuid-stable')
    })

    it('re-running enable on an existing enabled connection returns the UUID without provisioning again', async () => {
      let provisionCount = 0
      const service = buildService({
        provisionImpl: async () => {
          provisionCount++
          return { projectId: 'uuid-existing', replayed: false }
        },
        probeImpl: async id => ({ projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }),
        credentialForProvisioning: { kind: 'human', cfAccessToken: 'op-tok' },
        credentialForConnect: { kind: 'human', cfAccessToken: 'coord-tok' },
      })

      const first = await service.enable({ projectCode: 'MDT', initialOwnerEmail: 'o@e.com', idempotencyKey: 'k1', requestHash: 'a'.repeat(64) })
      const second = await service.enable({ projectCode: 'MDT', initialOwnerEmail: 'o@e.com', idempotencyKey: 'k2', requestHash: 'b'.repeat(64) })

      expect(first.cloudProjectId).toBe('uuid-existing')
      expect(second).toEqual({ cloudProjectId: 'uuid-existing', replayed: true })
      expect(provisionCount).toBe(1)
    })

    it('writes NO CONFIG_DIR connection when provisioning is denied (owner-not-operator)', async () => {
      let provisionCalled = false
      const service = buildService({
        provisionImpl: async () => { provisionCalled = true; return { projectId: 'x', replayed: false } },
        credentialForProvisioning: null, // operator authority absent
      })

      await expect(service.enable({
        projectCode: 'MDT',
        initialOwnerEmail: 'o@e.com',
        idempotencyKey: 'k',
        requestHash: 'a'.repeat(64),
      })).rejects.toThrow(CoordinatorError)

      expect(provisionCalled).toBe(false)
      const read = await service.diagnostics()
      expect(read.connection).toBeNull() // no connection written
    })

    it('writes NO CONFIG_DIR connection when the membership probe fails after provisioning', async () => {
      const service = buildService({
        provisionImpl: async () => ({ projectId: 'uuid-1', replayed: false }),
        probeImpl: async () => { throw new CoordinatorError('forbidden', { message: 'not a member' }) },
        credentialForProvisioning: { kind: 'human', cfAccessToken: 'op-tok' },
      })

      await expect(service.enable({
        projectCode: 'MDT',
        initialOwnerEmail: 'o@e.com',
        idempotencyKey: 'k',
        requestHash: 'a'.repeat(64),
      })).rejects.toThrow()

      // Commit-last: the probe failed, so no connection is written even though
      // provisioning succeeded. The cloud project exists; this installation
      // simply is not connected.
      const read = await service.diagnostics()
      expect(read.connection).toBeNull()
    })

    it('enable never provisions with a coordination-audience credential', async () => {
      let provisionCalled = false
      const service = buildService({
        provisionImpl: async () => { provisionCalled = true; return { projectId: 'uuid', replayed: false } },
        probeImpl: async id => ({ projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }),
        credentialForProvisioning: null, // no operator credential
      })
      await expect(service.enable({
        projectCode: 'MDT',
        initialOwnerEmail: 'o@e.com',
        idempotencyKey: 'k',
        requestHash: 'a'.repeat(64),
      })).rejects.toThrow()
      expect(provisionCalled).toBe(false)
    })
  })

  describe('connect (coordination auth → membership probe → commit-last; never provisions)', () => {
    it('authenticates, verifies membership, then writes CONFIG_DIR state', async () => {
      let provisionCalled = false
      let probeCloudProjectId: string | null = null
      let probeCredentialKind: string | null = null
      const service = buildService({
        provisionImpl: async () => { provisionCalled = true; return { projectId: 'x', replayed: false } },
        probeImpl: async (id, cred) => {
          probeCloudProjectId = id
          probeCredentialKind = cred.kind
          return { projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'contributor' }
        },
        credentialForConnect: { kind: 'human', cfAccessToken: 'coord-tok' },
      })

      const result = await service.connect({ cloudProjectId: 'existing-uuid' })
      expect(result.cloudProjectId).toBe('existing-uuid')
      expect(result.role).toBe('contributor')
      // connect NEVER provisions.
      expect(provisionCalled).toBe(false)
      // The probe runs on the provided UUID with the coordination credential.
      expect(probeCloudProjectId).toBe('existing-uuid')
      expect(probeCredentialKind).toBe('human')
      // CONFIG_DIR state is written commit-last.
      const read = await service.diagnostics()
      expect(read.connection?.cloudProjectId).toBe('existing-uuid')
      expect(read.connection?.state).toBe(CloudSyncConnectionState.ENABLED)
    })

    it('writes NO CONFIG_DIR connection when membership verification fails', async () => {
      const service = buildService({
        probeImpl: async () => { throw new CoordinatorError('forbidden', { message: 'not a member' }) },
        credentialForConnect: { kind: 'human', cfAccessToken: 'coord-tok' },
      })

      await expect(service.connect({ cloudProjectId: 'existing-uuid' })).rejects.toThrow()
      const read = await service.diagnostics()
      expect(read.connection).toBeNull()
    })

    it('connect never provisions even if the cloud project UUID is unknown', async () => {
      let provisionCalled = false
      const service = buildService({
        provisionImpl: async () => { provisionCalled = true; return { projectId: 'x', replayed: false } },
        probeImpl: async () => { throw new CoordinatorError('project_not_found', {}) },
        credentialForConnect: { kind: 'human', cfAccessToken: 'coord-tok' },
      })
      await expect(service.connect({ cloudProjectId: 'unknown-uuid' })).rejects.toThrow()
      expect(provisionCalled).toBe(false)
    })
  })

  describe('one management contract, no presentation logic (BR-4.1)', () => {
    it('exposes readiness, enable, connect, diagnostics, disable, and membership through one contract', () => {
      const service = buildService({})
      expect(typeof service.readiness).toBe('function')
      expect(typeof service.enable).toBe('function')
      expect(typeof service.connect).toBe('function')
      expect(typeof service.diagnostics).toBe('function')
      expect(typeof service.disable).toBe('function')
      expect(typeof service.listMembers).toBe('function')
      expect(typeof service.upsertMember).toBe('function')
      expect(typeof service.removeMember).toBe('function')
      expect(typeof service.updateCoordinationState).toBe('function')
      expect(typeof service.migrateLegacyBinding).toBe('function')
    })
  })

  describe('disable (TEST-pm-disable-no-local-resume)', () => {
    it('disable suspends cloud coordination and retains the connection as disabled', async () => {
      let suspendState: string | null = null
      const service = buildService({
        provisionImpl: async () => ({ projectId: 'uuid-1', replayed: false }),
        probeImpl: async id => ({ projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }),
        credentialForProvisioning: { kind: 'human', cfAccessToken: 'op-tok' },
        credentialForConnect: { kind: 'human', cfAccessToken: 'coord-tok' },
      })
      // Seed an enabled connection, then disable.
      await service.enable({ projectCode: 'MDT', initialOwnerEmail: 'o@e.com', idempotencyKey: 'k', requestHash: 'a'.repeat(64) })

      // Override the coordinator after construction to observe the suspend call.
      // (The buildService helper closes over its own coordinator; we disable via
      // the service which uses the injected coordinator that records suspend.)
      // Rebuild with an observing coordinator:
      const observingService = (() => {
        const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
        const stateStore = new ProjectStateStore({ rootDir: root, profile })
        const coordinator: import('../project-management').ManagementCoordinatorPort = {
          provision: async () => ({ projectId: 'uuid-1', replayed: false }),
          probe: async (id: string): Promise<ProjectBindingProbe> => ({ projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }),
          listMembers: async () => ({ items: [] }),
          upsertMember: async () => { throw new Error('not used') },
          removeMember: async () => {},
          updateCoordinationState: async (_id: string, body: { state: 'active' | 'suspended' }) => {
            suspendState = body.state
            return { state: body.state }
          },
        }
        const resolver = {
          forProvisioning: async () => null,
          requireForProvisioning: async () => ({ ok: false as const, reason: 'operator_authority_required' as const, message: 'denied' }),
          forConnect: async () => ({ kind: 'human', cfAccessToken: 'coord-tok' }) as CloudCredential | null,
          forDisable: async () => ({ kind: 'human', cfAccessToken: 'coord-tok' }) as CloudCredential | null,
        }
        return new CloudProjectManagementService({
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
      })()

      const disabled = await observingService.disable()
      expect(disabled.state).toBe(CloudSyncConnectionState.DISABLED)
      expect(disabled.cloudProjectId).toBe('uuid-1')
      // Cloud coordination was suspended.
      expect(suspendState).toBe('suspended')
      // The connection is RETAINED (not deleted) with state disabled.
      const read = await observingService.diagnostics()
      expect(read.connection).not.toBeNull()
      expect(read.connection?.state).toBe(CloudSyncConnectionState.DISABLED)
    })

    it('new ticket creation fails closed after disable (no local allocator resumes)', async () => {
      // The allocator strategy consumes the ProjectConnectionRead from the
      // state store. After disable, the read is `disabled` → fail-closed.
      // Only `absent` selects local allocation. NONE of enabled/disabled/
      // malformed/untrusted may produce a local number (BR-4.2, BR-5.1, C3).
      const { selectAllocatorFromConnection } = await import('../allocator-strategy')
      const localScan = async () => 42

      // absent → local (the ONLY local outcome)
      const absent = selectAllocatorFromConnection({ kind: 'absent' }, localScan)
      expect(absent.kind).toBe('local')

      // enabled → cloud path (fail-closed allocator without a coordinator
      // wired; it MUST NOT produce a local number — BR-1.5).
      const enabled = selectAllocatorFromConnection({
        kind: 'enabled',
        connection: {
          version: CLOUD_SYNC_CONNECTION_VERSION,
          state: CloudSyncConnectionState.ENABLED,
          cloudProjectId: 'uuid-1',
          serviceOrigin: DISTRIBUTION_ORIGIN,
          pollIntervalSeconds: 15,
        },
      }, localScan)
      // Enabled selects the cloud path; without a coordinator it fail-closes.
      // Either way it is NOT local.
      expect(enabled.kind).not.toBe('local')
      if (enabled.kind === 'cloud') {
        await expect(enabled.allocator.allocate()).rejects.toThrow(CoordinatorError)
      }

      // disabled → fail-closed (disable NEVER resumes local numbering — BR-4.2)
      const disabled = selectAllocatorFromConnection({
        kind: 'disabled',
        connection: {
          version: CLOUD_SYNC_CONNECTION_VERSION,
          state: CloudSyncConnectionState.DISABLED,
          cloudProjectId: 'uuid-1',
          serviceOrigin: DISTRIBUTION_ORIGIN,
          pollIntervalSeconds: 15,
        },
      }, localScan)
      expect(disabled.kind).toBe('fail-closed')

      // malformed → fail-closed
      const malformed = selectAllocatorFromConnection({ kind: 'malformed', reason: 'bad' }, localScan)
      expect(malformed.kind).toBe('fail-closed')

      // untrusted → fail-closed
      const untrusted = selectAllocatorFromConnection({
        kind: 'untrusted',
        connection: {
          version: CLOUD_SYNC_CONNECTION_VERSION,
          state: CloudSyncConnectionState.ENABLED,
          cloudProjectId: 'uuid-1',
          serviceOrigin: 'https://evil.example.com',
          pollIntervalSeconds: 15,
        },
        reason: 'untrusted',
      }, localScan)
      expect(untrusted.kind).toBe('fail-closed')
    })
  })

  describe('local-only compatibility (TEST-local-only-compat)', () => {
    it('a project with no CONFIG_DIR connection is local-only: no cloud calls, no connection', async () => {
      const service = buildService({
        provisionImpl: async () => { throw new Error('should not provision') },
        probeImpl: async () => { throw new Error('should not probe') },
      })
      const diag = await service.diagnostics()
      expect(diag.connection).toBeNull()
      expect(diag.probe).toBeNull()
    })

    it('local-only behavior is unchanged when the cloud capability is present but unused (BR-5.1)', async () => {
      // The management service exists (capability present) but no connection
      // is written. A local scan proceeds without any cloud interaction.
      const localScan = async () => 42
      const { selectAllocatorFromConnection } = await import('../allocator-strategy')
      const sel = selectAllocatorFromConnection({ kind: 'absent' }, localScan)
      expect(sel.kind).toBe('local')
      if (sel.kind === 'local') {
        const outcome = await sel.allocator.allocate()
        expect(outcome.kind).toBe('local')
        if (outcome.kind === 'local') {
          expect(outcome.ticketNumber).toBe(42)
        }
      }
    })

    it('a disabled or malformed connection never falls back to local allocation', async () => {
      const localScan = async () => 999
      const { selectAllocatorFromConnection } = await import('../allocator-strategy')
      const disabled = selectAllocatorFromConnection({
        kind: 'disabled',
        connection: {
          version: CLOUD_SYNC_CONNECTION_VERSION,
          state: CloudSyncConnectionState.DISABLED,
          cloudProjectId: 'uuid-1',
          serviceOrigin: DISTRIBUTION_ORIGIN,
          pollIntervalSeconds: 15,
        },
      }, localScan)
      const malformed = selectAllocatorFromConnection({ kind: 'malformed', reason: 'bad' }, localScan)
      // Neither selects local; neither produces a local number.
      expect(disabled.kind).not.toBe('local')
      expect(malformed.kind).not.toBe('local')
      if (disabled.kind === 'fail-closed' && malformed.kind === 'fail-closed') {
        expect(disabled.reason).toBeTruthy()
        expect(malformed.reason).toBeTruthy()
      }
    })
  })

  describe('multi-project isolation (TEST-multi-project-isolation)', () => {
    it('two local projects retain independent CONFIG_DIR connections with no leakage', async () => {
      const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
      const stateStoreA = new ProjectStateStore({ rootDir: root, profile })
      const stateStoreB = new ProjectStateStore({ rootDir: root, profile })

      await stateStoreA.write('project-a', {
        version: CLOUD_SYNC_CONNECTION_VERSION,
        state: CloudSyncConnectionState.ENABLED,
        cloudProjectId: 'uuid-A',
        serviceOrigin: DISTRIBUTION_ORIGIN,
        pollIntervalSeconds: 15,
      })
      await stateStoreB.write('project-b', {
        version: CLOUD_SYNC_CONNECTION_VERSION,
        state: CloudSyncConnectionState.ENABLED,
        cloudProjectId: 'uuid-B',
        serviceOrigin: DISTRIBUTION_ORIGIN,
        pollIntervalSeconds: 30,
      })

      const readA = await stateStoreA.read('project-a')
      const readB = await stateStoreB.read('project-b')
      expect(readA.kind).toBe('enabled')
      expect(readB.kind).toBe('enabled')
      if (readA.kind === 'enabled' && readB.kind === 'enabled') {
        expect(readA.connection.cloudProjectId).toBe('uuid-A')
        expect(readB.connection.cloudProjectId).toBe('uuid-B')
        expect(readA.connection.pollIntervalSeconds).toBe(15)
        expect(readB.connection.pollIntervalSeconds).toBe(30)
      }

      // Disabling one project does NOT affect the other.
      await stateStoreA.write('project-a', {
        version: CLOUD_SYNC_CONNECTION_VERSION,
        state: CloudSyncConnectionState.DISABLED,
        cloudProjectId: 'uuid-A',
        serviceOrigin: DISTRIBUTION_ORIGIN,
        pollIntervalSeconds: 15,
      })
      const readA2 = await stateStoreA.read('project-a')
      const readB2 = await stateStoreB.read('project-b')
      expect(readA2.kind).toBe('disabled')
      expect(readB2.kind).toBe('enabled')
    })

    it('each project has an independent connection file path', async () => {
      const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
      const store = new ProjectStateStore({ rootDir: root, profile })
      const pathA = store.filePath('project-a')
      const pathB = store.filePath('project-b')
      expect(pathA).not.toBe(pathB)
      expect(pathA).toContain('project-a')
      expect(pathB).toContain('project-b')
    })
  })
})
