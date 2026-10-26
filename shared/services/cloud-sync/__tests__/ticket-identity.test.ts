import type { Project, TicketClaimResponse } from '@mdt/domain-contracts'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { CLOUD_SYNC_CONNECTION_VERSION, CoordinatorError } from '@mdt/domain-contracts'
import { assertSafeTicketInventory, assertUnambiguousTicket, classifyTicketIdentity, scanTicketIdentities } from '../../ticket/TicketIdentityService'
import { TicketService } from '../../TicketService'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS } from '../config'
import { ProjectStateStore } from '../project-state-store'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'

let root: string
let projectPath: string
const id = '9f3d9366-f9b1-4cce-a727-012261bf0a22'
const otherId = 'bfd4ea82-e7fd-44ce-8ac4-4dc2cd1bca34'
const claim = (state: TicketClaimResponse['state'], creationId: string | null = id): TicketClaimResponse => ({ protocolVersion: 2, ticketNumber: 258, creationId, reservationId: state === 'unreserved' ? null : 'reservation', state })
const file = { code: 'MDT-258', ticketNumber: 258, creationId: id, absolutePath: '/fixture/docs/CRs/MDT-258-manual.md', relativePath: 'docs/CRs/MDT-258-manual.md', root: '/fixture', valid: true }
async function ticket(name: string, code: string, creationId?: string, where = projectPath) {
  const path = join(where, 'docs/CRs', name)
  await writeFile(path, `---\ncode: ${code}\n${creationId ? `creationId: ${creationId}\n` : ''}---\n# Fixture\n`)
  return path
}
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mdt-ticket-identity-'))
  projectPath = join(root, 'project')
  await mkdir(join(projectPath, 'docs/CRs'), { recursive: true })
  await writeFile(join(projectPath, '.mdt-config.toml'), '[project]\nname="Fixture"\ncode="MDT"\npath="."\nticketsPath="docs/CRs"\n')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('manual ticket observation never adopts a number (BR-1.9)', () => {
  it.each(['reserved', 'acknowledged', 'orphaned', 'abandoned'] as const)('reports an unrelated %s claim as conflict', (state) => {
    expect(classifyTicketIdentity(file, claim(state, otherId)).state).toBe('conflict')
  })
  it('does not mistake a reserved number without a projection for a free number', () => {
    expect(classifyTicketIdentity(file, claim('reserved')).state).toBe('verification_pending')
  })
  it('recognizes the same acknowledged creation delivered by Git', () => {
    expect(classifyTicketIdentity(file, claim('acknowledged')).state).toBe('verified')
  })
  it('reports absent claims as unmanaged and unavailable evidence as pending', () => {
    expect(classifyTicketIdentity(file, claim('unreserved', null)).state).toBe('unmanaged')
    expect(classifyTicketIdentity(file).state).toBe('verification_pending')
    expect(classifyTicketIdentity({ ...file, creationId: undefined }, claim('acknowledged')).state).toBe('verification_pending')
  })
  it('rejects copied identity from another key', () => {
    expect(classifyTicketIdentity(file, { ...claim('acknowledged'), ticketNumber: 259 }).state).toBe('conflict')
  })
})

describe('canonical identity inventory', () => {
  it('does not let an arbitrary Markdown filename bypass the key guard', async () => {
    await ticket('aaa.md', 'MDT-259', id)
    await ticket('MDT-259-real.md', 'MDT-259', otherId)
    const inventory = await scanTicketIdentities(projectPath, 'docs/CRs', 'MDT')
    expect(() => assertUnambiguousTicket(inventory, 'MDT-259')).toThrow('ambiguous')
    expect(inventory.files).toHaveLength(2)
    expect(() => assertSafeTicketInventory(inventory)).toThrow('incomplete')
  })
  it('blocks both keys claimed by a mismatched file without blocking unrelated keys', async () => {
    await ticket('MDT-258-foreign.md', 'MDT-259', id)
    await ticket('MDT-259-real.md', 'MDT-259', otherId)
    await ticket('MDT-260-independent.md', 'MDT-260')
    const inventory = await scanTicketIdentities(projectPath, 'docs/CRs', 'MDT')
    expect(() => assertUnambiguousTicket(inventory, 'MDT-258')).toThrow('ambiguous')
    expect(() => assertUnambiguousTicket(inventory, 'MDT-259')).toThrow('ambiguous')
    expect(() => assertUnambiguousTicket(inventory, 'MDT-260')).not.toThrow()
  })
  it('blocks a creation identity copied to a different key', async () => {
    await ticket('MDT-258-original.md', 'MDT-258', id)
    await ticket('MDT-259-copy.md', 'MDT-259', id)
    const inventory = await scanTicketIdentities(projectPath, 'docs/CRs', 'MDT')
    expect(() => assertUnambiguousTicket(inventory, 'MDT-258')).toThrow('ambiguous')
    expect(() => assertUnambiguousTicket(inventory, 'MDT-259')).toThrow('ambiguous')
  })
  it('finds same-key different-slug ambiguity and preserves bytes', async () => {
    const a = await ticket('MDT-258-original.md', 'MDT-258', id)
    const b = await ticket('MDT-258-manual.md', 'MDT-258', id)
    const before = await readFile(a, 'utf8')
    const inventory = await scanTicketIdentities(projectPath, 'docs/CRs', 'MDT')
    expect(() => assertUnambiguousTicket(inventory, 'MDT-258')).toThrow('ambiguous')
    expect(() => assertSafeTicketInventory(inventory)).toThrow('ambiguous')
    expect(await readFile(a, 'utf8')).toBe(before)
    expect(await readFile(b, 'utf8')).toBe(before)
    expect(inventory.files.every(value => !value.relativePath.startsWith(root))).toBe(true)
  })
  it('fails closed on partial files, filename disagreement, and unsafe numbering', async () => {
    await ticket('MDT-258-mismatch.md', 'MDT-259', id)
    await writeFile(join(projectPath, 'docs/CRs/MDT-260-partial.md'), '---\ncode:')
    const inventory = await scanTicketIdentities(projectPath, 'docs/CRs', 'MDT')
    expect(inventory.diagnostics).toHaveLength(2)
    expect(() => assertSafeTicketInventory(inventory)).toThrow('incomplete')
    await ticket('MDT-9007199254740991-overflow.md', 'MDT-9007199254740991', id)
    const overflow = await scanTicketIdentities(projectPath, 'docs/CRs', 'MDT')
    expect(overflow.files.some(value => value.code === 'MDT-258')).toBe(true)
    expect(overflow.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ filePath: 'docs/CRs/MDT-9007199254740991-overflow.md', cause: 'unsupported_ticket_number', nextAction: expect.any(String) })]))
    expect(() => assertSafeTicketInventory(overflow)).toThrow('MDT-9007199254740991-overflow.md')
  })
  it('uses one physical identity and observes all Git worktrees', async () => {
    const run = (...args: string[]) => execFileSync('git', ['-C', projectPath, ...args], { stdio: 'pipe' })
    run('init')
    await ticket('MDT-258-original.md', 'MDT-258', id)
    run('add', '.')
    run('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture')
    const linked = join(root, 'linked')
    run('worktree', 'add', '--detach', linked)
    await ticket('MDT-262-extra.md', 'MDT-262', otherId, linked)
    const a = await scanTicketIdentities(projectPath, 'docs/CRs', 'MDT')
    const b = await scanTicketIdentities(linked, 'docs/CRs', 'MDT')
    expect(a.minimumTicketNumber).toBe(263)
    expect(a.physicalRepoPath).toBe(b.physicalRepoPath)
    expect(() => assertUnambiguousTicket(a, 'MDT-258')).not.toThrow()
    const external = join(root, 'external-tickets')
    await mkdir(external)
    await writeFile(join(external, 'MDT-262-external.md'), `---\ncode: MDT-262\ncreationId: ${id}\n---\n# External\n`)
    const externalInventory = await scanTicketIdentities(projectPath, external, 'MDT')
    expect(externalInventory.files).toHaveLength(1)
    expect(externalInventory.minimumTicketNumber).toBe(263)
    expect(externalInventory.files[0].relativePath).toBe('tickets-root/MDT-262-external.md')
    expect(() => assertSafeTicketInventory(externalInventory)).not.toThrow()
    const relativeExternal = await scanTicketIdentities(projectPath, '../external-tickets', 'MDT')
    expect(relativeExternal.files).toHaveLength(1)
    expect(relativeExternal.files[0].relativePath).toBe('tickets-root/MDT-262-external.md')
    execFileSync('git', ['-C', linked, 'checkout', '-b', 'MDT-262'], { stdio: 'pipe' })
    await writeFile(join(projectPath, '.mdt-config.toml'), '[project]\nname="External"\ncode="MDT"\npath="."\nticketsPath="../external-tickets"\n')
    const project = { id: 'external-fixture', project: { code: 'MDT', path: projectPath, ticketsPath: '../external-tickets' } } as Project
    const externalTicket = await new TicketService(true).getCR(project, 'MDT-262')
    expect(externalTicket?.code).toBe('MDT-262')
    expect(externalTicket?.inWorktree).toBe(true)
  })
  it('retains named unavailable-worktree evidence without pruning or accepting an incomplete floor', async () => {
    const run = (...args: string[]) => execFileSync('git', ['-C', projectPath, ...args], { stdio: 'pipe' })
    run('init')
    await ticket('MDT-258-original.md', 'MDT-258', id)
    run('add', '.')
    run('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture')
    const linked = join(root, 'unavailable')
    run('worktree', 'add', '--detach', linked)
    await rm(linked, { recursive: true })
    const inventory = await scanTicketIdentities(projectPath, 'docs/CRs', 'MDT')
    expect(inventory.minimumTicketNumber).toBe(259)
    expect(inventory.files).toHaveLength(1)
    expect(inventory.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ cause: 'worktree_unavailable', filePath: 'worktree-1/docs/CRs', nextAction: expect.stringContaining('prune') })]))
    expect(() => assertSafeTicketInventory(inventory)).toThrow('worktree-1/docs/CRs')
    expect(run('worktree', 'list', '--porcelain').toString()).toContain(linked)
  })
})

async function observationFixture(count = 130) {
  const stateRoot = join(root, 'observation-config')
  const state = new ProjectStateStore({ rootDir: stateRoot, profile: resolveTrustedServiceProfile({ operatorOrigins: [] }) })
  await state.write('fixture', { version: CLOUD_SYNC_CONNECTION_VERSION, state: 'enabled', cloudProjectId: 'cloud-fixture', serviceOrigin: DISTRIBUTION_CLOUD_SYNC_ORIGINS[0] })
  const identities = new Map<number, string>()
  for (let number = 1; number <= count; number++) {
    const creationId = randomUUID()
    identities.set(number, creationId)
    const code = `MDT-${String(number).padStart(3, '0')}`
    await ticket(`${code}-fixture.md`, code, creationId)
  }
  const getClaim = jest.fn(async (request: { ticketNumber: number }): Promise<TicketClaimResponse> => ({ protocolVersion: 2, ticketNumber: request.ticketNumber, creationId: identities.get(request.ticketNumber)!, reservationId: `r-${request.ticketNumber}`, state: 'acknowledged' }))
  const reserve = jest.fn(async () => {
    throw new Error('Observation must not reserve')
  })
  const acknowledge = jest.fn(async () => {
    throw new Error('Observation must not acknowledge')
  })
  let credential = 'same-principal-token'
  const service = new TicketService(true, { stateStoreRoot: stateRoot, nonInteractiveCredentialProvider: { resolve: async () => ({ kind: 'human', cfAccessToken: credential }) }, coordinatorFactory: () => ({ reserve, acknowledge, getClaim }) })
  const project = { id: 'fixture', project: { code: 'MDT', path: projectPath, ticketsPath: 'docs/CRs' } } as Project
  return { service, project, getClaim, reserve, acknowledge, state, identities, changeCredential: () => {
    credential = 'different-principal-token'
  } }
}

describe('review: bounded observations retain useful verified evidence', () => {
  it('retains verification outside the rotating window and eventually covers all130 real files', async () => {
    const fixture = await observationFixture()
    const first = await fixture.service.observeTicketIdentities(fixture.project)
    const verified = first.filter(value => value.state === 'verified')
    expect(verified).toHaveLength(64)
    expect(verified[0]).toMatchObject({ lastVerifiedAt: expect.any(String), stale: false })
    const second = await fixture.service.observeTicketIdentities(fixture.project)
    for (const value of verified)
      expect(second.find(current => current.filePath === value.filePath)).toMatchObject({ state: 'verified', lastVerifiedAt: Reflect.get(value, 'lastVerifiedAt'), stale: false })
    const third = await fixture.service.observeTicketIdentities(fixture.project)
    expect(third.filter(value => value.state === 'verified')).toHaveLength(130)
    expect(fixture.getClaim).toHaveBeenCalledTimes(192)
    expect(fixture.reserve).not.toHaveBeenCalled()
    expect(fixture.acknowledge).not.toHaveBeenCalled()
  })
  it('invalidates unchanged-window evidence on credential and binding changes', async () => {
    const fixture = await observationFixture()
    const first = await fixture.service.observeTicketIdentities(fixture.project)
    expect(first.filter(value => value.state === 'verified')).toHaveLength(64)
    fixture.changeCredential()
    const next = await fixture.service.observeTicketIdentities(fixture.project)
    expect(next.filter(value => value.state === 'verified')).toHaveLength(64)
    await fixture.state.write('fixture', { version: CLOUD_SYNC_CONNECTION_VERSION, state: 'enabled', cloudProjectId: 'different-cloud-project', serviceOrigin: DISTRIBUTION_CLOUD_SYNC_ORIGINS[0] })
    const changed = await fixture.service.observeTicketIdentities(fixture.project)
    expect(changed.filter(value => value.state === 'verified')).toHaveLength(64)
  })
  it('invalidates changed file content, copied identity and observed authorization failure', async () => {
    const fixture = await observationFixture()
    const first = await fixture.service.observeTicketIdentities(fixture.project)
    const verified = first.find(value => value.state === 'verified')!
    await writeFile(join(projectPath, verified.filePath), `${await readFile(join(projectPath, verified.filePath), 'utf8')}\nChanged body\n`)
    const second = await fixture.service.observeTicketIdentities(fixture.project)
    expect(second.find(value => value.filePath === verified.filePath)?.state).toBe('verification_pending')
    fixture.getClaim.mockRejectedValueOnce(new CoordinatorError('forbidden'))
    const denied = await fixture.service.observeTicketIdentities(fixture.project)
    expect(denied.some(value => value.state === 'verified')).toBe(false)
    expect(fixture.getClaim.mock.calls.length).toBe(129)
    const number = Number(verified.code.split('-')[1])
    await ticket(`${verified.code}-copy.md`, verified.code, fixture.identities.get(number))
    const conflict = await fixture.service.observeTicketIdentities(fixture.project)
    expect(conflict.filter(value => value.code === verified.code).every(value => value.state === 'conflict')).toBe(true)
  })
})

it('real shared watcher classification uses only background credentials and read-only claims', async () => {
  const stateRoot = join(root, 'config')
  await new ProjectStateStore({ rootDir: stateRoot, profile: resolveTrustedServiceProfile({ operatorOrigins: [] }) }).write('fixture', { version: CLOUD_SYNC_CONNECTION_VERSION, state: 'enabled', cloudProjectId: 'cloud-fixture', serviceOrigin: DISTRIBUTION_CLOUD_SYNC_ORIGINS[0] })
  await ticket('MDT-258-original.md', 'MDT-258', id)
  await ticket('MDT-259-legacy.md', 'MDT-259')
  const foreground = jest.fn(async () => {
    throw new Error('Interactive credentials must never be resolved')
  })
  const reserve = jest.fn(async () => {
    throw new Error('Observation cannot reserve')
  })
  const acknowledge = jest.fn(async () => {
    throw new Error('Observation cannot acknowledge')
  })
  const getClaim = jest.fn(async (_request: { ticketNumber: number }) => claim('acknowledged'))
  const service = new TicketService(true, { stateStoreRoot: stateRoot, credentialProvider: { resolve: foreground }, nonInteractiveCredentialProvider: { resolve: async () => ({ kind: 'human', cfAccessToken: 'fixture' }) }, coordinatorFactory: () => ({ reserve, acknowledge, getClaim }) })
  const project = { id: 'fixture', project: { code: 'MDT', path: projectPath, ticketsPath: 'docs/CRs' } } as Project
  const diagnostics = await service.observeTicketIdentities(project)
  expect(diagnostics.find(value => value.code === 'MDT-258')?.state).toBe('verified')
  expect(diagnostics.find(value => value.code === 'MDT-259')?.state).toBe('verification_pending')
  expect(getClaim).toHaveBeenCalledTimes(1)
  expect(foreground).not.toHaveBeenCalled()
  expect(reserve).not.toHaveBeenCalled()
  expect(acknowledge).not.toHaveBeenCalled()
  for (const i of Array.from({ length: 65 }, (_, index) => index))
    await ticket(`MDT-${300 + i}-bounded.md`, `MDT-${300 + i}`, randomUUID())
  getClaim.mockClear()
  await service.observeTicketIdentities(project)
  expect(getClaim.mock.calls.length).toBeLessThanOrEqual(64)
  await service.observeTicketIdentities(project)
  expect(new Set(getClaim.mock.calls.map(([request]) => request.ticketNumber)).size).toBe(66)
})
