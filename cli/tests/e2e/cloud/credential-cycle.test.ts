import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MachineCredentialStore } from '@mdt/shared/services/cloud-sync/credential-store.js'
import { describe, expect, it } from 'bun:test'

describe('credential cycle redaction (C-5, C-6, Edge-8)', () => {
  it('install writes owner-only; status redacts; remove is idempotent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mdt-cred-'))
    const store = new MachineCredentialStore({ rootDir: root })
    const SECRET = 'SUPER-SECRET-s3cr3t-value-XYZ'

    await store.install('runtime-a', {
      version: 1,
      kind: 'cloudflare-service-token',
      clientId: 'client-id-123',
      clientSecret: SECRET,
    })

    // The file exists and contains the secret on disk (owner-only).
    const file = store.filePath('runtime-a')
    const raw = await readFile(file, 'utf8')
    expect(raw).toContain(SECRET)

    // describeLoaded drops the secret from the diagnostic view.
    const loaded = await store.load('runtime-a')
    if (!loaded)
      throw new Error('load returned null')
    const diag = store.describeLoaded(loaded, 'runtime-a')
    expect(JSON.stringify(diag)).not.toContain(SECRET)
    expect(diag.clientId).toBe('client-id-123')

    // describe (no load) is always redacted.
    const redacted = store.describe('runtime-a')
    expect(JSON.stringify(redacted)).not.toContain(SECRET)

    // remove is idempotent.
    await store.remove('runtime-a')
    await store.remove('runtime-a')
    expect(await store.load('runtime-a')).toBeNull()

    await rm(root, { recursive: true, force: true })
  })

  it('install with empty secret fails closed and writes no file (Edge-8)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mdt-cred-'))
    const store = new MachineCredentialStore({ rootDir: root })
    await expect(store.install('runtime-b', {
      version: 1,
      kind: 'cloudflare-service-token',
      clientId: 'cid',
      clientSecret: '   ',
    })).rejects.toThrow()
    expect(await store.load('runtime-b')).toBeNull()
    await rm(root, { recursive: true, force: true })
  })
})
