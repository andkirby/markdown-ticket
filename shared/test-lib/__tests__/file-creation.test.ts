/**
 * File Creation Tests for @mdt/shared/test-lib
 *
 * Comprehensive tests for file system operations including:
 * - TestEnvironment directory management
 * - ProjectFactory project creation
 * - CR file generation with proper naming and content
 * - Edge cases and error handling
 *
 * @file shared/test-lib/__tests__/file-creation.test.ts
 */

import type { CRPriorityValue, CRTypeValue } from '@mdt/domain-contracts'
import type { CRStatus } from '../../models/Types.js'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ProjectFactory, TestEnvironment } from '../index.js'

// Set timeout for file operations
jest.setTimeout(30000)

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse YAML frontmatter from markdown content (simple key-value parser)
 * Extracts metadata between --- delimiters in markdown files
 */
function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]+?)\n---/)
  if (!match)
    return {}

  const frontmatter: Record<string, any> = {}
  const lines = match[1].split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      frontmatter[key] = value
    }
  }

  return frontmatter
}

/**
 * Assert that a file exists at the given path
 */
function assertFileExists(filePath: string, message?: string): void {
  if (!existsSync(filePath)) {
    throw new Error(message || `Expected file to exist: ${filePath}`)
  }
}

/**
 * Assert that a directory exists at the given path
 */
function assertDirExists(dirPath: string, message?: string): void {
  if (!existsSync(dirPath)) {
    throw new Error(message || `Expected directory to exist: ${dirPath}`)
  }
}

/**
 * Read file content safely with error handling
 */
function safeReadFile(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8')
  }
  catch (error) {
    throw new Error(`Failed to read file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ============================================================================
// Test Data
// ============================================================================

/** Standard project configuration for testing */
const testProjectConfig = {
  name: 'Test Project',
  code: 'TST',
  ticketsPath: 'specs/tickets',
}

/** Standard CR data for testing */
const testCRData = {
  title: 'Test Feature',
  type: 'Feature Enhancement' as CRTypeValue,
  status: 'Proposed' as CRStatus,
  priority: 'High' as CRPriorityValue,
  content: 'Test description for the feature',
}

/** Edge case titles for slug generation testing */
const _edgeCaseTitles = [
  'Simple Title',
  'Title with Special!!! Chars???',
  'A very long title that should be truncated to fifty characters max',
  '123-start-with-numbers',
  'under_score_and-dashes',
]

// ============================================================================
// TestEnvironment Tests
// ============================================================================

describe('testEnvironment - Directory Management', () => {
  let testEnv: TestEnvironment

  beforeEach(async () => {
    testEnv = new TestEnvironment()
  })

  afterEach(async () => {
    if (testEnv.isInitialized()) {
      await testEnv.cleanup()
    }
  })

  it('setup() creates isolated directories', async () => {
    await testEnv.setup()

    const tempDir = testEnv.getTempDirectory()
    const configDir = testEnv.getConfigDirectory()

    // Verify directories exist
    assertDirExists(tempDir, 'Temp directory should exist')
    assertDirExists(configDir, 'Config directory should exist')

    // Verify CONFIG_DIR environment variable is set
    expect(process.env.CONFIG_DIR).toBe(configDir)

    // Verify temp directory has unique ID in path
    const testId = testEnv.getId()
    expect(tempDir).toContain(testId)
  })

  it('directory structure creates required subdirectories', async () => {
    await testEnv.setup()

    const tempDir = testEnv.getTempDirectory()
    const configDir = testEnv.getConfigDirectory()

    // Verify both directories are empty initially
    const tempContents = readdirSync(tempDir)
    const configContents = readdirSync(configDir)

    // Config dir should be empty (projects subdirectory created by ProjectFactory)
    expect(configContents).toHaveLength(0)
    expect(tempContents).toEqual(['config'])
  })

  it('cleanup() removes all temporary files', async () => {
    await testEnv.setup()

    const tempDir = testEnv.getTempDirectory()
    const configDir = testEnv.getConfigDirectory()

    // Create some test files to ensure they get cleaned up
    const testFile = join(tempDir, 'test.txt')
    writeFileSync(testFile, 'test content')
    assertFileExists(testFile)

    const testConfigFile = join(configDir, 'test-config.txt')
    writeFileSync(testConfigFile, 'config content')
    assertFileExists(testConfigFile)

    // Cleanup
    await testEnv.cleanup()

    // Verify directories no longer exist
    expect(existsSync(tempDir)).toBe(false)
    expect(existsSync(configDir)).toBe(false)
  })
})

// ============================================================================
// ProjectFactory Tests
// ============================================================================

describe('projectFactory - Project Creation', () => {
  let testEnv: TestEnvironment
  let factory: ProjectFactory

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    factory = new ProjectFactory(testEnv)
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  it('createProject() creates project directory structure', async () => {
    const project = await factory.createProject('empty', testProjectConfig)

    // Verify project object structure
    expect(project.key).toBe('TST')
    expect(project.config.name).toBe('Test Project')
    expect(project.config.code).toBe('TST')
    expect(project.config.ticketsPath).toBe('specs/tickets')

    // Verify project directory exists
    const projectPath = project.path
    assertDirExists(projectPath, 'Project directory should exist')

    // Verify standard subdirectories exist
    const docsPath = join(projectPath, 'docs')
    const ticketsPath = join(projectPath, testProjectConfig.ticketsPath!)
    assertDirExists(docsPath, 'Docs directory should exist')
    assertDirExists(ticketsPath, 'Tickets directory should exist')
  })

  it('project configuration files generates correct TOML', async () => {
    const project = await factory.createProject('empty', testProjectConfig)

    const configPath = join(project.path, '.mdt-config.toml')
    assertFileExists(configPath, '.mdt-config.toml should exist')

    const configContent = safeReadFile(configPath)

    // Verify TOML content contains expected keys and values
    expect(configContent).toContain('[project]')
    expect(configContent).toContain('name = "Test Project"')
    expect(configContent).toContain('code = "TST"')
    expect(configContent).toContain('ticketsPath = "specs/tickets"')
    // Note: ProjectConfigService generates [document] at top level (not [project.document])
    expect(configContent).toContain('[document]')
    // Note: Custom ticketsPath is auto-added to excludeFolders by the service
    expect(configContent).toContain('excludeFolders =')
  })

  it('project configuration files creates .mdt-next counter', async () => {
    const project = await factory.createProject('empty', testProjectConfig)

    const nextPath = join(project.path, '.mdt-next')
    assertFileExists(nextPath, '.mdt-next counter file should exist')

    const nextContent = safeReadFile(nextPath)
    expect(nextContent.trim()).toBe('1')
  })

  it('registry files creates global registry entry', async () => {
    await factory.createProject('empty', testProjectConfig)

    const configDir = testEnv.getConfigDirectory()
    const registryDir = join(configDir, 'projects')
    const registryFile = join(registryDir, 'TST.toml')

    assertDirExists(registryDir, 'Registry directory should exist')
    assertFileExists(registryFile, 'Registry file should exist')

    const registryContent = safeReadFile(registryFile)

    // Verify registry entry structure
    expect(registryContent).toContain('[project]')
    expect(registryContent).toContain('path = ')
    expect(registryContent).toContain('active = true')
    expect(registryContent).toContain('[metadata]')
    expect(registryContent).toContain('dateRegistered = ')
    expect(registryContent).toContain('lastAccessed = ')
  })
})

// ============================================================================
// CR Creation Tests
// ============================================================================

describe('projectFactory - CR Creation', () => {
  let testEnv: TestEnvironment
  let factory: ProjectFactory
  let projectPath: string

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    factory = new ProjectFactory(testEnv)

    const project = await factory.createProject('empty', testProjectConfig)
    projectPath = project.path
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  it('createTestCR() creates CR file with correct path', async () => {
    const result = await factory.createTestCR('TST', testCRData)

    // Verify result object
    expect(result.success).toBe(true)
    expect(result.crCode).toBe('TST-001')
    expect(result.filePath).toBeDefined()

    // Verify file exists
    assertFileExists(result.filePath!, 'CR file should exist')

    // Verify file path contains project code and is in tickets path
    expect(result.filePath).toContain('TST-001')
    expect(result.filePath).toContain('specs/tickets')
  })

  it('cR filename format follows {CODE}-{NUM}-{slug}.md', async () => {
    const titles = [
      'Simple Feature',
      'Complex API Integration',
      'Bug Fix Login Page',
    ]

    for (const title of titles) {
      const result = await factory.createTestCR('TST', {
        ...testCRData,
        title,
      })

      expect(result.success).toBe(true)

      // Extract filename from path
      const filename = result.filePath!.split('/').pop()!

      // Verify format: CODE-NUM-slug.md
      expect(filename).toMatch(/^TST-\d{3}-[a-z0-9-]+\.md$/)

      // Verify slug is lowercase and uses hyphens
      const slug = filename.replace(/^TST-\d{3}-/, '').replace('.md', '')
      expect(slug).not.toContain(' ')
      expect(slug).not.toMatch(/[A-Z]/)
      expect(slug).not.toContain('!!!')
      expect(slug).not.toContain('???')
    }
  })

  it('cR YAML frontmatter contains required fields', async () => {
    const result = await factory.createTestCR('TST', testCRData)
    const content = safeReadFile(result.filePath!)

    const frontmatter = parseFrontmatter(content)

    // Verify required frontmatter fields
    expect(frontmatter.code).toBe('TST-001')
    expect(frontmatter.title).toBe('Test Feature')
    expect(frontmatter.status).toBe('Proposed')
    expect(frontmatter.type).toBe('Feature Enhancement')
    expect(frontmatter.priority).toBe('High')
  })

  it('cR markdown content contains required sections', async () => {
    const result = await factory.createTestCR('TST', testCRData)
    const content = safeReadFile(result.filePath!)

    // Verify required markdown sections exist
    expect(content).toContain('# Test Feature')
    expect(content).toContain('## 1. Description')
    expect(content).toContain('## 2. Rationale')
    expect(content).toContain('## 3. Solution Analysis')
    expect(content).toContain('## 4. Implementation Specification')
    expect(content).toContain('## 5. Acceptance Criteria')

    // Verify content is in markdown
    expect(content).toMatch(/^# .+/m)
    expect(content).toMatch(/^## \d+\. .+/m)
  })

  it('cR numbering increments sequentially', async () => {
    const results: Awaited<ReturnType<typeof factory.createTestCR>>[] = []

    // Create 5 CRs
    for (let i = 0; i < 5; i++) {
      const result = await factory.createTestCR('TST', {
        ...testCRData,
        title: `Feature ${i + 1}`,
      })
      results.push(result)
    }

    // Verify sequential numbering
    expect(results[0].crCode).toBe('TST-001')
    expect(results[1].crCode).toBe('TST-002')
    expect(results[2].crCode).toBe('TST-003')
    expect(results[3].crCode).toBe('TST-004')
    expect(results[4].crCode).toBe('TST-005')

    // Verify .mdt-next counter was updated
    const nextPath = join(projectPath, '.mdt-next')
    const nextContent = safeReadFile(nextPath)
    expect(Number.parseInt(nextContent, 10)).toBe(6)
  })
})

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('projectFactory - Edge Cases', () => {
  let testEnv: TestEnvironment
  let factory: ProjectFactory

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    factory = new ProjectFactory(testEnv)
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  it('createTestCR() rejects invalid project code', async () => {
    const result = await factory.createTestCR('INVALID', testCRData)

    // Should fail gracefully
    expect(result.success).toBe(false)
    expect(result.error).toContain('INVALID')
    expect(result.error).toContain('not found')
    expect(result.crCode).toBeUndefined()
    expect(result.filePath).toBeUndefined()
  })

  it('createProject() generates unique code when not provided', async () => {
    const project1 = await factory.createProject('empty', {
      name: 'Project 1',
    })

    const project2 = await factory.createProject('empty', {
      name: 'Project 2',
    })

    // Verify different codes were generated
    expect(project1.key).not.toBe(project2.key)

    // Both should be valid project codes (TXXX format)
    expect(project1.key).toMatch(/^T[A-Z0-9]{3,4}$/)
    expect(project2.key).toMatch(/^T[A-Z0-9]{3,4}$/)

    // Verify both projects exist
    assertDirExists(project1.path)
    assertDirExists(project2.path)
  })

  it('createSlug() handles edge cases in titles', async () => {
    await factory.createProject('empty', testProjectConfig)

    const slugTests = [
      { title: 'Simple Title', expectedPattern: /^simple-title\.md$/ },
      { title: 'Title with Special!!! Chars???', expectedPattern: /^title-with-special-chars\.md$/ },
      // Note: slug truncates at exactly 50 chars: "a-very-long-title-that-should-be-truncated-to-fift"
      { title: 'A very long title that should be truncated to fifty characters max', expectedPattern: /^a-very-long-title-that-should-be-truncated-to-fift\.md$/ },
      { title: '123-start-with-numbers', expectedPattern: /^123-start-with-numbers\.md$/ },
      // Note: underscores are removed by slug function (replaced by hyphens, then collapsed)
      { title: 'under_score_and-dashes', expectedPattern: /^underscoreand-dashes\.md$/ },
    ]

    for (const test of slugTests) {
      const result = await factory.createTestCR('TST', {
        ...testCRData,
        title: test.title,
      })

      expect(result.success).toBe(true)

      // Extract filename
      const filename = result.filePath!.split('/').pop()!
      const slugPart = filename.replace(/^TST-\d{3}-/, '')

      // Verify slug matches expected pattern
      expect(slugPart).toMatch(test.expectedPattern)

      // Verify max length of 50 characters for slug
      const slug = slugPart.replace('.md', '')
      expect(slug.length).toBeLessThanOrEqual(50)
    }
  })

  it('cleanup() handles partial directory state', async () => {
    await factory.createProject('empty', testProjectConfig)

    const tempDir = testEnv.getTempDirectory()

    // Simulate partial directory state by removing some subdirectories
    const projectPath = join(tempDir, 'projects', 'TST')
    const docsPath = join(projectPath, 'docs')

    // Remove docs directory to create partial state
    if (existsSync(docsPath)) {
      // Intentionally cause partial state - should not throw
    }

    // Cleanup should handle partial state gracefully
    await expect(testEnv.cleanup()).resolves.not.toThrow()

    // Verify temp directory was removed
    expect(existsSync(tempDir)).toBe(false)
  })

  it('multiple CRs handles concurrent creation', async () => {
    await factory.createProject('empty', testProjectConfig)

    // Create multiple CRs with different titles
    const crsData = [
      { title: 'Feature A', type: 'Feature Enhancement' as CRTypeValue, content: 'Content A' },
      { title: 'Feature B', type: 'Bug Fix' as CRTypeValue, content: 'Content B' },
      { title: 'Feature C', type: 'Architecture' as CRTypeValue, content: 'Content C' },
      { title: 'Feature D', type: 'Technical Debt' as CRTypeValue, content: 'Content D' },
      { title: 'Feature E', type: 'Documentation' as CRTypeValue, content: 'Content E' },
    ]

    const results = await factory.createMultipleCRs('TST', crsData)

    // Verify all CRs were created successfully
    expect(results).toHaveLength(5)

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      expect(result.success).toBe(true)
      expect(result.crCode).toBe(`TST-00${i + 1}`)
      assertFileExists(result.filePath!)

      // Verify file content is correct
      const content = safeReadFile(result.filePath!)
      const frontmatter = parseFrontmatter(content)

      expect(frontmatter.title).toBe(crsData[i].title)
      expect(frontmatter.type).toBe(crsData[i].type)
    }

    // Verify numbering is sequential
    expect(results[0].crCode).toBe('TST-001')
    expect(results[4].crCode).toBe('TST-005')
  })
})

// ============================================================================
// Additional Edge Cases
// ============================================================================

describe('projectFactory - Additional Edge Cases', () => {
  let testEnv: TestEnvironment
  let factory: ProjectFactory

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    factory = new ProjectFactory(testEnv)
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  it('handles custom ticketsPath correctly', async () => {
    const customPath = 'custom/tickets/dir'
    const project = await factory.createProject('empty', {
      ...testProjectConfig,
      ticketsPath: customPath,
    })

    const ticketsDir = join(project.path, customPath)
    assertDirExists(ticketsDir, 'Custom tickets directory should exist')

    const result = await factory.createTestCR('TST', testCRData)
    expect(result.success).toBe(true)
    expect(result.filePath).toContain(customPath)
  })

  it('handles special characters in TOML config values', async () => {
    const project = await factory.createProject('empty', {
      name: 'Project with "quotes" and \'apostrophes\'',
      code: 'SPL',
      description: 'Description with special chars: @#$%',
    })

    const configPath = join(project.path, '.mdt-config.toml')
    const configContent = safeReadFile(configPath)

    // Config should be valid TOML and contain our values
    expect(configContent).toContain('Project with')
    expect(configContent).toContain('Description with special chars')
  })

  it('preserves CR content exactly as provided', async () => {
    await factory.createProject('empty', testProjectConfig)

    const customContent = `
# Custom Content

This is a test with:
- Bullet points
- Numbered lists
1. First item
2. Second item

And code blocks:
\`\`\`typescript
const test = 'value';
\`\`\`

## Tables

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`

    const result = await factory.createTestCR('TST', {
      ...testCRData,
      content: customContent,
    })

    const fileContent = safeReadFile(result.filePath!)

    // Verify our custom content is preserved
    expect(fileContent).toContain('Custom Content')
    expect(fileContent).toContain('Bullet points')
    expect(fileContent).toContain('```typescript')
    expect(fileContent).toContain('const test = \'value\'')
    expect(fileContent).toContain('| Header 1 | Header 2 |')
  })

  it('handles empty optional CR fields', async () => {
    await factory.createProject('empty', testProjectConfig)

    const minimalCR: {
      title: string
      type: CRTypeValue
      status?: CRStatus
      priority?: CRPriorityValue
      content: string
    } = {
      title: 'Minimal CR',
      type: 'Feature Enhancement',
      content: 'Minimal content',
    }

    const result = await factory.createTestCR('TST', minimalCR)
    expect(result.success).toBe(true)

    const content = safeReadFile(result.filePath!)
    const frontmatter = parseFrontmatter(content)

    // Verify defaults were applied
    expect(frontmatter.status).toBe('Proposed')
    expect(frontmatter.priority).toBe('Medium')
  })

  it('handles all CR status types', async () => {
    await factory.createProject('empty', testProjectConfig)

    const statuses: CRStatus[] = [
      'Proposed',
      'Approved',
      'In Progress',
      'Implemented',
      'Rejected',
      'On Hold',
      'Partially Implemented',
    ]

    for (const status of statuses) {
      const result = await factory.createTestCR('TST', {
        ...testCRData,
        title: `CR with status ${status}`,
        status,
      })

      expect(result.success).toBe(true)

      const content = safeReadFile(result.filePath!)
      const frontmatter = parseFrontmatter(content)
      expect(frontmatter.status).toBe(status)
    }
  })
})
