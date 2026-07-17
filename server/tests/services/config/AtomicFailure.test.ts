import type { StorageAdapterResolver } from '../../../services/config/ConfigApplicationService.js'
import type { ConfigStorageAdapter } from '../../../services/config/types.js'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { describe, expect, it } from '@jest/globals'
import { GlobalConfigStorageAdapter } from '../../../services/config/adapters/GlobalConfigStorageAdapter.js'
import {
  ConfigApplicationService,
  ConfigValidationError,

} from '../../../services/config/ConfigApplicationService.js'

/**
 * Atomic-failure tests (MDT-168 Edge-1, C-3): a rejected request leaves every
 * target file unchanged. No partial application.
 */
describe('atomic failure — no partial application', () => {
  let configDir: string

  beforeEach(async () => {
    configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt168-atomic-'))
  })

  afterEach(async () => {
    await fs.rm(configDir, { recursive: true, force: true })
  })

  it('an invalid selector leaves the config file untouched', async () => {
    const configPath = path.join(configDir, 'config.toml')
    const original = '[links]\nenableTicketLinks = true\n'
    await fs.writeFile(configPath, original, 'utf8')

    const adapter = new GlobalConfigStorageAdapter(configDir)
    const resolver: StorageAdapterResolver = { resolve: () => adapter as unknown as ConfigStorageAdapter<unknown> }
    const service = new ConfigApplicationService({ adapterResolver: resolver })

    // attempt an invalid write
    await expect(service.applyConfig('links.enableTicketLinks', 'not-a-boolean')).rejects.toThrow(ConfigValidationError)

    // file content unchanged
    const after = await fs.readFile(configPath, 'utf8')
    expect(after).toBe(original)
  })

  it('a successful write of one selector does not corrupt unrelated fields', async () => {
    const configPath = path.join(configDir, 'config.toml')
    await fs.writeFile(configPath, '[links]\nenableTicketLinks = true\nenableDocumentLinks = true\n', 'utf8')

    const adapter = new GlobalConfigStorageAdapter(configDir)
    const resolver: StorageAdapterResolver = { resolve: () => adapter as unknown as ConfigStorageAdapter<unknown> }
    const service = new ConfigApplicationService({ adapterResolver: resolver })

    await service.applyConfig('links.enableTicketLinks', false)
    const reread = await adapter.read()
    // mutated
    expect(reread.links.enableTicketLinks).toBe(false)
    // sibling preserved
    expect(reread.links.enableDocumentLinks).toBe(true)
  })
})
