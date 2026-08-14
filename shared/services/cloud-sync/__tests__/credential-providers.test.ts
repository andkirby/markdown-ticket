/**
 * TEST-credential-providers — covers the two CloudCredentialProvider impls
 * (MDT-200 Slice U2).
 *
 * Source: docs/architecture/cloud-sync/identity-and-access.md § Client Credential Flows.
 *
 * Verifies:
 *   - CloudflaredCredentialProvider (human): spawns `cloudflared access token`
 *     with a FIXED arg array (no shell), origin from validated config, returns
 *     the token or null on a non-zero exit, and never prints/persists/logs it.
 *   - ServiceTokenCredentialProvider (machine): returns null when env is absent
 *     and a resolved credential value when both CF_ACCESS_CLIENT_* are present.
 */

import type { ChildProcess } from 'node:child_process'
import { Buffer } from 'node:buffer'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

import {
  CloudflaredCredentialProvider,
  RuntimeCloudCredentialProvider,
  ServiceTokenCredentialProvider,
  buildServiceTokenHeaders,
} from '../credential-providers'
import {
  AccessCredentialBroker,
  streamAuthorizationFromCredential,
} from '../access-credential-broker'
import { MachineCredentialStore } from '../credential-store'

const ALLOWED = 'https://mdt-sync.example.com'

/* ---------- CloudflaredCredentialProvider ---------- */

describe('CloudflaredCredentialProvider (human)', () => {
  let spawn: ReturnType<typeof jest.fn>

  beforeEach(() => {
    spawn = jest.fn()
  })

  it('spawns `cloudflared access token -app=<origin>` with a fixed arg array', async () => {
    spawn.mockImplementation(fakeExecOk('token-xyz'))
    const p = new CloudflaredCredentialProvider({ spawn: spawn as any })
    const cred = await p.resolve(ALLOWED)
    expect(cred).toEqual({ kind: 'human', cfAccessToken: 'token-xyz' })

    expect(spawn).toHaveBeenCalledTimes(1)
    const [cmd, args] = spawn.mock.calls[0]!
    expect(cmd).toBe('cloudflared')
    expect(args).toEqual(['access', 'token', `-app=${ALLOWED}`])
    // No shell — execFile never accepts a shell string by default; assert the
    // arg array is fully literal (no interpolation beyond the validated origin).
    expect(args.some(a => a.includes(' '))).toBe(false)
  })

  it('returns null on a non-zero exit (no human session)', async () => {
    spawn.mockImplementation(fakeExecErr(1))
    const p = new CloudflaredCredentialProvider({ spawn: spawn as any })
    const cred = await p.resolve(ALLOWED)
    expect(cred).toBeNull()
  })

  it('returns null when cloudflared is not found (spawn error)', async () => {
    spawn.mockImplementation((_file: string, _args: readonly string[], cb: ExecCallback) => {
      const cp = minimalChild()
      // Defer the error callback so it is delivered asynchronously.
      queueMicrotask(() => cb(new Error('ENOENT') as any, '', ''))
      return cp
    })
    const p = new CloudflaredCredentialProvider({ spawn: spawn as any })
    const cred = await p.resolve(ALLOWED)
    expect(cred).toBeNull()
  })

  it('trims the token (no trailing newline leaks into the header)', async () => {
    spawn.mockImplementation(fakeExecOk('token-xyz\n'))
    const p = new CloudflaredCredentialProvider({ spawn: spawn as any })
    const cred = await p.resolve(ALLOWED)
    expect(cred).toEqual({ kind: 'human', cfAccessToken: 'token-xyz' })
  })

  it('never logs the token (stderr/stdout are discarded, not printed)', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    spawn.mockImplementation(fakeExecOk('super-secret-token'))
    const p = new CloudflaredCredentialProvider({ spawn: spawn as any })
    await p.resolve(ALLOWED)
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('super-secret-token'))
    expect(errSpy).not.toHaveBeenCalledWith(expect.stringContaining('super-secret-token'))
    consoleSpy.mockRestore()
    errSpy.mockRestore()
  })

  it('serializes acquisitions so only one cloudflared child is active (C-13)', async () => {
    const callbacks: ExecCallback[] = []
    spawn.mockImplementation((_file: string, _args: readonly string[], cb: ExecCallback) => {
      callbacks.push(cb)
      return minimalChild()
    })
    const provider = new CloudflaredCredentialProvider({ spawn: spawn as any })

    const first = provider.resolve(ALLOWED)
    const second = provider.resolve('https://other.example.com')
    await Promise.resolve()
    expect(spawn).toHaveBeenCalledTimes(1)

    callbacks[0]!(null, 'token-a', '')
    await first
    await Promise.resolve()
    expect(spawn).toHaveBeenCalledTimes(2)

    callbacks[1]!(null, 'token-b', '')
    await second
  })

  it('signals a timed-out child and blocks replacement until exit (Edge-7)', async () => {
    const kill = jest.fn(() => true)
    const callbacks: ExecCallback[] = []
    spawn.mockImplementation((_file: string, _args: readonly string[], cb: ExecCallback) => {
      callbacks.push(cb)
      return minimalChild(kill)
    })
    const provider = new CloudflaredCredentialProvider({
      spawn: spawn as any,
      timeoutMs: 5,
    })

    await expect(provider.resolve(ALLOWED)).resolves.toBeNull()
    expect(kill).toHaveBeenCalledWith('SIGTERM')

    const queued = provider.resolve('https://other.example.com')
    await Promise.resolve()
    expect(spawn).toHaveBeenCalledTimes(1)

    callbacks[0]!(new Error('terminated') as NodeJS.ErrnoException, '', '')
    await Promise.resolve()
    await Promise.resolve()
    expect(spawn).toHaveBeenCalledTimes(2)
    callbacks[1]!(null, 'token-b', '')
    await expect(queued).resolves.toEqual({
      kind: 'human',
      cfAccessToken: 'token-b',
    })
  })
})

describe('AccessCredentialBroker (TEST-credential-broker-resource-bounds)', () => {
  it('shares one origin acquisition and reuses the valid token (C-13)', async () => {
    let complete!: (credential: {
      kind: 'human'
      cfAccessToken: string
    }) => void
    const provider = {
      resolve: jest.fn(() => new Promise<{
        kind: 'human'
        cfAccessToken: string
      }>((resolve) => {
        complete = resolve
      })),
    }
    const broker = new AccessCredentialBroker({
      provider,
      now: () => 1_000_000,
      refreshSkewMs: 60_000,
    })

    const first = broker.resolve(ALLOWED)
    const second = broker.resolve(ALLOWED)
    expect(provider.resolve).toHaveBeenCalledTimes(1)

    const credential = {
      kind: 'human' as const,
      cfAccessToken: jwtWithExpiry(2_000),
    }
    complete(credential)
    await expect(Promise.all([first, second])).resolves.toEqual([
      credential,
      credential,
    ])
    await expect(broker.resolve(ALLOWED)).resolves.toEqual(credential)
    expect(provider.resolve).toHaveBeenCalledTimes(1)
  })

  it('uses only the non-interactive provider path for background refresh (C-13, Edge-7)', async () => {
    const provider = {
      resolve: jest.fn(async () => ({
        kind: 'human' as const,
        cfAccessToken: 'interactive-token',
      })),
      resolveNonInteractive: jest.fn(async () => null),
    }
    const broker = new AccessCredentialBroker({ provider })

    await expect(broker.resolveNonInteractive(ALLOWED)).resolves.toBeNull()
    expect(provider.resolveNonInteractive).toHaveBeenCalledTimes(1)
    expect(provider.resolve).not.toHaveBeenCalled()
  })

  it('reuses a human token acquired by an explicit operation for background refresh', async () => {
    const credential = {
      kind: 'human' as const,
      cfAccessToken: jwtWithExpiry(2_000),
    }
    const provider = {
      resolve: jest.fn(async () => credential),
      resolveNonInteractive: jest.fn(async () => null),
    }
    const broker = new AccessCredentialBroker({
      provider,
      now: () => 1_000_000,
    })

    await expect(broker.resolve(ALLOWED)).resolves.toEqual(credential)
    await expect(broker.resolveNonInteractive(ALLOWED)).resolves.toEqual(credential)
    expect(provider.resolveNonInteractive).not.toHaveBeenCalled()
  })
})

describe('RuntimeCloudCredentialProvider', () => {
  it('resolves service credentials without invoking the human provider', async () => {
    const serviceCredential = {
      kind: 'service' as const,
      clientId: 'machine-id',
      clientSecret: 'machine-secret',
    }
    const service = { resolve: jest.fn(async () => serviceCredential) }
    const human = { resolve: jest.fn(async () => null) }
    const provider = new RuntimeCloudCredentialProvider(service, human)

    await expect(provider.resolveNonInteractive(ALLOWED)).resolves.toEqual(serviceCredential)
    expect(human.resolve).not.toHaveBeenCalled()

    expect(streamAuthorizationFromCredential(serviceCredential, 1_000_000)).toEqual({
      headers: {
        'CF-Access-Client-Id': 'machine-id',
        'CF-Access-Client-Secret': 'machine-secret',
      },
      tokenExpiry: 1_300_000,
    })
  })
})

/* ---------- ServiceTokenCredentialProvider ---------- */

describe('ServiceTokenCredentialProvider (machine)', () => {
  const ORIG_ENV = { ...process.env }

  afterEach(() => {
    // Restore env between tests.
    for (const k of Object.keys(process.env)) {
      if (!(k in ORIG_ENV))
        delete process.env[k]
    }
    Object.assign(process.env, ORIG_ENV)
  })

  it('returns null when CF_ACCESS_CLIENT_ID is absent', async () => {
    delete process.env.CF_ACCESS_CLIENT_ID
    process.env.CF_ACCESS_CLIENT_SECRET = 'secret-1'
    const p = new ServiceTokenCredentialProvider()
    expect(await p.resolve(ALLOWED)).toBeNull()
  })

  it('returns null when CF_ACCESS_CLIENT_SECRET is absent', async () => {
    process.env.CF_ACCESS_CLIENT_ID = 'id-1'
    delete process.env.CF_ACCESS_CLIENT_SECRET
    const p = new ServiceTokenCredentialProvider()
    expect(await p.resolve(ALLOWED)).toBeNull()
  })

  it('returns null when both are absent', async () => {
    delete process.env.CF_ACCESS_CLIENT_ID
    delete process.env.CF_ACCESS_CLIENT_SECRET
    const p = new ServiceTokenCredentialProvider()
    expect(await p.resolve(ALLOWED)).toBeNull()
  })

  it('returns a resolved credential value when both are present', async () => {
    process.env.CF_ACCESS_CLIENT_ID = 'client-id-123'
    process.env.CF_ACCESS_CLIENT_SECRET = 'client-secret-456'
    const p = new ServiceTokenCredentialProvider()
    const cred = await p.resolve(ALLOWED)
    expect(cred).toEqual({
      kind: 'service',
      clientId: 'client-id-123',
      clientSecret: 'client-secret-456',
    })
  })

  it('exposes the Access service-token header pair via buildServiceTokenHeaders', () => {
    const headers = buildServiceTokenHeaders('client-id-123', 'client-secret-456')
    // Per identity-and-access.md § Client Credential Flows + Secret Policy:
    // the exact header names are CF-Access-Client-Id / CF-Access-Client-Secret.
    expect(headers).not.toBeNull()
    expect(headers!['CF-Access-Client-Id']).toBe('client-id-123')
    expect(headers!['CF-Access-Client-Secret']).toBe('client-secret-456')
  })

  it('never echoes the secret to logs', async () => {
    process.env.CF_ACCESS_CLIENT_ID = 'id-1'
    process.env.CF_ACCESS_CLIENT_SECRET = 'top-secret-value'
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const p = new ServiceTokenCredentialProvider()
    await p.resolve(ALLOWED)
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('top-secret-value'))
    expect(errSpy).not.toHaveBeenCalledWith(expect.stringContaining('top-secret-value'))
    consoleSpy.mockRestore()
    errSpy.mockRestore()
  })
})

/* ---------- ServiceTokenCredentialProvider — CONFIG_DIR store (MDT-201) ---------- */

describe('ServiceTokenCredentialProvider via CONFIG_DIR store (TEST-machine-credential-local)', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-cred-providers-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('resolves each runtime credential only through the CONFIG_DIR credential store', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    await store.install('runtime-ci', {
      version: 1,
      kind: 'cloudflare-service-token',
      clientId: 'client-id-123',
      clientSecret: 'client-secret-456',
    })
    const provider = new ServiceTokenCredentialProvider({ store, credentialRef: 'runtime-ci' })
    const cred = await provider.resolve(ALLOWED)
    expect(cred).toEqual({
      kind: 'service',
      clientId: 'client-id-123',
      clientSecret: 'client-secret-456',
    })
  })

  it('returns null (no local fallback) when the runtime has no installed credential', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    const provider = new ServiceTokenCredentialProvider({ store, credentialRef: 'runtime-absent' })
    expect(await provider.resolve(ALLOWED)).toBeNull()
  })

  it('two runtimes on the same device keep independent credentials (per-runtime isolation)', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    await store.install('runtime-ci', {
      version: 1,
      kind: 'cloudflare-service-token',
      clientId: 'ci-id',
      clientSecret: 'ci-secret',
    })
    await store.install('runtime-prod', {
      version: 1,
      kind: 'cloudflare-service-token',
      clientId: 'prod-id',
      clientSecret: 'prod-secret',
    })
    const ci = new ServiceTokenCredentialProvider({ store, credentialRef: 'runtime-ci' })
    const prod = new ServiceTokenCredentialProvider({ store, credentialRef: 'runtime-prod' })
    const ciCred = await ci.resolve(ALLOWED)
    const prodCred = await prod.resolve(ALLOWED)
    expect(ciCred?.kind).toBe('service')
    expect(prodCred?.kind).toBe('service')
    if (ciCred?.kind === 'service') {
      expect(ciCred.clientId).toBe('ci-id')
    }
    if (prodCred?.kind === 'service') {
      expect(prodCred.clientId).toBe('prod-id')
    }
  })

  it('membership request payload carries only the non-secret principal id, never the secret', async () => {
    const store = new MachineCredentialStore({ rootDir: root })
    await store.install('runtime-ci', {
      version: 1,
      kind: 'cloudflare-service-token',
      clientId: 'machine-principal-123',
      clientSecret: 'top-secret-value',
    })
    const provider = new ServiceTokenCredentialProvider({ store, credentialRef: 'runtime-ci' })

    // The principal id surfaced for membership is the non-secret client id.
    const principalId = await provider.machinePrincipalId()
    expect(principalId).toBe('machine-principal-123')

    // A membership upsert body built from the principal carries no secret.
    const membershipBody = { displayLabel: 'ci', role: 'contributor' }
    const serialized = JSON.stringify({ kind: 'machine', id: principalId, ...membershipBody })
    expect(serialized).not.toContain('top-secret-value')
    expect(serialized).not.toContain('clientSecret')
  })

  it('keeps the env fallback path for backward compatibility when no store is configured', async () => {
    process.env.CF_ACCESS_CLIENT_ID = 'env-id'
    process.env.CF_ACCESS_CLIENT_SECRET = 'env-secret'
    const provider = new ServiceTokenCredentialProvider()
    const cred = await provider.resolve(ALLOWED)
    expect(cred).toEqual({ kind: 'service', clientId: 'env-id', clientSecret: 'env-secret' })
    delete process.env.CF_ACCESS_CLIENT_ID
    delete process.env.CF_ACCESS_CLIENT_SECRET
  })
})

/* ---------- helpers ---------- */

/** The execFile callback shape the provider depends on. */
type ExecCallback = (err: NodeJS.ErrnoException | null, stdout: string, stderr: string) => void

/** Minimal Node EventEmitter-based fake ChildProcess (returned, never streamed). */
function minimalChild(kill: (signal?: NodeJS.Signals | number) => boolean = () => true): ChildProcess {
  const handlers: Record<string, Array<(...args: any[]) => void>> = {}
  const cp = {
    on(event: string, fn: (...args: any[]) => void) {
      (handlers[event] ??= []).push(fn)
      return this
    },
    emit(event: string, ...args: any[]) {
      for (const fn of handlers[event] ?? [])
        fn(...args)
    },
    kill,
    stdin: { end() {} },
  }
  return cp as unknown as ChildProcess
}

function jwtWithExpiry(exp: number): string {
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  return `header.${payload}.signature`
}

/** A fake execFile that yields a successful token (deferred, async-safe). */
function fakeExecOk(stdout: string) {
  return (_file: string, _args: readonly string[], cb: ExecCallback): ChildProcess => {
    const cp = minimalChild()
    queueMicrotask(() => cb(null, stdout, ''))
    return cp
  }
}

/** A fake execFile that yields a non-zero exit error (no human session). */
function fakeExecErr(code: number) {
  return (_file: string, _args: readonly string[], cb: ExecCallback): ChildProcess => {
    const cp = minimalChild()
    queueMicrotask(() => {
      const err = new Error(`cloudflared exited with code ${code}`) as NodeJS.ErrnoException
      void code
      cb(err, '', '')
    })
    return cp
  }
}
