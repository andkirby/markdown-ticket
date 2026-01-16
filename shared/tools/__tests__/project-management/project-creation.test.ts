/**
 * Tests for Project Creation functionality
 * Behavioral tests for project creation and validation
 */

import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { TestEnvironment } from '../../../test-lib/index'
import {
  projectExists,
  readLocalConfig,
} from './helpers/test-utils'

// Global test environment instance
let testEnv: TestEnvironment

/**
 * Helper to run CLI command with TestEnvironment isolation
 */
function runIsolatedCommand(command: string): { stdout: string, stderr: string, exitCode: number } {
  const env = {
    ...process.env,
    CONFIG_DIR: testEnv.getConfigDirectory(),
    HOME: testEnv.getConfigDirectory(),
    XDG_CONFIG_HOME: testEnv.getConfigDirectory(),
    MDT_NO_GLOBAL_CACHE: 'true',
  }

  // The command passed in is like "npm run project:create -- --name X --code Y --path Z"
  // We need to convert it to run the CLI directly
  // Extract the arguments after "--"
  const dashIndex = command.indexOf('--')
  let actualCommand = command
  if (dashIndex !== -1) {
    const args = command.slice(dashIndex + 2).trim()
    // From shared/ directory, root is ../
    const rootDir = path.join(process.cwd(), '..')
    const cliPath = path.join(rootDir, 'shared', 'dist', 'tools', 'project-cli.js')
    // Parse the subcommand from npm script name (project:create -> create, project:list -> list)
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
      cwd: path.join(process.cwd(), '..'), // Go from shared to project root
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
    }
  }
  catch (error: any) {
    return {
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || error.message,
      exitCode: error.status || 1,
    }
  }
}

describe('project:create', () => {
  let projectsDir: string

  // Helper to read global registry from test environment
  const readGlobalRegistryEntry = (projectPath: string): any => {
    const configDir = testEnv.getConfigDirectory()
    const projectsDir = path.join(configDir, 'projects')

    // The registry uses the project ID, not the code
    // Look for the entry that matches our path
    if (!fs.existsSync(projectsDir)) {
      return null
    }

    const files = fs.readdirSync(projectsDir)
    for (const tomlFile of files) {
      if (!tomlFile.endsWith('.toml'))
        continue

      const configFile = path.join(projectsDir, tomlFile)
      const content = fs.readFileSync(configFile, 'utf-8')
      const result: any = { project: {} }
      const lines = content.split('\n')
      for (const line of lines) {
        const match = line.match(/^(\w+)\s*=\s*"(.+)"$/)
        if (match) {
          result.project[match[1]] = match[2]
        }
      }

      // Return the entry that matches our path
      if (result.project.path === projectPath) {
        return result
      }
    }
    return null
  }

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

  // Test projects with dynamic paths
  const TEST_PROJECTS = {
    valid: {
      name: 'Test Project',
      code: 'TEST',
      path: '', // Will be set in beforeEach
    },
    invalidCodes: {
      tooShort: 'T',
      tooLong: 'TEST123',
      startsWithNumber: '3TEST',
      withSpecial: 'TEST-123',
    },
    validButEdgeCase: {
      withNumbers: 'T3ST', // This is actually valid per validation rules
    },
    invalidPaths: {
      nonExistent: '/tmp/does-not-exist-12345',
    },
  }

  describe('when valid parameters are provided', () => {
    let testCounter = 0
    const testProject = TEST_PROJECTS.valid

    beforeEach(() => {
      testCounter++
      // Create unique project path and code in test environment
      testProject.path = path.join(projectsDir, `test-project-${Date.now()}-${Math.random().toString(36).substring(7)}`)
      testProject.code = `TST${testCounter}`
    })

    it('should create local .mdt-config.toml with required fields', () => {
      // Act
      const result = runIsolatedCommand(
        `npm run project:create -- --name "${testProject.name}" --code ${testProject.code} --path "${testProject.path}" --create-project-path`,
      )

      // Assert
      expect(result.exitCode).toBe(0)
      expect(result.stderr).toContain('successfully')

      // Verify local config was created
      const config = readLocalConfig(testProject.path)
      expect(config).not.toBeNull()
      expect(config.project.name).toBe(testProject.name)
      expect(config.project.code).toBe(testProject.code)

      // Verify project directory was created
      expect(projectExists(testProject.path)).toBe(true)
    })

    it('should create global registry entry with minimal reference', () => {
      // Act - Create project with a different code to avoid conflicts
      const result = runIsolatedCommand(
        `npm run project:create -- --name "${testProject.name}" --code GLB${testCounter} --path "${testProject.path}" --create-project-path`,
      )

      // Assert
      expect(result.exitCode).toBe(0)

      // Verify global registry entry
      const globalEntry = readGlobalRegistryEntry(testProject.path)
      expect(globalEntry).not.toBeNull()
      expect(globalEntry.project.path).toBe(testProject.path)

      // Global entry should have minimal fields (not full project details)
      expect(globalEntry.project.name).toBeUndefined()
      expect(globalEntry.project.code).toBeUndefined()
    })
  })

  describe('when invalid project code is provided', () => {
    it.each([
      ['too short (1 char)', TEST_PROJECTS.invalidCodes.tooShort],
      ['too long (>5 chars)', TEST_PROJECTS.invalidCodes.tooLong],
      ['starts with number', TEST_PROJECTS.invalidCodes.startsWithNumber],
      ['contains special characters', TEST_PROJECTS.invalidCodes.withSpecial],
    ])('should reject %s code: %s', (description, invalidCode) => {
      const testPath = path.join(projectsDir, 'invalid-test')

      // Act
      const result = runIsolatedCommand(
        `npm run project:create -- --name "Test Project" --code ${invalidCode} --path "${testPath}" --create-project-path`,
      )

      // Assert
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toMatch(/validation|code|format/i)

      // Verify no files were created
      expect(projectExists(testPath)).toBe(false)
    })
  })

  describe('when invalid path is provided', () => {
    it('should reject non-existent absolute path', () => {
      const nonExistentPath = TEST_PROJECTS.invalidPaths.nonExistent

      // Act
      const result = runIsolatedCommand(
        `npm run project:create -- --name "Test Project" --code TEST --path "${nonExistentPath}"`,
      )

      // Assert
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toMatch(/path|exist/i)
    })
  })
})
