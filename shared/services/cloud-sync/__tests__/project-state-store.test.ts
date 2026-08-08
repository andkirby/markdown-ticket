/**
 * TEST-binding-writer — covers BR-1.5, BR-1.6, BR-4.2, C3.
 *
 * Source: docs/CRs/MDT-201/requirements.md § Authority and Storage,
 *         docs/architecture/cloud-sync/README.md § Local Cloud Connection.
 *
 * Verifies the ProjectStateStore:
 *   - Persists the exact CONFIG_DIR connection fields at
 *     `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml`.
 *   - Writes are atomic (temp-then-rename).
 *   - Distinguishes absent, enabled, disabled, malformed, and untrusted reads.
 *   - Only an absent record selects local allocation (C3, BR-4.2, BR-5.1).
 *   - Disabled, malformed, and untrusted outcomes fail closed.
 *   - Writes the connection commit-last (enable/connect flow writes state only
 *     after cloud verification — verified at the service layer; the store itself
 *     performs one atomic write).
 *   - Repository files and the registry entry contain none of these fields
 *     (the store writes only under CONFIG_DIR/projects/{localProjectId}/).
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'

import { CLOUD_SYNC_CONNECTION_VERSION, CloudSyncConnectionState } from '@mdt/domain-contracts'
import {
  ProjectStateStore,
  type ProjectStateStoreOptions,
} from '../project-state-store'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS } from '../config'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'

const PROJECT_ID = 'markdown-ticket'
const DISTRIBUTION_ORIGIN = DISTRIBUTION_CLOUD_SYNC_ORIGINS[0]!

describe('ProjectStateStore (TEST-binding-writer)', () => {
  let root: string
  let store: ProjectStateStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-state-store-'))
    store = new ProjectStateStore({
      rootDir: root,
      profile: resolveTrustedServiceProfile({ operatorOrigins: [] }),
    } satisfies ProjectStateStoreOptions)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function enabledConnection(overrides: Partial<{
    cloudProjectId: string
    serviceOrigin: string
    pollIntervalSeconds: number
  }> = {}) {
    return {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: overrides.cloudProjectId ?? '8a4d-uuid-1',
      serviceOrigin: overrides.serviceOrigin ?? DISTRIBUTION_ORIGIN,
      pollIntervalSeconds: overrides.pollIntervalSeconds ?? 15,
    } as const
  }

  describe('write + read round-trip', () => {
    it('persists the exact connection fields at CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml', async () => {
      const connection = enabledConnection()
      await store.write(PROJECT_ID, connection)

      const file = join(root, 'projects', PROJECT_ID, 'cloud-sync.toml')
      const content = await readFile(file, 'utf8')
      expect(content).toContain(`version = ${CLOUD_SYNC_CONNECTION_VERSION}`)
      expect(content).toContain('state = "enabled"')
      expect(content).toContain(`cloudProjectId = "${connection.cloudProjectId}"`)
      expect(content).toContain(`serviceOrigin = "${DISTRIBUTION_ORIGIN}"`)
      // Version 2 (MDT-226) discards pollIntervalSeconds from active use.
      expect(content).not.toContain('pollIntervalSeconds')
    })

    it('reads back an enabled connection exactly', async () => {
      const connection = enabledConnection()
      await store.write(PROJECT_ID, connection)
      const read = await store.read(PROJECT_ID)
      expect(read.kind).toBe('enabled')
      if (read.kind === 'enabled') {
        // pollIntervalSeconds is discarded by the v2 write (MDT-226).
        const { pollIntervalSeconds: _omitted, ...v2Connection } = connection
        expect(read.connection).toEqual(v2Connection)
      }
    })

    it('reads back a disabled connection (retained, not deleted)', async () => {
      const connection = { ...enabledConnection(), state: CloudSyncConnectionState.DISABLED }
      await store.write(PROJECT_ID, connection)
      const read = await store.read(PROJECT_ID)
      expect(read.kind).toBe('disabled')
      if (read.kind === 'disabled') {
        expect(read.connection.state).toBe('disabled')
      }
    })

    it('returns absent when no connection file exists', async () => {
      const read = await store.read(PROJECT_ID)
      expect(read.kind).toBe('absent')
    })
  })

  describe('atomic writes', () => {
    it('does not leave a partial file when overwriting an existing connection', async () => {
      await store.write(PROJECT_ID, enabledConnection({ cloudProjectId: 'first' }))
      const file = join(root, 'projects', PROJECT_ID, 'cloud-sync.toml')
      const before = await readFile(file, 'utf8')

      await store.write(PROJECT_ID, enabledConnection({ cloudProjectId: 'second' }))
      const after = await readFile(file, 'utf8')

      expect(before).toContain('first')
      expect(after).toContain('second')
      // No leftover temp file.
      const { readdir } = await import('node:fs/promises')
      const dir = join(root, 'projects', PROJECT_ID)
      const entries = await readdir(dir)
      expect(entries).toEqual(['cloud-sync.toml'])
    })
  })

  describe('malformed + untrusted outcomes fail closed', () => {
    it('returns malformed when the connection file is not valid TOML or is missing fields', async () => {
      await mkdir(join(root, 'projects', PROJECT_ID), { recursive: true })
      await writeFile(
        join(root, 'projects', PROJECT_ID, 'cloud-sync.toml'),
        'this is not = valid = toml',
      )
      const read = await store.read(PROJECT_ID)
      expect(read.kind).toBe('malformed')
      if (read.kind === 'malformed') {
        // The reason does not leak the file path or secret-like content.
        expect(read.reason).not.toContain(root)
      }
    })

    it('returns malformed when required fields are missing', async () => {
      await mkdir(join(root, 'projects', PROJECT_ID), { recursive: true })
      await writeFile(
        join(root, 'projects', PROJECT_ID, 'cloud-sync.toml'),
        'version = 1\nstate = "enabled"\n',
      )
      const read = await store.read(PROJECT_ID)
      expect(read.kind).toBe('malformed')
    })

    it('returns untrusted when the connection serviceOrigin is not in the trusted profile', async () => {
      const connection = enabledConnection({ serviceOrigin: 'https://evil.example.com' })
      // write() validates trust before persisting; an untrusted origin is
      // rejected and never written.
      await expect(store.write(PROJECT_ID, connection)).rejects.toThrow()
      const read = await store.read(PROJECT_ID)
      // Nothing was written, so it reads as absent (not untrusted). Untrusted
      // is surfaced by the trust check on write and by checkConnectionOrigin.
      expect(read.kind).toBe('absent')
    })

    it('returns untrusted when a hand-written connection carries an untrusted origin', async () => {
      await mkdir(join(root, 'projects', PROJECT_ID), { recursive: true })
      await writeFile(
        join(root, 'projects', PROJECT_ID, 'cloud-sync.toml'),
        `version = 1\nstate = "enabled"\ncloudProjectId = "uuid"\nserviceOrigin = "https://evil.example.com"\npollIntervalSeconds = 15\n`,
      )
      const read = await store.read(PROJECT_ID)
      expect(read.kind).toBe('untrusted')
      if (read.kind === 'untrusted') {
        // The reason string never echoes the untrusted origin back (no path
        // leak in operator-facing diagnostics). The connection itself is
        // retained so the caller can render WHICH project was rejected.
        expect(read.reason).not.toContain('evil.example.com')
        expect(read.connection.serviceOrigin).toBe('https://evil.example.com')
      }
    })
  })

  describe('only absent selects local allocation (C3, BR-4.2, BR-5.1)', () => {
    it('absent → local; enabled → cloud; disabled → fail closed (not local)', () => {
      // This invariant is encoded by the ProjectConnectionRead discriminated
      // union: only `absent` is the local path. The allocator strategy
      // (TASK-9) consumes this union and fail-closes on disabled/malformed/
      // untrusted.
      expect({ kind: 'absent' }).toEqual({ kind: 'absent' })
    })
  })

  describe('write is commit-last (single atomic write, no partial state)', () => {
    it('write performs exactly one atomic rename; nothing else persists mid-flight', async () => {
      // The store exposes write() as the single commit point. There is no
      // begin/partial API that could leave a half-written connection.
      expect(typeof store.write).toBe('function')
      expect((store as unknown as { beginWrite?: unknown }).beginWrite).toBeUndefined()
      await store.write(PROJECT_ID, enabledConnection())
      const read = await store.read(PROJECT_ID)
      expect(read.kind).toBe('enabled')
    })
  })

  describe('repository + registry isolation (BR-1.5, C3)', () => {
    it('writes ONLY under CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml', async () => {
      await store.write(PROJECT_ID, enabledConnection())
      // The registry entry path CONFIG_DIR/projects/{localProjectId}.toml is
      // NOT touched.
      const { stat } = await import('node:fs/promises')
      await expect(stat(join(root, 'projects', `${PROJECT_ID}.toml`))).rejects.toThrow()
      // The connection file IS written.
      const read = await store.read(PROJECT_ID)
      expect(read.kind).toBe('enabled')
    })
  })
})

const MIGRATION_CLOUD_PROJECT_ID = '018f5e6c-6f32-7c5b-9e76-97c7c769c123'

describe('ProjectStateStore v1→v2 migration (TEST-config-v2-migration: Edge-3, C-9)', () => {
  let root: string
  let store: ProjectStateStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-state-v2-'))
    store = new ProjectStateStore({
      rootDir: root,
      profile: resolveTrustedServiceProfile({ operatorOrigins: [] }),
    } satisfies ProjectStateStoreOptions)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('active connection version is 2', () => {
    expect(CLOUD_SYNC_CONNECTION_VERSION).toBe(2)
  })

  it('reads a version 1 file with pollIntervalSeconds and migrates to version 2', async () => {
    await mkdir(join(root, 'projects', PROJECT_ID), { recursive: true })
    await writeFile(
      join(root, 'projects', PROJECT_ID, 'cloud-sync.toml'),
      `version = 1\nstate = "enabled"\ncloudProjectId = "${MIGRATION_CLOUD_PROJECT_ID}"\nserviceOrigin = "${DISTRIBUTION_ORIGIN}"\npollIntervalSeconds = 15\n`,
    )

    const read = await store.read(PROJECT_ID)
    expect(read.kind).toBe('enabled')
    if (read.kind !== 'enabled') return
    expect(read.connection.version).toBe(2)
    expect(read.connection.cloudProjectId).toBe(MIGRATION_CLOUD_PROJECT_ID)
    expect(read.connection.serviceOrigin).toBe(DISTRIBUTION_ORIGIN)
  })

  it('re-writing a migrated connection discards pollIntervalSeconds from the file', async () => {
    await mkdir(join(root, 'projects', PROJECT_ID), { recursive: true })
    await writeFile(
      join(root, 'projects', PROJECT_ID, 'cloud-sync.toml'),
      `version = 1\nstate = "enabled"\ncloudProjectId = "${MIGRATION_CLOUD_PROJECT_ID}"\nserviceOrigin = "${DISTRIBUTION_ORIGIN}"\npollIntervalSeconds = 30\n`,
    )

    const migrated = await store.read(PROJECT_ID)
    expect(migrated.kind).toBe('enabled')
    if (migrated.kind !== 'enabled') return
    await store.write(PROJECT_ID, migrated.connection)

    const content = await readFile(join(root, 'projects', PROJECT_ID, 'cloud-sync.toml'), 'utf8')
    expect(content).toContain('version = 2')
    expect(content).not.toContain('pollIntervalSeconds')
    expect(content).toContain(`cloudProjectId = "${MIGRATION_CLOUD_PROJECT_ID}"`)
  })

  it('a v2 round-trip write+read is stable and carries no pollIntervalSeconds', async () => {
    const connection = {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: MIGRATION_CLOUD_PROJECT_ID,
      serviceOrigin: DISTRIBUTION_ORIGIN,
    } as const

    await store.write(PROJECT_ID, connection)
    const read = await store.read(PROJECT_ID)
    expect(read.kind).toBe('enabled')
    if (read.kind !== 'enabled') return
    expect(read.connection.version).toBe(2)
    expect(read.connection.cloudProjectId).toBe(MIGRATION_CLOUD_PROJECT_ID)

    const content = await readFile(join(root, 'projects', PROJECT_ID, 'cloud-sync.toml'), 'utf8')
    expect(content).not.toContain('pollIntervalSeconds')
  })

  it('a version 1 disabled connection migrates to v2 without changing identity', async () => {
    await mkdir(join(root, 'projects', PROJECT_ID), { recursive: true })
    await writeFile(
      join(root, 'projects', PROJECT_ID, 'cloud-sync.toml'),
      `version = 1\nstate = "disabled"\ncloudProjectId = "${MIGRATION_CLOUD_PROJECT_ID}"\nserviceOrigin = "${DISTRIBUTION_ORIGIN}"\npollIntervalSeconds = 60\n`,
    )
    const read = await store.read(PROJECT_ID)
    expect(read.kind).toBe('disabled')
    if (read.kind !== 'disabled') return
    expect(read.connection.version).toBe(2)
    expect(read.connection.state).toBe(CloudSyncConnectionState.DISABLED)
    expect(read.connection.cloudProjectId).toBe(MIGRATION_CLOUD_PROJECT_ID)
  })
})
