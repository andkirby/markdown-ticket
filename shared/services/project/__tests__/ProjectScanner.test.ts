/**
 * Tests for ProjectScanner project ID validation
 *
 * Tests that:
 * 1. Projects with matching project.id and directory name are included
 * 2. Projects with mismatched project.id are excluded (e.g., git worktrees)
 * 3. Projects without project.id use directory name as ID
 * 4. Backward compatibility of public API (autoDiscoverProjects still returns Project[])
 * 5. New scanForDiscoveryConfigs() method returns DiscoveryConfig[]
 * 6. Helper usage via spies
 * 7. Factory usage
 */

import type { DiscoveryConfig } from '../types'
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
      expect(discovered[0].autoDiscovered).toBe(true)

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
      const validDir = getTestDir('valid-mix')
      const mismatchDir = getTestDir('mismatch-mix')
      const noIdDir = getTestDir('no-id-mix')

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

  describe('public API backward compatibility', () => {
    it('autoDiscoverProjects should return Project[] (not DiscoveryConfig[])', () => {
      const dirName = getTestDir('api-compat')
      createProjectConfig(dirName, `
[project]
name = "API Compat Project"
code = "API"
`)

      const discovered = scanner.autoDiscoverProjects([testBaseDir])

      // Should return Project objects with all required properties
      expect(discovered).toHaveLength(1)
      expect(discovered[0]).toHaveProperty('id')
      expect(discovered[0]).toHaveProperty('project')
      expect(discovered[0]).toHaveProperty('metadata')
      expect(discovered[0].project).toHaveProperty('code', 'API')
      expect(discovered[0].project).toHaveProperty('name', 'API Compat Project')
      expect(discovered[0]).toHaveProperty('autoDiscovered', true)

      // Cleanup
      cleanupProject(dirName)
    })

    it('autoDiscoverProjects should return empty array when no projects found', () => {
      // Empty test directory
      const discovered = scanner.autoDiscoverProjects([testBaseDir])
      expect(discovered).toEqual([])
      expect(Array.isArray(discovered)).toBe(true)
    })
  })

  describe('new scanForDiscoveryConfigs method', () => {
    it('should return DiscoveryConfig[] with raw configuration data', () => {
      const dirName = getTestDir('discovery-config')
      createProjectConfig(dirName, `
[project]
name = "Discovery Config Project"
code = "DISC"
`)

      const discoveryConfigs: DiscoveryConfig[] = scanner.scanForDiscoveryConfigs([testBaseDir])

      // Should return DiscoveryConfig objects
      expect(discoveryConfigs).toHaveLength(1)
      expect(discoveryConfigs[0]).toHaveProperty('config')
      expect(discoveryConfigs[0]).toHaveProperty('projectPath')
      expect(discoveryConfigs[0]).toHaveProperty('configPath')

      // Config should contain raw project configuration
      expect(discoveryConfigs[0].config).toHaveProperty('project')
      expect(discoveryConfigs[0].config.project.name).toBe('Discovery Config Project')
      expect(discoveryConfigs[0].config.project.code).toBe('DISC')

      // Paths should be correct
      expect(discoveryConfigs[0].projectPath).toContain(dirName)
      expect(discoveryConfigs[0].configPath).toContain('.mdt-config.toml')

      // Cleanup
      cleanupProject(dirName)
    })

    it('should exclude projects with mismatched IDs from DiscoveryConfig[]', () => {
      const validDir = getTestDir('valid-dc')
      const mismatchDir = getTestDir('mismatch-dc')

      createProjectConfig(validDir, `
[project]
id = "${validDir}"
name = "Valid Discovery"
code = "VALID"
`)

      createProjectConfig(mismatchDir, `
[project]
id = "other-id"
name = "Mismatch Discovery"
code = "MISMATCH"
`)

      const discoveryConfigs: DiscoveryConfig[] = scanner.scanForDiscoveryConfigs([testBaseDir])

      // Should only include valid project
      expect(discoveryConfigs).toHaveLength(1)
      expect(discoveryConfigs[0].config.project.code).toBe('VALID')

      // Cleanup
      cleanupProject(validDir)
      cleanupProject(mismatchDir)
    })

    it('should return empty array when no configs found', () => {
      const discoveryConfigs: DiscoveryConfig[] = scanner.scanForDiscoveryConfigs([testBaseDir])
      expect(discoveryConfigs).toEqual([])
    })

    it('should handle projects without ID correctly in DiscoveryConfig[]', () => {
      const dirName = getTestDir('no-id-dc')
      createProjectConfig(dirName, `
[project]
name = "No ID Discovery"
code = "NOID"
`)

      const discoveryConfigs: DiscoveryConfig[] = scanner.scanForDiscoveryConfigs([testBaseDir])

      // Should include project without ID
      expect(discoveryConfigs).toHaveLength(1)
      expect(discoveryConfigs[0].config.project.id).toBeUndefined()
      expect(discoveryConfigs[0].config.project.code).toBe('NOID')

      // Cleanup
      cleanupProject(dirName)
    })
  })

  describe('helper behavior verification', () => {
    it('should skip projects with mismatched ID regardless of other attributes', () => {
      const dirName = getTestDir('skip-mismatch')
      createProjectConfig(dirName, `
[project]
id = "totally-different-id"
name = "Skip Mismatch"
code = "SKIP"
description = "This should be skipped"
`)

      const discoveryConfigs: DiscoveryConfig[] = scanner.scanForDiscoveryConfigs([testBaseDir])

      // Should skip due to ID mismatch
      expect(discoveryConfigs).toHaveLength(0)

      // Cleanup
      cleanupProject(dirName)
    })

    it('should accept projects with matching ID', () => {
      const dirName = getTestDir('accept-match')
      createProjectConfig(dirName, `
[project]
id = "${dirName}"
name = "Accept Match"
code = "ACCEPT"
`)

      const discoveryConfigs: DiscoveryConfig[] = scanner.scanForDiscoveryConfigs([testBaseDir])

      // Should accept due to ID match
      expect(discoveryConfigs).toHaveLength(1)
      expect(discoveryConfigs[0].config.project.id).toBe(dirName)

      // Cleanup
      cleanupProject(dirName)
    })

    it('should accept projects without ID and validate via code', () => {
      const dirName = getTestDir('accept-no-id')
      createProjectConfig(dirName, `
[project]
name = "Accept No ID"
code = "NOID"
`)

      const discoveryConfigs: DiscoveryConfig[] = scanner.scanForDiscoveryConfigs([testBaseDir])

      // Should accept since no ID is set (directory name will be used)
      expect(discoveryConfigs).toHaveLength(1)
      expect(discoveryConfigs[0].config.project.id).toBeUndefined()

      // Cleanup
      cleanupProject(dirName)
    })
  })

  describe('factory behavior verification', () => {
    it('should mark all auto-discovered projects with autoDiscovered flag', () => {
      const dirName = getTestDir('factory-flag')
      createProjectConfig(dirName, `
[project]
name = "Factory Flag"
code = "FACTORY"
`)

      const projects = scanner.autoDiscoverProjects([testBaseDir])

      // Project should have autoDiscovered flag set
      expect(projects).toHaveLength(1)
      expect(projects[0].autoDiscovered).toBe(true)

      // Cleanup
      cleanupProject(dirName)
    })

    it('should include all required Project properties', () => {
      const dirName = getTestDir('factory-props')
      createProjectConfig(dirName, `
[project]
name = "Factory Props"
code = "PROPS"
description = "Test description"
`)

      const projects = scanner.autoDiscoverProjects([testBaseDir])

      // Should have all required Project properties
      expect(projects).toHaveLength(1)
      expect(projects[0]).toHaveProperty('id')
      expect(projects[0]).toHaveProperty('project')
      expect(projects[0]).toHaveProperty('metadata')
      expect(projects[0]).toHaveProperty('autoDiscovered')

      // Project sub-object should have required fields
      expect(projects[0].project).toHaveProperty('code', 'PROPS')
      expect(projects[0].project).toHaveProperty('name', 'Factory Props')
      expect(projects[0].project).toHaveProperty('description', 'Test description')
      expect(projects[0].project).toHaveProperty('path')
      expect(projects[0].project).toHaveProperty('configFile')
      expect(projects[0].project).toHaveProperty('ticketsPath')

      // Metadata should have required fields
      expect(projects[0].metadata).toHaveProperty('dateRegistered')
      expect(projects[0].metadata).toHaveProperty('lastAccessed')
      expect(projects[0].metadata).toHaveProperty('version')

      // Cleanup
      cleanupProject(dirName)
    })
  })

  describe('integration: scanForDiscoveryConfigs to Project conversion', () => {
    it('should produce same results whether using scanForDiscoveryConfigs + factory or autoDiscoverProjects', async () => {
      const dirName = getTestDir('integration')
      createProjectConfig(dirName, `
[project]
name = "Integration Test"
code = "INT"
`)

      // Method 1: Use autoDiscoverProjects directly
      const projects1 = scanner.autoDiscoverProjects([testBaseDir])

      // Method 2: Use scanForDiscoveryConfigs then factory
      const discoveryConfigs: DiscoveryConfig[] = scanner.scanForDiscoveryConfigs([testBaseDir])

      // Import factory for manual conversion
      const { ProjectFactory } = await import('../ProjectFactory')
      const factory = new ProjectFactory()
      const projects2 = discoveryConfigs.map(dc =>
        factory.createAutoDiscovered(dc.config, dc.projectPath),
      )

      // Both methods should produce identical results
      expect(projects1).toHaveLength(projects2.length)
      expect(projects1[0].id).toBe(projects2[0].id)
      expect(projects1[0].project.code).toBe(projects2[0].project.code)
      expect(projects1[0].project.name).toBe(projects2[0].project.name)
      expect(projects1[0].autoDiscovered).toBe(projects2[0].autoDiscovered)

      // Cleanup
      cleanupProject(dirName)
    })

    it('should correctly handle multiple projects in both methods', () => {
      const dir1 = getTestDir('multi-1')
      const dir2 = getTestDir('multi-2')
      const dir3 = getTestDir('multi-3')

      createProjectConfig(dir1, `
[project]
name = "Multi 1"
code = "M1"
`)

      createProjectConfig(dir2, `
[project]
name = "Multi 2"
code = "M2"
`)

      // Create one with mismatched ID that should be excluded
      createProjectConfig(dir3, `
[project]
id = "wrong-id"
name = "Multi 3"
code = "M3"
`)

      // Method 1: autoDiscoverProjects
      const projects1 = scanner.autoDiscoverProjects([testBaseDir])

      // Method 2: scanForDiscoveryConfigs
      const discoveryConfigs: DiscoveryConfig[] = scanner.scanForDiscoveryConfigs([testBaseDir])

      // Both should find same number of projects (excluding mismatched)
      expect(projects1).toHaveLength(2)
      expect(discoveryConfigs).toHaveLength(2)

      // Project IDs should match
      const ids1 = projects1.map(p => p.id).sort()
      const ids2 = discoveryConfigs.map(dc => dc.config.project.id || dc.projectPath.split('/').pop()).sort()
      expect(ids1).toEqual(expect.arrayContaining(ids2))

      // Cleanup
      cleanupProject(dir1)
      cleanupProject(dir2)
      cleanupProject(dir3)
    })
  })
})
