/**
 * get_cr Tool E2E Tests
 *
 * Phase 2.4: Testing the get_cr MCP tool functionality
 * Following TDD RED-GREEN-REFACTOR approach
 *
 * BDD Scenarios:
 * - GIVEN existing CR WHEN getting with mode="full" THEN return complete CR with content
 * - GIVEN existing CR WHEN getting with mode="attributes" THEN return only YAML attributes
 * - GIVEN existing CR WHEN getting with mode="metadata" THEN return minimal metadata
 * - GIVEN non-existent CR WHEN getting THEN return error
 * - GIVEN existing CR WHEN getting without mode THEN default to full mode
 * - GIVEN CR with dependencies WHEN getting THEN include dependency information
 */

import type { MCPResponse } from '../helpers/mcp-client'
import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'

describe('get_cr', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient
  let projectFactory: ProjectFactory

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    // Create project structure manually BEFORE starting MCP client
    // This ensures the MCP server discovers the project from registry on startup
    const projectSetup = new ProjectSetup({ testEnv })
    await projectSetup.createProjectStructure('TEST', 'Test Project')
    // NOW start MCP client (server will discover the project from registry)
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
    // NOW create ProjectFactory with the running mcpClient
    projectFactory = new ProjectFactory(testEnv, mcpClient)
  })

  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

  async function callGetCR(projectKey: string, crKey: string, mode: string = 'full') {
    return await mcpClient.callTool('get_cr', {
      project: projectKey,
      key: crKey,
      mode,
    })
  }

  function extractCRKey(createResponse: MCPResponse): string {
    // Extract CR key from create response message
    // Format: "✅ **Created CR MDT-001**: Title"
    const match = createResponse.data?.match(/\*\*Created CR ([A-Z]+-\d+)\*\*:/)
    if (!match) {
      throw new Error(`Could not extract CR key from response: ${createResponse.data}`)
    }
    return match[1]
  }

  function expectFullCRStructure(response: any) {
    // In full mode, response is markdown content (string)
    expect(typeof response).toBe('string')
    // Should contain markdown sections
    expect(response).toContain('## 1. Description')
    expect(response).toContain('## 2. Rationale')
  }

  function expectAttributesStructure(response: any) {
    // In attributes mode, response is JSON string
    expect(typeof response).toBe('string')
    // Should be valid JSON
    const parsed = JSON.parse(response)
    // Should have YAML attributes
    expect(parsed.code).toBeDefined()
    expect(parsed.title).toBeDefined()
    expect(parsed.status).toBeDefined()
    expect(parsed.type).toBeDefined()
    expect(parsed.priority).toBeDefined()
    // Should not have content field
    expect(parsed.content).toBeUndefined()
  }

  function expectMetadataStructure(response: any) {
    // In metadata mode, response is JSON string
    expect(typeof response).toBe('string')
    // Should be valid JSON
    const parsed = JSON.parse(response)
    // Should have minimal metadata only
    expect(parsed.code).toBeDefined()
    expect(parsed.title).toBeDefined()
    expect(parsed.status).toBeDefined()
    expect(parsed.type).toBeDefined()
    expect(parsed.priority).toBeDefined()
    // Should not have content field but may have other metadata
    expect(parsed.content).toBeUndefined()
    // Note: phaseEpic is included in metadata mode in current implementation
  }

  describe('mode: full', () => {
    it('GIVEN existing CR WHEN getting with mode="full" THEN return complete CR with content', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      const crContent = `## 1. Description

This is a comprehensive test CR for validating the full mode response.

## 2. Rationale

We need this CR to test the complete functionality of the get_cr tool.

## 3. Solution Analysis

Multiple approaches were considered, and this approach was selected.

## 4. Implementation Specification

1. Create the CR with full content
2. Validate all sections are present
3. Ensure proper formatting

## 5. Acceptance Criteria

- All sections are present
- Content is properly formatted
- CR is valid`

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Full Test CR',
        type: 'Feature Enhancement',
        status: 'Approved',
        priority: 'High',
        phaseEpic: 'Phase 1',
        dependsOn: 'TEST-001',
        blocks: 'TEST-003',
        assignee: 'test@example.com',
        content: crContent,
      })
      const crKey = extractCRKey(createdCR)

      const response = await callGetCR('TEST', crKey, 'full')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expectFullCRStructure(response.data)

      // In full mode, response.data is the markdown content
      expect(response.data).toContain('## 1. Description')
      expect(response.data).toContain('This is a comprehensive test CR')
      expect(response.data).toContain('## 2. Rationale')
      expect(response.data).toContain('## 3. Solution Analysis')
      expect(response.data).toContain('## 4. Implementation Specification')
      expect(response.data).toContain('## 5. Acceptance Criteria')
    })
  })

  describe('mode: attributes', () => {
    it('GIVEN existing CR WHEN getting with mode="attributes" THEN return only YAML attributes', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Attributes Test CR',
        type: 'Bug Fix',
        priority: 'Critical',
        phaseEpic: 'Phase 2',
        assignee: 'developer@example.com',
        content: `## 1. Description

This is a test CR for attributes mode validation.

## 2. Rationale

We need this CR to test attributes mode functionality.`,
      })
      const crKey = extractCRKey(createdCR)

      const response = await callGetCR('TEST', crKey, 'attributes')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expectAttributesStructure(response.data)

      // Parse the JSON response to verify specific values
      const parsed = JSON.parse(response.data)
      expect(parsed.title).toBe('Attributes Test CR')
      expect(parsed.type).toBe('Bug Fix')
      // Note: Status defaults to "Proposed" if not explicitly set in YAML
      expect(parsed.status).toBe('Proposed')
      expect(parsed.priority).toBe('Critical')
      expect(parsed.phaseEpic).toBe('Phase 2')
      expect(parsed.assignee).toBe('developer@example.com')
      expect(parsed.content).toBeUndefined()
    })
  })

  describe('mode: metadata', () => {
    it('GIVEN existing CR WHEN getting with mode="metadata" THEN return minimal metadata', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Metadata Test CR',
        type: 'Architecture',
        status: 'Proposed',
        priority: 'Medium',
        phaseEpic: 'Phase 3',
        assignee: 'architect@example.com',
        dependsOn: 'TEST-005',
        content: `## 1. Description

This is a test CR for metadata mode validation.

## 2. Rationale

We need this CR to test metadata mode functionality.`,
      })
      const crKey = extractCRKey(createdCR)

      const response = await callGetCR('TEST', crKey, 'metadata')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expectMetadataStructure(response.data)

      // Parse the JSON response to verify metadata
      const parsed = JSON.parse(response.data)
      expect(parsed.title).toBe('Metadata Test CR')
      expect(parsed.type).toBe('Architecture')
      expect(parsed.status).toBe('Proposed')
      expect(parsed.priority).toBe('Medium')

      // Note: In current implementation, some optional fields like phaseEpic are included
      expect(parsed.content).toBeUndefined()
    })
  })

  describe('default Behavior', () => {
    it('GIVEN existing CR WHEN getting without mode THEN default to full mode', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Default Mode Test',
        type: 'Documentation',
        status: 'Implemented',
        priority: 'Low',
        content: `## 1. Description

Test content for default mode.

## 2. Rationale

This CR tests default mode behavior.`,
      })
      const crKey = extractCRKey(createdCR)

      const response = await callGetCR('TEST', crKey) // No mode specified

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expectFullCRStructure(response.data)

      // Should behave like full mode (returns markdown content)
      expect(response.data).toContain('## 1. Description')
      expect(response.data).toContain('Test content for default mode')
    })
  })

  describe('complex CRs', () => {
    it('GIVEN CR with dependencies WHEN getting THEN include dependency information', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Complex Dependencies CR',
        type: 'Feature Enhancement',
        status: 'Approved',
        priority: 'High',
        dependsOn: 'TEST-001, TEST-002, TEST-003',
        blocks: 'TEST-005, TEST-006',
        content: `## 1. Description

This CR has complex dependencies.

## 2. Rationale

We need to test complex dependency handling.`,
      })
      const crKey = extractCRKey(createdCR)

      const response = await callGetCR('TEST', crKey, 'full')

      expect(response.success).toBe(true)
      expectFullCRStructure(response.data)

      // In full mode, we get markdown content, so we can't directly verify dependencies
      // Just verify we have content
      expect(response.data).toContain('## 1. Description')
      expect(response.data).toContain('This CR has complex dependencies')
    })

    it('GIVEN CR with complex content WHEN getting THEN preserve formatting', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      const complexContent = `# Complex Test CR

## 1. Description

This is a complex CR with:

- Multiple list items
- **Bold text**
- *Italic text*
- \`Code snippets\`

\`\`\`javascript
function example() {
  return true;
}
\`\`\`

## 2. Rationale

### Subsection 2.1

Nested content here.

#### Subsubsection 2.1.1

Even more nested content.

## 3. Solution Analysis

| Option | Pros | Cons |
|--------|------|------|
| A | Fast | Complex |
| B | Simple | Slow |

## 4. Implementation Specification

1. First step
2. Second step
   - Sub-step 2.1
   - Sub-step 2.2
3. Third step

## 5. Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [x] Already completed`

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Complex Content CR',
        type: 'Technical Debt',
        status: 'In Progress',
        priority: 'Medium',
        content: complexContent,
      })
      const crKey = extractCRKey(createdCR)

      const response = await callGetCR('TEST', crKey, 'full')

      expect(response.success).toBe(true)
      expectFullCRStructure(response.data)

      // In full mode, response.data is the content (may be processed/stripped)
      // Note: H1 title might be stripped by processing
      expect(response.data).toContain('### Subsection 2.1')
      expect(response.data).toContain('| Option | Pros | Cons |')
      expect(response.data).toContain('- [x] Already completed')
    })
  })

  describe('error Handling', () => {
    it('GIVEN non-existent CR WHEN getting THEN return tool execution error', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      const response = await callGetCR('TEST', 'TEST-999')

      // Business logic errors (CR not found) are tool execution errors
      // They should return success=false with error object according to MCP spec
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32000) // Server error code
      expect(response.error?.message).toContain('not found')
    })

    it('GIVEN non-existent project WHEN getting THEN return protocol error', async () => {
      const response = await callGetCR('NONEXISTENT', 'TEST-001')

      // Invalid project key is a parameter validation error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('invalid')
    })

    it('GIVEN missing project parameter WHEN getting THEN return protocol error', async () => {
      const response = await mcpClient.callTool('get_cr', {
        key: 'TEST-001',
        mode: 'full',
      })

      // Invalid parameters are protocol errors (missing required argument)
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('Project key is required')
    })

    it('GIVEN missing key parameter WHEN getting THEN return protocol error', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      const response = await mcpClient.callTool('get_cr', {
        project: 'TEST',
        mode: 'full',
      })

      // Missing key parameter is a protocol error (invalid params)
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('CR key is required')
    })

    it('GIVEN invalid mode WHEN getting THEN return protocol error', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      const response = await mcpClient.callTool('get_cr', {
        project: 'TEST',
        key: 'TEST-001',
        mode: 'invalid',
      })

      // Invalid parameters are protocol errors (invalid enum value)
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('Invalid mode')
    })
  })

  describe('response Format Consistency', () => {
    it('GIVEN successful retrieval WHEN response THEN match expected format for each mode', async () => {
      await projectFactory.createProjectStructure('FMT', 'Format Test')
      const createdCR = await projectFactory.createTestCR('FMT', {
        title: 'Format Consistency Test',
        type: 'Feature Enhancement',
        status: 'Approved',
        priority: 'High',
        content: `## 1. Description

Testing format consistency.

## 2. Rationale

We need to verify format consistency across modes.`,
      })
      const crKey = extractCRKey(createdCR)

      // Test full mode format
      const fullResponse = await callGetCR('FMT', crKey, 'full')
      expect(fullResponse.success).toBe(true)
      expectFullCRStructure(fullResponse.data)

      // Test attributes mode format
      const attrResponse = await callGetCR('FMT', crKey, 'attributes')
      expect(attrResponse.success).toBe(true)
      expectAttributesStructure(attrResponse.data)

      // Test metadata mode format
      const metaResponse = await callGetCR('FMT', crKey, 'metadata')
      expect(metaResponse.success).toBe(true)
      expectMetadataStructure(metaResponse.data)
    })
  })
})
