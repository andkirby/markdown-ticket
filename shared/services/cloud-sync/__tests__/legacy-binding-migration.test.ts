/**
 * TEST-legacy-binding-migration — covers BR-1.8, Edge-9.
 *
 * Source: docs/CRs/MDT-201/architecture.md § Legacy migration,
 *         docs/CRs/MDT-201/requirements.md § Lifecycle Decisions.
 *
 * Verifies explicit legacy `[project.cloudSync]` migration:
 *   - A MISSING CONFIG_DIR connection is imported after verification.
 *   - An IDENTICAL existing connection is a no-op.
 *   - A CONFLICTING existing connection fails closed (BR-1.8, Edge-9).
 *   - Repository files are NEVER silently edited; migration writes only
 *     CONFIG_DIR.
 *   - The legacy binding is read ONLY as migration input — normal lifecycle
 *     operations never write repository cloud fields.
 */

import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'

import {
  CLOUD_SYNC_CONNECTION_VERSION,
  CloudSyncConnectionState,
  CoordinatorError,
  type CloudCredential,
  type ProjectBindingProbe,
  type ProjectCloudSyncBinding,
} from '@mdt/domain-contracts'
import {
  LegacyBindingMigration,
  type LegacyBindingMigrationOptions,
  type LegacyMigrationSource,
} from '../legacy-binding-migration'
import { ProjectStateStore } from '../project-state-store'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS } from '../config'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'

const PROJECT_ID = 'markdown-ticket'
const DISTRIBUTION_ORIGIN = DISTRIBUTION_CLOUD_SYNC_ORIGINS[0]!

describe('LegacyBindingMigration (TEST-legacy-binding-migration)', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-legacy-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function buildMigration(opts: {
    legacyBinding?: ProjectCloudSyncBinding | null
    probeImpl?: (cloudProjectId: string, cred: CloudCredential) => Promise<ProjectBindingProbe>
    credentialForConnect?: CloudCredential | null
  }): LegacyBindingMigration {
    const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
    const stateStore = new ProjectStateStore({ rootDir: root, profile })
    const source: LegacyMigrationSource = {
      readLegacyBinding: async () => opts.legacyBinding ?? null,
    }
    const probePort = opts.probeImpl
      ? async (id: string, cred: CloudCredential) => opts.probeImpl!(id, cred)
      : async (id: string): Promise<ProjectBindingProbe> => ({ projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' })
    const credentialResolver = async () => opts.credentialForConnect ?? null
    return new LegacyBindingMigration({
      localProjectId: PROJECT_ID,
      profile,
      stateStore,
      source,
      probe: probePort,
      resolveCredential: credentialResolver,
    } satisfies LegacyBindingMigrationOptions)
  }

  function legacyBinding(overrides: Partial<ProjectCloudSyncBinding> = {}): ProjectCloudSyncBinding {
    return {
      enabled: true,
      projectId: '8a4d-uuid-1',
      serviceUrl: DISTRIBUTION_ORIGIN,
      pollIntervalSeconds: 15,
      ...overrides,
    }
  }

  it('imports a legacy binding into CONFIG_DIR when no connection exists (after membership verification)', async () => {
    const m = buildMigration({
      legacyBinding: legacyBinding(),
      probeImpl: async id => ({ projectId: id, projectCode: 'MDT', coordinationState: 'active', role: 'owner' }),
      credentialForConnect: { kind: 'human', cfAccessToken: 'tok' },
    })
    const result = await m.migrate()
    expect(result.migrated).toBe(true)
    expect(result.connection?.cloudProjectId).toBe('8a4d-uuid-1')
    expect(result.connection?.state).toBe(CloudSyncConnectionState.ENABLED)
  })

  it('treats an identical existing connection as a no-op (no rewrite)', async () => {
    // Seed the identical connection first.
    const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
    const stateStore = new ProjectStateStore({ rootDir: root, profile })
    await stateStore.write(PROJECT_ID, {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: '8a4d-uuid-1',
      serviceOrigin: DISTRIBUTION_ORIGIN,
      pollIntervalSeconds: 15,
    })

    const m = buildMigration({ legacyBinding: legacyBinding() })
    const result = await m.migrate()
    expect(result.migrated).toBe(false) // no-op
    expect(result.connection?.cloudProjectId).toBe('8a4d-uuid-1')
  })

  it('rejects a conflicting existing connection without modifying either source', async () => {
    // Existing connection points to a DIFFERENT cloud project.
    const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
    const stateStore = new ProjectStateStore({ rootDir: root, profile })
    await stateStore.write(PROJECT_ID, {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: 'different-uuid',
      serviceOrigin: DISTRIBUTION_ORIGIN,
      pollIntervalSeconds: 15,
    })

    const m = buildMigration({ legacyBinding: legacyBinding({ projectId: '8a4d-uuid-1' }) })
    await expect(m.migrate()).rejects.toThrow(CoordinatorError)

    // The existing CONFIG_DIR connection is unchanged (not overwritten).
    const read = await stateStore.read(PROJECT_ID)
    expect(read.kind).toBe('enabled')
    if (read.kind === 'enabled') {
      expect(read.connection.cloudProjectId).toBe('different-uuid')
    }
  })

  it('never silently edits repository files; migration writes only CONFIG_DIR', async () => {
    // Seed a repository .mdt-config.toml with the legacy binding.
    const repoConfig = join(root, 'repo', '.mdt-config.toml')
    await mkdir(join(root, 'repo'), { recursive: true })
    const repoContent = `[project]
name = "Test"
code = "MDT"
[project.cloudSync]
enabled = true
projectId = "8a4d-uuid-1"
serviceUrl = "${DISTRIBUTION_ORIGIN}"
pollIntervalSeconds = 15
`
    await writeFile(repoConfig, repoContent)

    const m = buildMigration({
      legacyBinding: legacyBinding(),
      credentialForConnect: { kind: 'human', cfAccessToken: 'tok' },
    })
    await m.migrate()

    // The repository file is UNCHANGED.
    const after = await readFile(repoConfig, 'utf8')
    expect(after).toBe(repoContent)
  })

  it('fails closed when the legacy binding service origin is not trusted', async () => {
    const m = buildMigration({
      legacyBinding: legacyBinding({ serviceUrl: 'https://evil.example.com' }),
      credentialForConnect: { kind: 'human', cfAccessToken: 'tok' },
    })
    await expect(m.migrate()).rejects.toThrow()
  })

  it('fails closed when membership verification fails during migration', async () => {
    const m = buildMigration({
      legacyBinding: legacyBinding(),
      probeImpl: async () => { throw new CoordinatorError('forbidden', { message: 'not a member' }) },
      credentialForConnect: { kind: 'human', cfAccessToken: 'tok' },
    })
    await expect(m.migrate()).rejects.toThrow()
    // No connection written.
    const profile = resolveTrustedServiceProfile({ operatorOrigins: [] })
    const stateStore = new ProjectStateStore({ rootDir: root, profile })
    const read = await stateStore.read(PROJECT_ID)
    expect(read.kind).toBe('absent')
  })

  it('is a no-op when there is no legacy binding (nothing to migrate)', async () => {
    const m = buildMigration({ legacyBinding: null })
    const result = await m.migrate()
    expect(result.migrated).toBe(false)
    expect(result.connection).toBeNull()
  })

  it('ignores a legacy binding whose enabled=false (local-only; no migration)', async () => {
    const m = buildMigration({ legacyBinding: legacyBinding({ enabled: false }) })
    const result = await m.migrate()
    expect(result.migrated).toBe(false)
    expect(result.connection).toBeNull()
  })
})
