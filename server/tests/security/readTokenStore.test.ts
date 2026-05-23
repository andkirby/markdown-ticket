/// <reference types="jest" />

import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

interface CreateTokenInput {
  name: string
  projectRefs: string[]
  expiresAt?: string | null
}

interface TokenCreationResult {
  id: string
  rawToken: string
}

interface InviteCreationResult {
  code: string
  expiresAt: string
}

interface ReadTokenStore {
  createToken: (input: CreateTokenInput) => Promise<TokenCreationResult>
  createInvite: (tokenId: string) => Promise<InviteCreationResult>
  consumeInvite: (code: string) => Promise<{ tokenId: string, projectRefs: string[], expiresAt: string | null }>
  listTokens: () => Promise<Array<Record<string, unknown>>>
  revokeToken: (tokenId: string) => Promise<void>
}

interface ReadTokenStoreModule {
  createReadTokenStore: (options: { configDir: string, now?: () => Date }) => ReadTokenStore
}

const readTokenStoreModulePath = '../../security/readTokenStore'

async function loadReadTokenStoreModule(): Promise<ReadTokenStoreModule> {
  return await import(readTokenStoreModulePath) as ReadTokenStoreModule
}

describe('readTokenStore - MDT-177', () => {
  let tempDir: string
  let configDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'mdt-read-token-store-'))
    configDir = join(tempDir, 'config')
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('stores persistent named read tokens as hashes only and never persists the raw token', async () => {
    const { createReadTokenStore } = await loadReadTokenStoreModule()
    const store = createReadTokenStore({ configDir, now: () => new Date('2026-05-23T10:00:00.000Z') })

    const created = await store.createToken({
      name: 'Bob',
      projectRefs: ['MDT', 'DOCS'],
      expiresAt: '2026-06-01T00:00:00.000Z',
    })

    expect(created.rawToken).toEqual(expect.any(String))
    expect(created.rawToken.length).toBeGreaterThanOrEqual(32)

    const storePath = join(configDir, 'auth', 'read-access-tokens.json')
    const persistedText = await fs.readFile(storePath, 'utf8')
    const persisted = JSON.parse(persistedText) as {
      tokens: Array<{ name: string, tokenHash: string, projectRefs: string[], expiresAt: string }>
    }

    expect(persistedText).not.toContain(created.rawToken)
    expect(persisted.tokens).toHaveLength(1)
    expect(persisted.tokens[0]).toMatchObject({
      name: 'Bob',
      projectRefs: ['MDT', 'DOCS'],
      expiresAt: '2026-06-01T00:00:00.000Z',
    })
    expect(persisted.tokens[0].tokenHash).toBe(createHash('sha256').update(created.rawToken).digest('hex'))

    const listed = await store.listTokens()
    expect(JSON.stringify(listed)).not.toContain(created.rawToken)
    expect(JSON.stringify(listed)).not.toContain(persisted.tokens[0].tokenHash)
  })

  it('generates hash-only one-time invite codes and consumes each code at most once', async () => {
    const { createReadTokenStore } = await loadReadTokenStoreModule()
    const store = createReadTokenStore({ configDir, now: () => new Date('2026-05-23T10:00:00.000Z') })
    const created = await store.createToken({ name: 'Bob', projectRefs: ['MDT', 'DOCS'] })

    const invite = await store.createInvite(created.id)
    expect(invite.code).toEqual(expect.any(String))
    expect(new Date(invite.expiresAt).getTime()).toBeGreaterThan(new Date('2026-05-23T10:00:00.000Z').getTime())

    const storePath = join(configDir, 'auth', 'read-access-tokens.json')
    const persistedText = await fs.readFile(storePath, 'utf8')
    expect(persistedText).not.toContain(invite.code)
    expect(persistedText).toContain(createHash('sha256').update(invite.code).digest('hex'))

    const firstConsume = await store.consumeInvite(invite.code)
    expect(firstConsume).toMatchObject({
      tokenId: created.id,
      projectRefs: ['MDT', 'DOCS'],
    })

    await expect(store.consumeInvite(invite.code)).rejects.toThrow(/invalid|expired|consumed|not accepted/i)
  })

  it('enforces expiry and revocation before generating or consuming invites', async () => {
    let currentTime = new Date('2026-05-23T10:00:00.000Z')
    const { createReadTokenStore } = await loadReadTokenStoreModule()
    const store = createReadTokenStore({ configDir, now: () => currentTime })

    const expiresSoon = await store.createToken({
      name: 'Expiring',
      projectRefs: ['MDT'],
      expiresAt: '2026-05-23T10:05:00.000Z',
    })
    const invite = await store.createInvite(expiresSoon.id)

    currentTime = new Date('2026-05-23T10:06:00.000Z')
    await expect(store.createInvite(expiresSoon.id)).rejects.toThrow(/expired|inactive|not accepted/i)
    await expect(store.consumeInvite(invite.code)).rejects.toThrow(/invalid|expired|not accepted/i)

    currentTime = new Date('2026-05-23T10:00:00.000Z')
    const revoked = await store.createToken({ name: 'Revoked', projectRefs: ['DOCS'] })
    const revokedInvite = await store.createInvite(revoked.id)
    await store.revokeToken(revoked.id)

    await expect(store.createInvite(revoked.id)).rejects.toThrow(/revoked|inactive|not accepted/i)
    await expect(store.consumeInvite(revokedInvite.code)).rejects.toThrow(/invalid|revoked|not accepted/i)
  })

  it('consumes invite codes atomically when concurrent requests race', async () => {
    const { createReadTokenStore } = await loadReadTokenStoreModule()
    const store = createReadTokenStore({ configDir, now: () => new Date('2026-05-23T10:00:00.000Z') })
    const created = await store.createToken({ name: 'Bob', projectRefs: ['MDT'] })
    const invite = await store.createInvite(created.id)

    const results = await Promise.allSettled([
      store.consumeInvite(invite.code),
      store.consumeInvite(invite.code),
      store.consumeInvite(invite.code),
    ])

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(2)
  })

  it('fails closed for malformed persisted stores', async () => {
    const { createReadTokenStore } = await loadReadTokenStoreModule()
    await fs.mkdir(join(configDir, 'auth'), { recursive: true })
    await fs.writeFile(join(configDir, 'auth', 'read-access-tokens.json'), '{ malformed json', 'utf8')

    const store = createReadTokenStore({ configDir, now: () => new Date('2026-05-23T10:00:00.000Z') })

    await expect(store.listTokens()).rejects.toThrow(/read access token store|malformed|invalid/i)
    await expect(store.consumeInvite('some-code')).rejects.toThrow(/read access token store|malformed|invalid/i)
  })
})
