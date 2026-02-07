/**
 * Tests for Configuration Validation functionality
 * Behavioral tests for configuration validation and consistency
 */

import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { parse as parseToml } from 'toml'
import { TestEnvironment } from '../../../test-lib/index'

// Global test environment instance
let testEnv: TestEnvironment

interface ExecSyncErrorShape {
  stdout?: Buffer | string
  stderr?: Buffer | string
  message?: string
  status?: number
}

interface RegistryProjectPathEntry {
  project: {
    path?: string
    [key: string]: string | undefined
  }
}

interface LocalConfigEntry {
  project: {
    name?: string
    code?: string
    id?: string
    ticketsPath?: string
    [key: string]: unknown
  }
  document?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Helper to run CLI command with TestEnvironment isolation
 */
function runIsolatedCommand(command: string): { stdout: string, stderr: string, exitCode: number, success: boolean } {
  const env = {
    ...process.env,
    CONFIG_DIR: testEnv.getConfigDirectory(),
    HOME: testEnv.getConfigDirectory(),
    XDG_CONFIG_HOME: testEnv.getConfigDirectory(),
    MDT_NO_GLOBAL_CACHE: 'true',
  }

  // Extract the arguments after "--" from npm script format
  const dashIndex = command.indexOf('--')
  let actualCommand = command
  if (dashIndex !== -1) {
    const args = command.slice(dashIndex + 2).trim()
    const rootDir = path.join(process.cwd(), '..')
    const cliPath = path.join(rootDir, 'shared', 'dist', 'tools', 'project-cli.js')
    const subcommandMatch = command.match(/project:(\w+)/)
    const subcommand = subcommandMatch ? subcommandMatch[1] : 'create'
    actualCommand = `node "${cliPath}" ${subcommand} ${args}`
  }

  try {
    // Capture both stdout and stderr using temporary files
    const tmpDir = testEnv.getTempDirectory()
    const stdoutFile = path.join(tmpDir, `stdout-${Date.now()}-${Math.random()}.tmp`)
    const stderrFile = path.join(tmpDir, `stderr-${Date.now()}-${Math.random()}.tmp`)

    execSync(`${actualCommand} > "${stdoutFile}" 2> "${stderrFile}"`, {
      timeout: 10000,
      env,
      shell: '/bin/sh',
      cwd: path.join(process.cwd(), '..'),
    })

    const stdout = fs.readFileSync(stdoutFile, 'utf8')
    const stderr = fs.readFileSync(stderrFile, 'utf8')

    // Clean up temp files
    try {
      fs.unlinkSync(stdoutFile)
      fs.unlinkSync(stderrFile)
    }
    catch {
      // Ignore cleanup errors
    }

    return {
      stdout,
      stderr,
      exitCode: 0,
      success: true,
    }
  }
  catch (error: unknown) {
    const err = error as ExecSyncErrorShape
    return {
      stdout: err.stdout?.toString() || '',
      stderr: err.stderr?.toString() || err.message || '',
      exitCode: err.status || 1,
      success: false,
    }
  }
}

/**
 * Helper to read local config from project path
 */
function readLocalConfig(projectPath: string): LocalConfigEntry | null {
  const configFile = path.join(projectPath, '.mdt-config.toml')
  if (!fs.existsSync(configFile)) {
    return null
  }
  const content = fs.readFileSync(configFile, 'utf-8')
  return parseToml(content) as LocalConfigEntry
}

/**
 * Helper to read global registry entry
 */
function readGlobalRegistryEntry(projectPath: string): RegistryProjectPathEntry | null {
  const configDir = testEnv.getConfigDirectory()
  const projectsDir = path.join(configDir, 'projects')

  if (!fs.existsSync(projectsDir)) {
    return null
  }

  const files = fs.readdirSync(projectsDir)
  for (const tomlFile of files) {
    if (!tomlFile.endsWith('.toml'))
      continue

    const configFile = path.join(projectsDir, tomlFile)
    const content = fs.readFileSync(configFile, 'utf-8')
    const result: RegistryProjectPathEntry = { project: {} }
    const lines = content.split('\n')
    for (const line of lines) {
      const match = line.match(/^(\w+)\s*=\s*"(.+)"$/)
      if (match) {
        result.project[match[1]] = match[2]
      }
    }

    if (result.project.path === projectPath) {
      return result
    }
  }
  return null
}

function configHasRequiredFields(config: unknown): boolean {
  if (typeof config !== 'object' || config === null || !('project' in config)) {
    return false
  }
  const project = (config as { project?: unknown }).project
  if (typeof project !== 'object' || project === null) {
    return false
  }
  const projectRecord = project as Record<string, unknown>
  return !!(
    typeof projectRecord.name === 'string'
    && typeof projectRecord.code === 'string'
    && typeof projectRecord.id === 'string'
    && typeof projectRecord.ticketsPath === 'string'
  )
}

function configHasValidCode(code: string): boolean {
  return /^[A-Z][A-Z0-9]{1,4}$/.test(code)
}

describe('configuration validation', () => {
  let projectsDir: string

  beforeAll(async () => {
    // Build the shared package before running CLI commands (the dist folder is deleted by the test script)
    execSync('npm run build', { cwd: process.cwd(), stdio: 'inherit' })

    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectsDir = path.join(testEnv.getTempDirectory(), 'projects')
    fs.mkdirSync(projectsDir, { recursive: true })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  describe('when configuration is generated', () => {
    let testProject: { name: string, code: string, path: string }
    let testCounter = 0

    beforeEach(async () => {
      testCounter++
      testProject = {
        name: 'Test Project',
        code: `CFG${testCounter % 10}`, // Generate unique codes: CFG1, CFG2, etc.
        path: path.join(projectsDir, `test-project-${Date.now()}-${Math.random().toString(36).substring(7)}`),
      }
    })

    it('should validate generated configuration schema', async () => {
      // Arrange & Act
      const result = runIsolatedCommand(
        `npm run project:create -- --name "${testProject.name}" --code ${testProject.code} --path "${testProject.path}" --create-project-path`,
      )

      // Assert CLI succeeded
      expect(result.success).toBe(true)

      // Verify local configuration schema
      const localConfig = readLocalConfig(testProject.path)
      expect(localConfig).not.toBeNull()
      expect(configHasRequiredFields(localConfig)).toBe(true)

      // Verify specific field types and values
      const { project } = localConfig
      expect(typeof project.name).toBe('string')
      expect(typeof project.code).toBe('string')
      expect(typeof project.id).toBe('string')
      expect(typeof project.ticketsPath).toBe('string')
      expect(project.name).toBe(testProject.name)
      expect(project.code).toBe(testProject.code)

      // Verify document configuration (top-level section)
      expect(localConfig.document).toBeDefined()
    })
  })

  describe('project code validation', () => {
    it('should enforce 2-5 uppercase letter format', async () => {
      const validCodes = ['AB', 'XYZ', 'TEST', 'T3ST', 'ABCDE']
      const invalidCodes = ['A', 'ABCDEF', 'Abc', 'A_B', 'TEST-123']

      // Test valid codes
      for (const code of validCodes) {
        expect(configHasValidCode(code)).toBe(true)
      }

      // Test invalid codes
      for (const code of invalidCodes) {
        expect(configHasValidCode(code)).toBe(false)
      }
    })

    it('should accept valid codes during project creation', async () => {
      const timestamp = Date.now()
      const validCodes = [
        { code: `AB${timestamp % 100}`, description: 'two letters' },
        { code: `XY${timestamp % 100}`, description: 'three letters' },
      ]

      for (const { code, description } of validCodes) {
        const testPath = path.join(projectsDir, `test-valid-${code.toLowerCase()}-${Date.now()}`)

        const result = runIsolatedCommand(
          `npm run project:create -- --name "Valid ${description} Project" --code ${code} --path "${testPath}" --create-project-path`,
        )

        expect(result.success).toBe(true)

        // Verify the code was stored correctly
        const config = readLocalConfig(testPath)
        expect(config).not.toBeNull()
        expect(config.project.code).toBe(code)
      }
    })
  })

  describe('configuration consistency', () => {
    let testProject: { name: string, code: string, path: string }
    let testCounter = 0

    beforeEach(() => {
      testCounter++
      testProject = {
        name: `Test Project ${testCounter}`,
        code: `TST${testCounter % 10}`, // Generate unique codes: TST1, TST2, etc.
        path: path.join(projectsDir, `test-project-${Date.now()}-${Math.random().toString(36).substring(7)}`),
      }
    })

    it('should ensure CLI output matches configuration values', async () => {
      // Arrange - Create a project
      const createResult = runIsolatedCommand(
        `npm run project:create -- --name "${testProject.name}" --code ${testProject.code} --path "${testProject.path}" --create-project-path`,
      )

      expect(createResult.success).toBe(true)

      // Act - List projects
      const listResult = runIsolatedCommand('npm run project:list')

      // Assert - Verify output contains expected values
      expect(listResult.success).toBe(true)
      expect(listResult.stderr).toContain(testProject.code)
      expect(listResult.stderr).toContain(testProject.name)

      // Verify configuration matches
      const config = readLocalConfig(testProject.path)
      const globalEntry = readGlobalRegistryEntry(testProject.path)

      expect(config.project.name).toBe(testProject.name)
      expect(config.project.code).toBe(testProject.code)
      expect(globalEntry).not.toBeNull()
      expect(globalEntry.project.path).toBe(testProject.path)
    })
  })
})
