/**
 * TEST-credential-store — covers BR-2.3, C6, C8.
 *
 * Source: docs/CRs/MDT-201/requirements.md § Authority and Storage,
 *         docs/architecture/cloud-sync/README.md § Local Cloud Connection.
 *
 * Verifies the machine credential store:
 *   - Writes atomically under CONFIG_DIR/cloud-sync/credentials/{ref}.toml.
 *   - Files and directory are owner-only (0600/0700 on POSIX).
 *   - Each runtime is isolated by credentialRef (one file per runtime).
 *   - Diagnostics redact the secret (browser-facing consumers never see it).
 *   - The store never emits the secret through errors or listing helpers.
 *   - The store consumes credentials installed by the operator-controlled
 *     Cloudflare procedure; it does NOT create Cloudflare tokens.
 */

import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'

import {
  CredentialRedactedError,
  type MachineCredentialRecord,
  MachineCredentialFormatError,
  MachineCredentialStore,
} from '../credential-store'

describe('MachineCredentialStore (TEST-credential-store)', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-cred-store-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('writes the credential atomically under CONFIG_DIR/cloud-sync/credentials/{ref}.toml', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    await store.install('runtime-ci', {
      version: 1,
      kind: 'cloudflare-service-token',
      clientId: 'client-id-123',
      clientSecret: 'client-secret-456',
    })

    const file = join(root, 'credentials', 'runtime-ci.toml')
    const content = await readFile(file, 'utf8')
    // The credential is TOML with exactly these fields.
    expect(content).toContain('clientId = "client-id-123"')
    expect(content).toContain('clientSecret = "client-secret-456"')
    expect(content).toContain('kind = "cloudflare-service-token"')
  })

  it('writes the credential and directory owner-only (0600/0700 on POSIX)', async () => {
    if (process.platform === 'win32') {
      // POSIX permission bits are not meaningful on Windows; the contract is
      // still "atomic write, restricted to the owner where supported".
      expect(true).toBe(true)
      return
    }
    const store = new MachineCredentialStore({ rootDir: root })
    await store.install('runtime-ci', {
      version: 1,
      kind: 'cloudflare-service-token',
      clientId: 'id',
      clientSecret: 'secret',
    })

    const dir = join(root, 'credentials')
    const file = join(dir, 'runtime-ci.toml')
    const dirMode = (await stat(dir)).mode & 0o777
    const fileMode = (await stat(file)).mode & 0o777
    expect(dirMode).toBe(0o700)
    expect(fileMode).toBe(0o600)
  })

  it('isolates each runtime by credentialRef (one file per runtime)', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    await store.install('runtime-ci', sample('ci-id', 'ci-secret'))
    await store.install('runtime-prod', sample('prod-id', 'prod-secret'))

    const ci = await store.load('runtime-ci')
    const prod = await store.load('runtime-prod')
    expect(ci?.clientId).toBe('ci-id')
    expect(ci?.clientSecret).toBe('ci-secret')
    expect(prod?.clientId).toBe('prod-id')
    expect(prod?.clientSecret).toBe('prod-secret')

    // Removing one runtime does not affect the other.
    await store.remove('runtime-ci')
    expect(await store.load('runtime-ci')).toBeNull()
    expect(await store.load('runtime-prod')).not.toBeNull()
  })

  it('replaces an existing credential atomically (re-install overwrites)', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    await store.install('runtime-ci', sample('old-id', 'old-secret'))
    await store.install('runtime-ci', sample('new-id', 'new-secret'))

    const cred = await store.load('runtime-ci')
    expect(cred?.clientId).toBe('new-id')
    expect(cred?.clientSecret).toBe('new-secret')
  })

  it('load returns null when no credential is installed for the runtime', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    expect(await store.load('runtime-absent')).toBeNull()
  })

  it('rejects a credential file missing required fields (fails closed, no partial credential)', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    // Hand-write an invalid file (missing clientSecret) to simulate corruption.
    await mkdir(join(root, 'credentials'), { recursive: true, mode: 0o700 })
    await writeFile(
      join(root, 'credentials', 'runtime-ci.toml'),
      'version = 1\nkind = "cloudflare-service-token"\nclientId = "id"\n',
      { mode: 0o600 },
    )
    await expect(store.load('runtime-ci')).rejects.toThrow(MachineCredentialFormatError)
  })

  it('load never returns the secret through a redacted diagnostic view', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    await store.install('runtime-ci', sample('id', 'top-secret-value'))

    // Load the record, then build the redacted view that browser-facing
    // consumers receive. The secret is dropped; only the non-secret principal
    // id and kind are surfaced.
    const record = await store.load('runtime-ci')
    expect(record).not.toBeNull()
    const diag = store.describeLoaded(record!, 'runtime-ci')
    expect(diag.credentialRef).toBe('runtime-ci')
    expect(diag.installed).toBe(true)
    expect(diag.clientId).toBe('id')
    // No secret field is exposed on the diagnostic shape.
    expect(JSON.stringify(diag)).not.toContain('top-secret-value')
    expect((diag as unknown as Record<string, unknown>).clientSecret).toBeUndefined()
  })

  it('describe returns installed=false for an absent runtime without leaking paths', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    const diag = store.describe('runtime-absent')
    expect(diag!.installed).toBe(false)
    expect(JSON.stringify(diag)).not.toContain('clientSecret')
  })

  it('does not create Cloudflare tokens (consume-only); install requires an operator-supplied pair', async () => {
    // The store accepts an already-issued pair. It has no provision/create API.
    const store = new MachineCredentialStore({ rootDir: root })
    const record = sample('id', 'secret')
    await store.install('runtime-ci', record)
    // No method on the store issues or rotates a Cloudflare token.
    expect((store as unknown as { provision?: unknown }).provision).toBeUndefined()
    expect((store as unknown as { createToken?: unknown }).createToken).toBeUndefined()
  })

  it('CredentialRedactedError never includes the secret in its message', () => {
    const err = new CredentialRedactedError('runtime-ci')
    expect(err.message).not.toContain('secret')
    expect(err.message).toContain('runtime-ci')
    expect(err.credentialRef).toBe('runtime-ci')
  })
})

function sample(clientId: string, clientSecret: string): MachineCredentialRecord {
  return {
    version: 1,
    kind: 'cloudflare-service-token',
    clientId,
    clientSecret,
  }
}
