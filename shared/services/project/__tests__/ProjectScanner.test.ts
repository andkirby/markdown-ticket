/**
 * Tests for ProjectScanner project ID validation
 *
 * Tests that:
 * 1. Projects with matching project.id and directory name are included
 * 2. Projects with mismatched project.id are excluded (e.g., git worktrees)
 * 3. Projects without project.id use directory name as ID
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ProjectScanner } from '../ProjectScanner'

describe('ProjectScanner - Project ID Validation', () => {
  const testBaseDir = join(process.cwd(), 'tmp-test-scanner')
  let scanner: ProjectScanner

  beforeAll(() => {
    // Clean up any existing test directory from previous runs
    if (existsSync(testBaseDir)) {
      try {
        rmSync(testBaseDir, { recursive: true, force: true })
      }
      catch {
        // Ignore cleanup errors
      }
    }
    // Create fresh test base directory
    mkdirSync(testBaseDir, { recursive: true })
    scanner = new ProjectScanner(true) // quiet mode
  })

  // Use unique directory names per test to avoid conflicts
  let testCounter = 0
  function getTestDir(suffix: string): string {
    return `test-${testCounter}-${suffix}`
  }

  beforeEach(() => {
    testCounter++
  })

  afterAll(() => {
    // Clean up test base directory
    if (existsSync(testBaseDir)) {
      try {
        rmSync(testBaseDir, { recursive: true, force: true })
      }
      catch {
        // Ignore cleanup errors
      }
    }
  })

  function createProjectConfig(dirName: string, configContent: string): string {
    const projectPath = join(testBaseDir, dirName)
    if (!existsSync(projectPath)) {
      mkdirSync(projectPath, { recursive: true })
    }
    const configPath = join(projectPath, '.mdt-config.toml')
    writeFileSync(configPath, configContent, 'utf8')
    return projectPath
  }

  function cleanupProject(dirName: string): void {
    const projectPath = join(testBaseDir, dirName)
    if (existsSync(projectPath)) {
      try {
        rmSync(projectPath, { recursive: true, force: true })
      }
      catch {
        // Ignore cleanup errors
      }
    }
  }

  describe('project.id validation', () => {
    it('should include project when project.id matches directory name', () => {
      // Create project with matching ID and directory name
      const dirName = getTestDir('valid-match')
      createProjectConfig(dirName, `
[project]
id = "${dirName}"
name = "Valid Match Project"
code = "VALID"
`)

      const discovered = scanner.autoDiscoverProjects([testBaseDir])

      // Should discover the project since ID matches directory name
      expect(discovered).toHaveLength(1)
      expect(discovered[0].id).toBe(dirName)
      expect(discovered[0].project.code).toBe('VALID')

      // Cleanup
      cleanupProject(dirName)
    })

    it('should exclude project when project.id does not match directory name', () => {
      // Create project with mismatched ID (simulating git worktree)
      const dirName = getTestDir('mismatch-id')
      createProjectConfig(dirName, `
[project]
id = "different-id"
name = "Mismatch ID Project"
code = "MISMATCH"
`)

      const discovered = scanner.autoDiscoverProjects([testBaseDir])

      // Should NOT discover the project since ID doesn't match directory name
      expect(discovered).toHaveLength(0)

      // Cleanup
      cleanupProject(dirName)
    })

    it('should use directory name as ID when project.id is not set', () => {
      // Create project without explicit ID
      const dirName = getTestDir('no-id-project')
      createProjectConfig(dirName, `
[project]
name = "No ID Project"
code = "NOID"
`)

      const discovered = scanner.autoDiscoverProjects([testBaseDir])

      // Should discover the project using directory name as ID
      expect(discovered).toHaveLength(1)
      expect(discovered[0].id).toBe(dirName)
      expect(discovered[0].project.code).toBe('NOID')

      // Cleanup
      cleanupProject(dirName)
    })

    it('should handle mix of valid and invalid projects', () => {
      // Create multiple projects
      const validDir = getTestDir('valid-match')
      const mismatchDir = getTestDir('mismatch-id')
      const noIdDir = getTestDir('no-id-project')

      createProjectConfig(validDir, `
[project]
id = "${validDir}"
name = "Valid Project"
code = "VALID"
`)

      createProjectConfig(mismatchDir, `
[project]
id = "different-id"
name = "Mismatch Project"
code = "MISMATCH"
`)

      createProjectConfig(noIdDir, `
[project]
name = "No ID Project"
code = "NOID"
`)

      const discovered = scanner.autoDiscoverProjects([testBaseDir])

      // Should only discover projects with matching or no ID
      expect(discovered).toHaveLength(2)
      const projectIds = discovered.map(p => p.id).sort()
      expect(projectIds).toEqual([noIdDir, validDir])

      // Cleanup
      cleanupProject(validDir)
      cleanupProject(mismatchDir)
      cleanupProject(noIdDir)
    })
  })

  describe('git worktree exclusion', () => {
    it('should exclude git worktree projects with mismatched IDs', () => {
      // Simulate a git worktree scenario where directory name is worktree name
      // but config points to original project
      const dirName = getTestDir('feature-branch-worktree')
      createProjectConfig(dirName, `
[project]
id = "main-project"
name = "Main Project"
code = "MAIN"
`)

      const discovered = scanner.autoDiscoverProjects([testBaseDir])

      // Worktree should be excluded since ID doesn't match directory
      expect(discovered).toHaveLength(0)
      expect(discovered.find(p => p.id === 'main-project')).toBeUndefined()

      // Cleanup
      cleanupProject(dirName)
    })
  })

  describe('backward compatibility', () => {
    it('should work with legacy projects without project.id', () => {
      // Legacy project config format (no id field)
      const dirName = getTestDir('legacy-project')
      createProjectConfig(dirName, `
[project]
name = "Legacy Project"
code = "LEGACY"
`)

      const discovered = scanner.autoDiscoverProjects([testBaseDir])

      // Should discover using directory name as ID
      expect(discovered).toHaveLength(1)
      expect(discovered[0].id).toBe(dirName)
      expect(discovered[0].project.code).toBe('LEGACY')

      // Cleanup
      cleanupProject(dirName)
    })

    it('should handle projects with minimal config (code and name)', () => {
      const dirName = getTestDir('minimal-project')
      createProjectConfig(dirName, `
[project]
name = "Minimal Project"
code = "MINIMAL"
`)

      const discovered = scanner.autoDiscoverProjects([testBaseDir])

      // Should discover using directory name as ID
      expect(discovered).toHaveLength(1)
      expect(discovered[0].id).toBe(dirName)
      expect(discovered[0].project.code).toBe('MINIMAL')

      // Cleanup
      cleanupProject(dirName)
    })
  })
})
