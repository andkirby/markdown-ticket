import type { CreateReadTokenInput, ListedReadToken, ReadTokenCreationResponse } from '@mdt/domain-contracts'
import { Buffer } from 'node:buffer'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const STORE_VERSION = 1
const STORE_RELATIVE_PATH = path.join('auth', 'read-access-tokens.json')
const DEFAULT_INVITE_TTL_MS = 15 * 60 * 1000
const storeWriteLocks = new Map<string, Promise<void>>()

type CreateTokenInput = CreateReadTokenInput

interface ReadTokenRecord {
  id: string
  name: string
  tokenHash: string
  projectRefs: string[]
  expiresAt: string | null
  createdAt: string
  revokedAt: string | null
}

interface ReadInviteRecord {
  id: string
  tokenId: string
  codeHash: string
  expiresAt: string
  createdAt: string
  consumedAt: string | null
  revokedAt: string | null
}

type TokenCreationResult = ReadTokenCreationResponse

interface InviteCreationResult {
  code: string
  expiresAt: string
}

export interface TokenResolution {
  tokenId: string
  projectRefs: string[]
  expiresAt: string | null
}

interface ReadTokenStore {
  createToken: (input: CreateTokenInput) => Promise<TokenCreationResult>
  listTokens: () => Promise<ListedReadToken[]>
  createInvite: (tokenId: string) => Promise<InviteCreationResult>
  consumeInvite: (code: string) => Promise<TokenResolution>
  resolveToken: (rawToken: string) => Promise<TokenResolution>
  resolveTokenById: (tokenId: string) => Promise<TokenResolution>
  revokeToken: (tokenId: string) => Promise<ListedReadToken>
}

interface ReadTokenStoreOptions {
  configDir: string
  now?: () => Date
}

interface PersistedReadTokenStore {
  version: number
  tokens: ReadTokenRecord[]
  invites: ReadInviteRecord[]
}

class ReadTokenStoreError extends Error {
  constructor(message = 'Read access token store is invalid or unavailable') {
    super(message)
    this.name = 'ReadTokenStoreError'
  }
}

export class ReadTokenRejectedError extends Error {
  constructor(message = 'Read access token was not accepted') {
    super(message)
    this.name = 'ReadTokenRejectedError'
  }
}

export function createReadTokenStore(options: ReadTokenStoreOptions): ReadTokenStore {
  const configDir = options.configDir
  const now = options.now ?? (() => new Date())
  const storePath = path.join(configDir, STORE_RELATIVE_PATH)

  async function loadStore(): Promise<PersistedReadTokenStore> {
    try {
      const content = await readFile(storePath, 'utf8')
      const parsed = JSON.parse(content) as unknown
      if (!isPersistedStore(parsed)) {
        throw new ReadTokenStoreError()
      }
      return parsed
    }
    catch (error) {
      if (isMissingFileError(error)) {
        return createEmptyStore()
      }
      if (error instanceof ReadTokenStoreError) {
        throw error
      }
      throw new ReadTokenStoreError()
    }
  }

  async function saveStore(store: PersistedReadTokenStore): Promise<void> {
    await mkdir(path.dirname(storePath), { recursive: true })
    const temporaryPath = `${storePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
    await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, storePath)
  }

  async function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const previousLock = storeWriteLocks.get(storePath) ?? Promise.resolve()
    let releaseCurrentLock: () => void = () => {}
    const currentLock = new Promise<void>((resolve) => {
      releaseCurrentLock = resolve
    })
    const queuedLock = previousLock.catch(() => undefined).then(() => currentLock)
    storeWriteLocks.set(storePath, queuedLock)

    await previousLock.catch(() => undefined)
    try {
      return await operation()
    }
    finally {
      releaseCurrentLock()
      if (storeWriteLocks.get(storePath) === queuedLock) {
        storeWriteLocks.delete(storePath)
      }
    }
  }

  function activeTokenOrThrow(token: ReadTokenRecord | undefined): ReadTokenRecord {
    if (!token || token.revokedAt || isExpired(token.expiresAt, now())) {
      throw new ReadTokenRejectedError()
    }
    return token
  }

  return {
    async createToken(input: CreateTokenInput): Promise<TokenCreationResult> {
      return await withWriteLock(async () => {
        const store = await loadStore()
        const createdAt = now().toISOString()
        const rawToken = randomBytes(32).toString('base64url')
        const token: ReadTokenRecord = {
          id: `rtok_${randomBytes(12).toString('base64url')}`,
          name: validateName(input.name),
          tokenHash: hashSecret(rawToken),
          projectRefs: normalizeProjectRefs(input.projectRefs),
          expiresAt: normalizeExpiry(input.expiresAt),
          createdAt,
          revokedAt: null,
        }

        store.tokens.push(token)
        await saveStore(store)

        return {
          ...toListedToken(token, now()),
          rawToken,
        }
      })
    },

    async listTokens(): Promise<ListedReadToken[]> {
      const store = await loadStore()
      const currentTime = now()
      return store.tokens.map(token => toListedToken(token, currentTime))
    },

    async createInvite(tokenId: string): Promise<InviteCreationResult> {
      return await withWriteLock(async () => {
        const store = await loadStore()
        activeTokenOrThrow(store.tokens.find(token => token.id === tokenId))

        const currentTime = now()
        const code = randomBytes(32).toString('base64url')
        const invite: ReadInviteRecord = {
          id: `inv_${randomBytes(12).toString('base64url')}`,
          tokenId,
          codeHash: hashSecret(code),
          expiresAt: new Date(currentTime.getTime() + DEFAULT_INVITE_TTL_MS).toISOString(),
          createdAt: currentTime.toISOString(),
          consumedAt: null,
          revokedAt: null,
        }

        store.invites.push(invite)
        await saveStore(store)

        return {
          code,
          expiresAt: invite.expiresAt,
        }
      })
    },

    async consumeInvite(code: string): Promise<TokenResolution> {
      return await withWriteLock(async () => {
        const store = await loadStore()
        const currentTime = now()
        const invite = store.invites.find(candidate => safeHashEquals(candidate.codeHash, hashSecret(code)))
        if (!invite || invite.consumedAt || invite.revokedAt || isExpired(invite.expiresAt, currentTime)) {
          throw new ReadTokenRejectedError()
        }

        const token = activeTokenOrThrow(store.tokens.find(candidate => candidate.id === invite.tokenId))
        invite.consumedAt = currentTime.toISOString()
        await saveStore(store)

        return toResolution(token)
      })
    },

    async resolveToken(rawToken: string): Promise<TokenResolution> {
      const store = await loadStore()
      const tokenHash = hashSecret(rawToken)
      return toResolution(activeTokenOrThrow(store.tokens.find(token => safeHashEquals(token.tokenHash, tokenHash))))
    },

    async resolveTokenById(tokenId: string): Promise<TokenResolution> {
      const store = await loadStore()
      return toResolution(activeTokenOrThrow(store.tokens.find(token => token.id === tokenId)))
    },

    async revokeToken(tokenId: string): Promise<ListedReadToken> {
      return await withWriteLock(async () => {
        const store = await loadStore()
        const token = store.tokens.find(candidate => candidate.id === tokenId)
        if (!token) {
          throw new ReadTokenRejectedError()
        }

        token.revokedAt = token.revokedAt ?? now().toISOString()
        for (const invite of store.invites) {
          if (invite.tokenId === tokenId) {
            invite.revokedAt = invite.revokedAt ?? token.revokedAt
          }
        }

        await saveStore(store)
        return toListedToken(token, now())
      })
    },
  }
}

function createEmptyStore(): PersistedReadTokenStore {
  return {
    version: STORE_VERSION,
    tokens: [],
    invites: [],
  }
}

function validateName(name: string): string {
  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new ReadTokenRejectedError()
  }
  return normalizedName
}

function normalizeProjectRefs(projectRefs: string[]): string[] {
  const refs = Array.from(new Set(projectRefs.map(ref => ref.trim()).filter(Boolean)))
  if (refs.length === 0) {
    throw new ReadTokenRejectedError()
  }
  return refs
}

function normalizeExpiry(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) {
    return null
  }

  const expiry = new Date(expiresAt)
  if (Number.isNaN(expiry.getTime())) {
    throw new ReadTokenRejectedError()
  }

  return expiry.toISOString()
}

function toListedToken(token: ReadTokenRecord, currentTime: Date): ListedReadToken {
  return {
    id: token.id,
    name: token.name,
    projectRefs: token.projectRefs,
    expiresAt: token.expiresAt,
    createdAt: token.createdAt,
    revokedAt: token.revokedAt,
    status: token.revokedAt ? 'revoked' : isExpired(token.expiresAt, currentTime) ? 'expired' : 'active',
  }
}

function toResolution(token: ReadTokenRecord): TokenResolution {
  return {
    tokenId: token.id,
    projectRefs: token.projectRefs,
    expiresAt: token.expiresAt,
  }
}

function isExpired(expiresAt: string | null, currentTime: Date): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= currentTime.getTime())
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

function safeHashEquals(actualHash: string, expectedHash: string): boolean {
  const actual = Buffer.from(actualHash)
  const expected = Buffer.from(expectedHash)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function isPersistedStore(value: unknown): value is PersistedReadTokenStore {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PersistedReadTokenStore>
  return candidate.version === STORE_VERSION
    && Array.isArray(candidate.tokens)
    && candidate.tokens.every(isReadTokenRecord)
    && Array.isArray(candidate.invites)
    && candidate.invites.every(isReadInviteRecord)
}

function isReadTokenRecord(value: unknown): value is ReadTokenRecord {
  const candidate = value as Partial<ReadTokenRecord>
  return Boolean(value)
    && typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.tokenHash === 'string'
    && /^[a-f0-9]{64}$/u.test(candidate.tokenHash)
    && Array.isArray(candidate.projectRefs)
    && candidate.projectRefs.every(projectRef => typeof projectRef === 'string')
    && (typeof candidate.expiresAt === 'string' || candidate.expiresAt === null)
    && typeof candidate.createdAt === 'string'
    && (typeof candidate.revokedAt === 'string' || candidate.revokedAt === null)
}

function isReadInviteRecord(value: unknown): value is ReadInviteRecord {
  const candidate = value as Partial<ReadInviteRecord>
  return Boolean(value)
    && typeof candidate.id === 'string'
    && typeof candidate.tokenId === 'string'
    && typeof candidate.codeHash === 'string'
    && /^[a-f0-9]{64}$/u.test(candidate.codeHash)
    && typeof candidate.expiresAt === 'string'
    && typeof candidate.createdAt === 'string'
    && (typeof candidate.consumedAt === 'string' || candidate.consumedAt === null)
    && (typeof candidate.revokedAt === 'string' || candidate.revokedAt === null)
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'ENOENT')
}
