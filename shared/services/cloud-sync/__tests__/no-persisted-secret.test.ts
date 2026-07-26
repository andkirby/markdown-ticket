/**
 * TEST-binding-no-persisted-secret — covers BR-1.5, C3, C6.
 *
 * Source: docs/CRs/MDT-201/requirements.md § Authority and Storage,
 *         docs/architecture/cloud-sync/README.md § Local Cloud Connection.
 *
 * Verifies that active cloud connection state and credentials are confined to
 * CONFIG_DIR and never appear in:
 *   - Repository `.mdt-config.toml` (no cloud connection fields written by the
 *     state store or management service).
 *   - The registry entry `CONFIG_DIR/projects/{localProjectId}.toml`.
 *   - Browser-facing diagnostics DTOs (only non-secret fields).
 *   - Logs and error messages.
 *
 * The CONFIG_DIR connection record itself is non-secret (it holds no
 * credential), but it is the ONLY place active cloud state lives.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

import { CLOUD_SYNC_CONNECTION_VERSION, CloudSyncConnectionState } from '@mdt/domain-contracts'
import {
  ProjectStateStore,
  type ProjectStateStoreOptions,
} from '../project-state-store'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS, findForbiddenSecretKeys } from '../config'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'

const PROJECT_ID = 'markdown-ticket'
const DISTRIBUTION_ORIGIN = DISTRIBUTION_CLOUD_SYNC_ORIGINS[0]!

describe('no persisted cloud secret (TEST-binding-no-persisted-secret)', () => {
  let root: string
  let store: ProjectStateStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-no-secret-'))
    store = new ProjectStateStore({
      rootDir: root,
      profile: resolveTrustedServiceProfile({ operatorOrigins: [] }),
    } satisfies ProjectStateStoreOptions)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('the connection file written by the store contains no credential or join secret', async () => {
    await store.write(PROJECT_ID, {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: 'uuid-1',
      serviceOrigin: DISTRIBUTION_ORIGIN,
      pollIntervalSeconds: 15,
    })

    const file = join(root, 'projects', PROJECT_ID, 'cloud-sync.toml')
    const content = await readFile(file, 'utf8')
    // The exact non-secret connection fields only.
    expect(content).toContain('version = 1')
    expect(content).toContain('cloudProjectId = "uuid-1"')
    // Forbidden secret-like keys are absent.
    const parsed = parseTomlSafe(content)
    expect(findForbiddenSecretKeys(parsed)).toEqual([])
    expect(content).not.toMatch(/secret|token|password|jwt|api[-_]?key/i)
  })

  it('repository .mdt-config.toml is never written by the state store', async () => {
    // Seed a repository config file with NO cloud state.
    const repoConfig = join(root, 'repo', '.mdt-config.toml')
    await mkdir(join(root, 'repo'), { recursive: true })
    await writeFile(repoConfig, '[project]\nname = "Test"\ncode = "MDT"\n')

    await store.write(PROJECT_ID, {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: 'uuid-1',
      serviceOrigin: DISTRIBUTION_ORIGIN,
      pollIntervalSeconds: 15,
    })

    // The repository file is unchanged — no cloud state injected.
    const after = await readFile(repoConfig, 'utf8')
    expect(after).toBe('[project]\nname = "Test"\ncode = "MDT"\n')
    expect(after).not.toContain('cloudProjectId')
    expect(after).not.toContain('cloudSync')
  })

  it('the registry entry CONFIG_DIR/projects/{localProjectId}.toml is never written', async () => {
    await store.write(PROJECT_ID, {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: 'uuid-1',
      serviceOrigin: DISTRIBUTION_ORIGIN,
      pollIntervalSeconds: 15,
    })

    const { stat } = await import('node:fs/promises')
    await expect(stat(join(root, 'projects', `${PROJECT_ID}.toml`))).rejects.toThrow()
  })

  it('a read returns no credential through the diagnostics path', async () => {
    await store.write(PROJECT_ID, {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: 'uuid-1',
      serviceOrigin: DISTRIBUTION_ORIGIN,
      pollIntervalSeconds: 15,
    })
    const read = await store.read(PROJECT_ID)
    // The read result is a ProjectConnectionRead; it has no secret-shaped
    // field regardless of kind.
    expect(JSON.stringify(read)).not.toMatch(/secret|token|password|clientSecret/i)
  })

  it('malformed-state error never logs the file content or path', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    // Hand-write a connection file that has all required fields PLUS an extra
    // forbidden clientSecret key (simulating a leaked/injected file). The store
    // must drop the extra field on read and never log it.
    await mkdir(join(root, 'projects', PROJECT_ID), { recursive: true })
    await writeFile(
      join(root, 'projects', PROJECT_ID, 'cloud-sync.toml'),
      'version = 1\nstate = "enabled"\ncloudProjectId = "leak-attempt"\nserviceOrigin = "https://mdt-sync.constantapp.org"\npollIntervalSeconds = 15\nclientSecret = "topsecret"\n',
    )
    const read = await store.read(PROJECT_ID)
    // The connection reads as enabled (it has all required fields); but the
    // EXTRA clientSecret field must not round-trip into the returned record.
    if (read.kind === 'enabled') {
      expect((read.connection as unknown as Record<string, unknown>).clientSecret).toBeUndefined()
    }
    expect(JSON.stringify(read)).not.toContain('topsecret')
    expect(errSpy).not.toHaveBeenCalledWith(expect.stringContaining('topsecret'))
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('topsecret'))
    errSpy.mockRestore()
    logSpy.mockRestore()
  })
})

function parseTomlSafe(content: string): Record<string, unknown> {
  // Minimal TOML parse for forbidden-key scanning; the store itself uses
  // smol-toml. We only need key presence here.
  const out: Record<string, unknown> = {}
  for (const line of content.split('\n')) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=/.exec(line)
    if (m) {
      out[m[1]!] = true
    }
  }
  return out
}
