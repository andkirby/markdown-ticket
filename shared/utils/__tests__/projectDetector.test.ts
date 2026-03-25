/**
 * Tests for projectDetector utility
 * MDT-145: Shared project detection from nested directories
 *
 * These tests verify root-up .mdt-config.toml search behavior
 * and explicit no-project result handling.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { detectProjectContext, type ProjectDetectionResult } from '../projectDetector'

describe('projectDetector', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdt-detector-test-'))
    originalCwd = process.cwd()
  })

  afterEach(() => {
    process.chdir(originalCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('detectProjectContext', () => {
    it('should return no-project result when no .mdt-config.toml exists', () => {
      process.chdir(tempDir)

      const result = detectProjectContext()

      expect(result.found).toBe(false)
      expect(result.configPath).toBeNull()
      expect(result.projectRoot).toBeNull()
    })

    it('should find .mdt-config.toml in current directory', () => {
      const configContent = `
name = "Test Project"
code = "TEST"
ticketsPath = "docs/CRs"
`
      fs.writeFileSync(path.join(tempDir, '.mdt-config.toml'), configContent)
      process.chdir(tempDir)

      const result = detectProjectContext()

      expect(result.found).toBe(true)
      // Use realpath to handle macOS /var -> /private/var normalization
      expect(fs.realpathSync(result.configPath!)).toBe(fs.realpathSync(path.join(tempDir, '.mdt-config.toml')))
      expect(fs.realpathSync(result.projectRoot!)).toBe(fs.realpathSync(tempDir))
    })

    it('should find .mdt-config.toml in parent directory (nested detection)', () => {
      const configContent = `
name = "Parent Project"
code = "PARENT"
ticketsPath = "docs/CRs"
`
      fs.writeFileSync(path.join(tempDir, '.mdt-config.toml'), configContent)

      const nestedDir = path.join(tempDir, 'src', 'components', 'deep')
      fs.mkdirSync(nestedDir, { recursive: true })
      process.chdir(nestedDir)

      const result = detectProjectContext()

      expect(result.found).toBe(true)
      // Use realpath to handle macOS /var -> /private/var normalization
      expect(fs.realpathSync(result.configPath!)).toBe(fs.realpathSync(path.join(tempDir, '.mdt-config.toml')))
      expect(fs.realpathSync(result.projectRoot!)).toBe(fs.realpathSync(tempDir))
    })

    it('should find nearest .mdt-config.toml when multiple exist', () => {
      // Root config
      fs.writeFileSync(path.join(tempDir, '.mdt-config.toml'), `
name = "Root Project"
code = "ROOT"
ticketsPath = "docs/CRs"
`)

      // Nested project with its own config
      const nestedProject = path.join(tempDir, 'packages', 'nested')
      fs.mkdirSync(nestedProject, { recursive: true })
      fs.writeFileSync(path.join(nestedProject, '.mdt-config.toml'), `
name = "Nested Project"
code = "NESTED"
ticketsPath = "docs/CRs"
`)

      const workDir = path.join(nestedProject, 'src')
      fs.mkdirSync(workDir, { recursive: true })
      process.chdir(workDir)

      const result = detectProjectContext()

      expect(result.found).toBe(true)
      // Use realpath to handle macOS /var -> /private/var normalization
      expect(fs.realpathSync(result.projectRoot!)).toBe(fs.realpathSync(nestedProject))
    })

    it('should search up to filesystem root', () => {
      // Create deeply nested structure with no config
      const deepDir = path.join(tempDir, 'a', 'b', 'c', 'd', 'e')
      fs.mkdirSync(deepDir, { recursive: true })
      process.chdir(deepDir)

      const result = detectProjectContext()

      // Should search all the way up without error
      expect(result.found).toBe(false)
      expect(result.configPath).toBeNull()
    })

    it('should return structured result with detection metadata', () => {
      fs.writeFileSync(path.join(tempDir, '.mdt-config.toml'), `
name = "Test Project"
code = "TEST"
ticketsPath = "docs/CRs"
`)
      process.chdir(tempDir)

      const result = detectProjectContext()

      expect(result).toMatchObject<ProjectDetectionResult>({
        found: true,
        configPath: expect.any(String),
        projectRoot: expect.any(String),
      })
    })
  })
})
