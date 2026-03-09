/**
 * ConfigRepository Unit Tests.
 *
 * Tests configuration parsing with focus on excludeFolders behavior.
 */

import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { ConfigRepository } from '../../repositories/ConfigRepository.js'

describe('ConfigRepository', () => {
  let tempDir: string
  let configRepository: ConfigRepository

  beforeEach(async () => {
    configRepository = new ConfigRepository()
    tempDir = await fs.mkdtemp('/tmp/config-repo-test-')
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('getConfig', () => {
    it('should return default config when no config file exists', async () => {
      const config = await configRepository.getConfig(tempDir)

      expect(config.documentPaths).toEqual([])
      expect(config.excludeFolders).toContain('docs/CRs')
      expect(config.excludeFolders).toContain('node_modules')
      expect(config.excludeFolders).toContain('.git')
      expect(config.ticketsPath).toBeNull()
    })

    it('should parse document paths from config', async () => {
      const configContent = `
[project]
name = "Test Project"
code = "TEST"
ticketsPath = "tickets"

[project.document]
paths = ["docs", "README.md"]
`
      await fs.writeFile(path.join(tempDir, '.mdt-config.toml'), configContent)

      const config = await configRepository.getConfig(tempDir)

      expect(config.documentPaths).toEqual(['docs', 'README.md'])
    })

    it('should parse excludeFolders from config', async () => {
      const configContent = `
[project]
name = "Test Project"
code = "TEST"
ticketsPath = "tickets"

[project.document]
paths = ["docs"]
excludeFolders = ["node_modules", "dist"]
`
      await fs.writeFile(path.join(tempDir, '.mdt-config.toml'), configContent)

      const config = await configRepository.getConfig(tempDir)

      expect(config.excludeFolders).toContain('node_modules')
      expect(config.excludeFolders).toContain('dist')
    })

    it('should always include ticketsPath in excludeFolders even if not explicitly listed', async () => {
      const configContent = `
[project]
name = "Test Project"
code = "TEST"
ticketsPath = "my-tickets"

[project.document]
paths = ["docs"]
excludeFolders = ["node_modules", "dist"]
`
      await fs.writeFile(path.join(tempDir, '.mdt-config.toml'), configContent)

      const config = await configRepository.getConfig(tempDir)

      // ticketsPath should be auto-added to excludeFolders
      expect(config.excludeFolders).toContain('my-tickets')
      expect(config.excludeFolders).toContain('node_modules')
      expect(config.excludeFolders).toContain('dist')
      expect(config.ticketsPath).toBe('my-tickets')
    })

    it('should not duplicate ticketsPath in excludeFolders if already present', async () => {
      const configContent = `
[project]
name = "Test Project"
code = "TEST"
ticketsPath = "tickets"

[project.document]
paths = ["docs"]
excludeFolders = ["tickets", "node_modules"]
`
      await fs.writeFile(path.join(tempDir, '.mdt-config.toml'), configContent)

      const config = await configRepository.getConfig(tempDir)

      // ticketsPath should appear only once
      const ticketsCount = config.excludeFolders.filter(f => f === 'tickets').length
      expect(ticketsCount).toBe(1)
    })

    it('should work with default ticketsPath when not configured', async () => {
      const configContent = `
[project]
name = "Test Project"
code = "TEST"

[project.document]
paths = ["docs"]
excludeFolders = ["node_modules"]
`
      await fs.writeFile(path.join(tempDir, '.mdt-config.toml'), configContent)

      const config = await configRepository.getConfig(tempDir)

      // No ticketsPath configured, so excludeFolders should just have what's configured
      expect(config.excludeFolders).toEqual(['node_modules'])
      expect(config.ticketsPath).toBeNull()
    })

    it('should handle legacy document.paths format', async () => {
      const configContent = `
[project]
name = "Test Project"
code = "TEST"

[document]
paths = ["docs", "src"]
`
      await fs.writeFile(path.join(tempDir, '.mdt-config.toml'), configContent)

      const config = await configRepository.getConfig(tempDir)

      expect(config.documentPaths).toEqual(['docs', 'src'])
    })
  })
})
