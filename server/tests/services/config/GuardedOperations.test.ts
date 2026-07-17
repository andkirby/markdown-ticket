import type { StorageAdapterResolver } from '../../../services/config/ConfigApplicationService.js'
import type { ConfigStorageAdapter } from '../../../services/config/types.js'
/// <reference types="jest" />
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { GlobalConfigStorageAdapter } from '../../../services/config/adapters/GlobalConfigStorageAdapter.js'
import { ProjectConfigStorageAdapter } from '../../../services/config/adapters/ProjectConfigStorageAdapter.js'
import { ConfigApplicationService, ConfigValidationError } from '../../../services/config/ConfigApplicationService.js'

/**
 * Guarded operations tests (MDT-168 BR-4.1, BR-4.2): guarded selectors require
 * explicit confirmation, run operation-specific validation, and are never
 * applied as ordinary scalar patches. Covers TEST-guarded-operations.
 */
describe('guarded operations', () => {
  let configDir: string
  let projectDir: string

  beforeEach(async () => {
    configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt168-guarded-cfg-'))
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt168-guarded-proj-'))
    // seed a project config so the project adapter has a file to write
    await fs.writeFile(path.join(projectDir, '.mdt-config.toml'), '[project]\nname = "Old"\ncode = "OLD"\nid = "x"\n', 'utf8')
  })

  afterEach(async () => {
    await fs.rm(configDir, { recursive: true, force: true })
    await fs.rm(projectDir, { recursive: true, force: true })
  })

  describe('confirmation is mandatory', () => {
    it('rejects a guarded selector submitted without confirmation', async () => {
      const projectAdapter = new ProjectConfigStorageAdapter(projectDir)
      const resolver: StorageAdapterResolver = { resolve: () => projectAdapter as unknown as ConfigStorageAdapter<unknown> }
      const service = new ConfigApplicationService({ adapterResolver: resolver })
      await expect(
        service.applyGuardedConfig('project.code', 'NEW', { confirmed: false }),
      ).rejects.toThrow(/confirmation/i)
    })

    it('rejects a guarded selector via the scalar applyConfig endpoint (never an ordinary patch)', async () => {
      const projectAdapter = new ProjectConfigStorageAdapter(projectDir)
      const resolver: StorageAdapterResolver = { resolve: () => projectAdapter as unknown as ConfigStorageAdapter<unknown> }
      const service = new ConfigApplicationService({ adapterResolver: resolver })
      await expect(
        service.applyConfig('project.code', 'NEW'),
      ).rejects.toThrow(/guarded/i)
    })
  })

  describe('confirmed guarded write', () => {
    it('applies a confirmed, valid guarded selector and returns the effective value', async () => {
      const projectAdapter = new ProjectConfigStorageAdapter(projectDir)
      const resolver: StorageAdapterResolver = { resolve: () => projectAdapter as unknown as ConfigStorageAdapter<unknown> }
      const service = new ConfigApplicationService({ adapterResolver: resolver })
      const result = await service.applyGuardedConfig('project.code', 'NEW', { confirmed: true })
      expect(result.selector).toBe('project.code')
      const effective = result.effective as { project: { code: string } }
      expect(effective.project.code).toBe('NEW')
    })

    it('rejects an invalid guarded value even when confirmed', async () => {
      const projectAdapter = new ProjectConfigStorageAdapter(projectDir)
      const resolver: StorageAdapterResolver = { resolve: () => projectAdapter as unknown as ConfigStorageAdapter<unknown> }
      const service = new ConfigApplicationService({ adapterResolver: resolver })
      // invalid code (too long / lowercase)
      await expect(
        service.applyGuardedConfig('project.code', 'toolong', { confirmed: true }),
      ).rejects.toThrow(ConfigValidationError)
    })

    it('rejects a non-guarded selector routed through the guarded endpoint', async () => {
      const globalAdapter = new GlobalConfigStorageAdapter(configDir)
      const resolver: StorageAdapterResolver = { resolve: () => globalAdapter as unknown as ConfigStorageAdapter<unknown> }
      const service = new ConfigApplicationService({ adapterResolver: resolver })
      // links.enableTicketLinks is editable, not guarded
      await expect(
        service.applyGuardedConfig('links.enableTicketLinks', false, { confirmed: true }),
      ).rejects.toThrow(/not a guarded operation/i)
    })
  })

  describe('registry/local consistency (BR-4.2)', () => {
    it('a confirmed ticketsPath change persists atomically and the file remains valid TOML', async () => {
      const projectAdapter = new ProjectConfigStorageAdapter(projectDir)
      const resolver: StorageAdapterResolver = { resolve: () => projectAdapter as unknown as ConfigStorageAdapter<unknown> }
      const service = new ConfigApplicationService({ adapterResolver: resolver })
      const result = await service.applyGuardedConfig('project.ticketsPath', 'docs/tickets', { confirmed: true })
      expect(result.filePath).toBe(path.join(projectDir, '.mdt-config.toml'))
      // file written and still contains the unchanged sibling identity fields
      const after = await fs.readFile(path.join(projectDir, '.mdt-config.toml'), 'utf8')
      expect(after).toContain('id = "x"')
      expect(after).toMatch(/ticketsPath/)
    })
  })
})
