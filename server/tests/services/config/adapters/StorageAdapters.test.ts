import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { describe, expect, it } from '@jest/globals'
import { GlobalConfigStorageAdapter } from '../../../../services/config/adapters/GlobalConfigStorageAdapter.js'
import { ProjectConfigStorageAdapter } from '../../../../services/config/adapters/ProjectConfigStorageAdapter.js'
import { UserConfigStorageAdapter } from '../../../../services/config/adapters/UserConfigStorageAdapter.js'

describe('scope storage adapters', () => {
  let configDir: string

  beforeEach(async () => {
    configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt168-cfg-'))
  })

  afterEach(async () => {
    await fs.rm(configDir, { recursive: true, force: true })
  })

  describe('GlobalConfigStorageAdapter', () => {
    it('reads tolerant defaults when file missing', async () => {
      const adapter = new GlobalConfigStorageAdapter(configDir)
      const config = await adapter.read()
      expect(config.links.enableAutoLinking).toBe(true)
    })

    it('writes atomically and preserves unrelated fields', async () => {
      // seed with a value to preserve
      await fs.writeFile(path.join(configDir, 'config.toml'), '[links]\nenableTicketLinks = true\n', 'utf8')
      const adapter = new GlobalConfigStorageAdapter(configDir)
      await adapter.write((current) => {
        // mutate one field, preserve the rest
        return { ...current, links: { ...current.links, enableDocumentLinks: false } }
      })
      const reread = await adapter.read()
      // preserved
      expect(reread.links.enableTicketLinks).toBe(true)
      // mutated
      expect(reread.links.enableDocumentLinks).toBe(false)
    })

    it('writes via temp-then-rename (no partial file left on success)', async () => {
      const adapter = new GlobalConfigStorageAdapter(configDir)
      await adapter.write(c => ({ ...c, links: { ...c.links, linkValidation: true } }))
      const files = await fs.readdir(configDir)
      // no leftover .tmp files
      expect(files.some(f => f.endsWith('.tmp'))).toBe(false)
      expect(files).toContain('config.toml')
    })
  })

  describe('UserConfigStorageAdapter', () => {
    it('reads tolerant defaults when missing and writes atomically', async () => {
      const adapter = new UserConfigStorageAdapter(configDir)
      expect((await adapter.read()).ui.projectSelector.visibleCount).toBe(7)
      await adapter.write(c => ({
        ...c,
        ui: { ...c.ui, projectSelector: { ...c.ui.projectSelector, visibleCount: 12 } },
      }))
      expect((await adapter.read()).ui.projectSelector.visibleCount).toBe(12)
    })
  })

  describe('ProjectConfigStorageAdapter', () => {
    it('reads tolerant default when missing and writes preserving siblings', async () => {
      const adapter = new ProjectConfigStorageAdapter(configDir)
      const read = await adapter.read()
      expect(read.project).toBeDefined()
      // seed with sibling field
      await fs.writeFile(path.join(configDir, '.mdt-config.toml'), '[project]\nname = "KeepMe"\ncode = "TST"\nid = "abc"\n', 'utf8')
      await adapter.write(current => ({
        ...current,
        project: { ...current.project, description: 'added' } as typeof current.project,
      }))
      const reread = await adapter.read()
      expect(reread.project?.name).toBe('KeepMe')
      expect(reread.project?.description).toBe('added')
    })
  })
})
