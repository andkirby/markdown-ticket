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
import { ConfigSideEffectRegistry } from '../../../services/config/ConfigSideEffectRegistry.js'

describe('ConfigApplicationService', () => {
  let configDir: string

  beforeEach(async () => {
    configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt168-app-'))
  })

  afterEach(async () => {
    await fs.rm(configDir, { recursive: true, force: true })
  })

  function makeResolver<T>(adapter: ConfigStorageAdapter<T>): StorageAdapterResolver {
    return { resolve: () => adapter as unknown as ConfigStorageAdapter<unknown> }
  }

  describe('validation order (fail-closed)', () => {
    it('rejects an unknown selector with no write', async () => {
      const adapter = new GlobalConfigStorageAdapter(configDir)
      const service = new ConfigApplicationService({ adapterResolver: makeResolver(adapter) })
      await expect(service.applyConfig('totally.unknown', true)).rejects.toThrow(ConfigValidationError)
      // no file written
      await expect(fs.readFile(path.join(configDir, 'config.toml'), 'utf8')).rejects.toThrow()
    })

    it('rejects a guarded selector routed through the scalar writer', async () => {
      const adapter = new GlobalConfigStorageAdapter(configDir)
      const service = new ConfigApplicationService({ adapterResolver: makeResolver(adapter) })
      await expect(service.applyConfig('discovery.maxDepth', 5)).rejects.toThrow(/guarded/)
    })

    it('rejects an invalid value and never converts it to a default', async () => {
      const adapter = new GlobalConfigStorageAdapter(configDir)
      const service = new ConfigApplicationService({ adapterResolver: makeResolver(adapter) })
      // discovery.autoDiscover is editable boolean; pass a string
      await expect(service.applyConfig('discovery.autoDiscover', 'yes')).rejects.toThrow(ConfigValidationError)
    })

    it('rejects a read-only selector', async () => {
      const adapter = new GlobalConfigStorageAdapter(configDir)
      const service = new ConfigApplicationService({ adapterResolver: makeResolver(adapter) })
      // project.path is read-only; resolver returns global adapter but selector check precedes
      await expect(service.applyConfig('project.path', '/x')).rejects.toThrow(/read-only/)
    })
  })

  describe('valid apply', () => {
    it('writes a valid editable selector atomically and returns effective value', async () => {
      const adapter = new GlobalConfigStorageAdapter(configDir)
      const service = new ConfigApplicationService({ adapterResolver: makeResolver(adapter) })
      const result = await service.applyConfig('discovery.autoDiscover', false)
      expect(result.selector).toBe('discovery.autoDiscover')
      expect((result.effective as { discovery: { autoDiscover: boolean } }).discovery.autoDiscover).toBe(false)
      expect(result.filePath).toBe(path.join(configDir, 'config.toml'))
    })

    it('runs side effects after a successful write', async () => {
      let ran = false
      const adapter = new GlobalConfigStorageAdapter(configDir)
      const sideEffects = new ConfigSideEffectRegistry([
        {
          name: 'discovery-refresh',
          triggers: ['global'],
          run: async () => {
            ran = true
            return { name: 'discovery-refresh', ok: true }
          },
        },
      ])
      const service = new ConfigApplicationService({ adapterResolver: makeResolver(adapter), sideEffects })
      const result = await service.applyConfig('links.enableTicketLinks', false)
      expect(ran).toBe(true)
      expect(result.sideEffects[0].ok).toBe(true)
    })

    it('reports a side-effect failure distinctly from the write success', async () => {
      const adapter = new GlobalConfigStorageAdapter(configDir)
      const sideEffects = new ConfigSideEffectRegistry([
        { name: 'broken', triggers: ['global'], run: async () => { throw new Error('boom') } },
      ])
      const service = new ConfigApplicationService({ adapterResolver: makeResolver(adapter), sideEffects })
      const result = await service.applyConfig('links.enableTicketLinks', false)
      // write succeeded (file exists, effective returned)
      expect(result.effective).toBeDefined()
      // but the side effect failed and is reported
      expect(result.sideEffects[0].ok).toBe(false)
      expect(result.sideEffects[0].message).toContain('boom')
    })
  })
})
