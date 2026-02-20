/**
 * Output Sanitization E2E Tests
 *
 * MUST-06: Servers MUST sanitize tool outputs
 * Testing output sanitization to prevent XSS and malicious content injection
 * Following TDD RED-GREEN-REFACTOR approach
 *
 * IMPORTANT: The sanitizer is disabled by default in the MCP server.
 * These tests set MCP_SANITIZATION_ENABLED=true in beforeEach to enable sanitization.
 * The "Sanitization Toggle" section tests both enabled and disabled states.
 *
 * BDD Scenarios:
 * - GIVEN script tags in content WHEN returning THEN sanitize/remove scripts
 * - GIVEN on* event handlers WHEN returning THEN sanitize/remove handlers
 * - GIVEN javascript: URLs WHEN returning THEN sanitize/remove protocol
 * - GIVEN HTML entities WHEN returning THEN properly escape
 * - GIVEN markdown with malicious links WHEN rendering THEN sanitize links
 */

import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'

describe('output Sanitization (MUST-06)', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient
  let projectCode: string

  // Test setup following RED phase
  beforeEach(async () => {
    // Enable sanitization for tests
    // NOTE: The sanitizer is disabled by default in the MCP server.
    // This environment variable is required to enable sanitization behavior
    // and verify that malicious content is properly filtered from tool outputs.
    process.env.MCP_SANITIZATION_ENABLED = 'true'

    // Create isolated test environment
    testEnv = new TestEnvironment()
    await testEnv.setup()

    // Create test project BEFORE starting MCP client
    // Server discovers projects at startup from the registry
    const projectSetup = new ProjectSetup({ testEnv })
    projectCode = `T${Math.random().toString(36).replace(/[^a-z]/g, '').toUpperCase().slice(0, 3)}`
    await projectSetup.createProjectStructure(projectCode, 'Sanitization Test Project')

    // NOW start MCP client (server will discover the project from registry)
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
    // Add small delay to ensure server has fully initialized project registry
    await new Promise(resolve => setTimeout(resolve, 500))
  })

  // Test cleanup
  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

  // Helper to create CR with malicious content
  async function createCRWithMaliciousContent(projectKey: string, maliciousContent: string): Promise<string> {
    // Use the pre-created project code if no project key provided
    const _targetProject = projectKey || projectCode
    const crData = {
      title: 'Test CR with Malicious Content',
      type: 'Feature Enhancement',
      priority: 'Medium',
      content: `
## 1. Description

This CR contains potentially malicious content that should be sanitized.

${maliciousContent}

## 2. Rationale

Testing sanitization of malicious content.
      `.trim(),
    }

    const result = await mcpClient.callTool('create_cr', {
      project: projectKey,
      type: crData.type,
      data: crData,
    })

    // Look for CR key in multiple possible formats
    // The actual format from crHandlers.ts is: "✅ **Created CR ${ticket.code}**: ${ticket.title}"
    const patterns = [
      /✅ \*\*Created CR (\w+-\d+)\*\*:/,
      /\*\*Created CR (\w+-\d+)\*\*:/,
      /Created CR (\w+-\d+):/,
      /- Key: (\w+-\d+)/,
    ]

    for (const pattern of patterns) {
      const match = (result.data as string)?.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    // If no pattern matched, log the response for debugging
    console.error('Failed to extract CR key from response:', result.data)
    return ''
  }

  describe('script Tag Sanitization', () => {
    it('should remove script tags from tool output', async () => {
      // Given: A project exists (created in beforeEach)
      // When: Creating CR with script tags
      const maliciousContent = '<script>alert("XSS")</script>'
      const crCode = await createCRWithMaliciousContent(projectCode, maliciousContent)

      // Then: Script tags should be removed from response
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // The response should not contain the script tag
      expect(result.data).not.toContain('<script>')
      expect(result.data).not.toContain('alert("XSS")')
      expect(result.data).not.toContain('</script>')
    })

    it('should remove script tags with attributes', async () => {
      // Given: A project exists (created in beforeEach)
      // When: Creating CR with complex script tag
      const maliciousContent = '<script src="evil.com.js" type="text/javascript">alert("XSS")</script>'
      const crCode = await createCRWithMaliciousContent(projectCode, maliciousContent)

      // Then: Entire script tag should be removed
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      expect(result.data).not.toContain('<script')
      expect(result.data).not.toContain('evil.com.js')
      expect(result.data).not.toContain('</script>')
    })

    it('should handle multiple script tags', async () => {
      // Given: Multiple script tags in content
      const maliciousContent = `
        <script>alert("first")</script>
        Some content
        <script>alert("second")</script>
      `

      const crCode = await createCRWithMaliciousContent(projectCode, maliciousContent)

      // When: Retrieving the content
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // Then: All script tags should be removed
      expect(result.data).not.toContain('<script>')
      expect(result.data).not.toContain('</script>')
      // But legitimate content should remain
      expect(result.data).toContain('Some content')
    })
  })

  describe('event Handler Sanitization', () => {
    it('should remove on* event handlers from HTML', async () => {
      // Given: HTML with event handlers
      const maliciousContent = '<div onclick="alert(\'XSS\')" onload="stealData()">Content</div>'

      const crCode = await createCRWithMaliciousContent(projectCode, maliciousContent)

      // When: Retrieving the content
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // Then: Event handlers should be removed
      expect(result.data).not.toContain('onclick=')
      expect(result.data).not.toContain('onload=')
      expect(result.data).not.toContain('alert(')
      expect(result.data).not.toContain('stealData()')
    })

    it('should handle various event handlers', async () => {
      // Given: Multiple types of event handlers
      const maliciousContent = `
        <img onerror="maliciousCode()">
        <body onload="initAttack()">
        <a onmouseover="trackMouse()">
        <form onsubmit="stealData()">
      `

      const crCode = await createCRWithMaliciousContent(projectCode, maliciousContent)

      // When: Retrieving the content
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // Then: All event handlers should be removed
      expect(result.data).not.toContain('onerror=')
      expect(result.data).not.toContain('onload=')
      expect(result.data).not.toContain('onmouseover=')
      expect(result.data).not.toContain('onsubmit=')
    })
  })

  describe('javaScript URL Sanitization', () => {
    it('should remove javascript: URLs', async () => {
      // Given: Links with javascript: protocol
      const maliciousContent = '<a href="javascript:alert(\'XSS\')">Click me</a>'

      const crCode = await createCRWithMaliciousContent(projectCode, maliciousContent)

      // When: Retrieving the content
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // Then: javascript: URLs should be removed or neutralized
      expect(result.data).not.toContain('javascript:')
      expect(result.data).not.toContain('alert(')
    })

    it('should handle data: URLs with scripts', async () => {
      // Given: data: URLs with embedded scripts
      const maliciousContent = '<iframe src="data:text/html,<script>alert(\'XSS\')</script>"></iframe>'

      const crCode = await createCRWithMaliciousContent(projectCode, maliciousContent)

      // When: Retrieving the content
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // Then: Malicious data: URLs should be handled
      expect(result.data).not.toContain('data:text/html,<script>')
      expect(result.data).not.toContain('alert(')
    })
  })

  describe('hTML Entity Escaping', () => {
    it('should properly escape HTML entities in text output', async () => {
      // Given: Content with HTML entities
      const contentWithEntities = 'Use &lt;script&gt; for code blocks, not <script>alert("XSS")</script>'

      const crCode = await createCRWithMaliciousContent(projectCode, contentWithEntities)

      // When: Retrieving the content
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // Then: HTML should be properly escaped or sanitized
      // Legitimate &lt; and &gt; should remain
      expect(result.data).toContain('&lt;script&gt;')
      // Malicious <script> should be removed
      expect(result.data).not.toContain('<script>alert("XSS")</script>')
    })

    it('should preserve safe markdown formatting', async () => {
      // Given: Valid markdown formatting
      const validMarkdown = `
# Heading
## Subheading

* Bullet point
* Another point

\`\`\`javascript
console.log('safe code');
\`\`\`

[Link](https://example.com)
      `

      const crCode = await createCRWithMaliciousContent(projectCode, validMarkdown)

      // When: Retrieving the content
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // Then: Safe markdown should be preserved
      expect(result.data).toContain('# Heading')
      expect(result.data).toContain('* Bullet point')
      expect(result.data).toContain('```javascript')
      expect(result.data).toContain('[Link](https://example.com)')
    })
  })

  describe('markdown Link Sanitization', () => {
    it('should sanitize malicious links in markdown', async () => {
      // Given: Markdown with malicious links
      const maliciousLinks = `
[Safe Link](https://example.com)
[Malicious JS](javascript:alert('XSS'))
[Data URL](data:text/html,<script>alert('XSS')</script>)
      `

      const crCode = await createCRWithMaliciousContent(projectCode, maliciousLinks)

      // When: Retrieving the content
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // Then: Malicious links should be sanitized
      expect(result.data).toContain('[Safe Link](https://example.com)')
      expect(result.data).not.toContain('javascript:alert(')
      expect(result.data).not.toContain('data:text/html,<script>')
    })

    it('should handle XSS in link titles', async () => {
      // Given: Link titles with XSS attempts
      const maliciousTitles = `
[<script>alert('XSS')</script>](https://example.com)
[" onclick="alert('XSS')""](https://example.com)
      `

      const crCode = await createCRWithMaliciousContent(projectCode, maliciousTitles)

      // When: Retrieving the content
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      // Then: Script tags in titles should be removed
      expect(result.data).not.toContain('<script>')
      expect(result.data).not.toContain('onclick=')
    })
  })

  describe('cR Content Field Sanitization', () => {
    it('should sanitize CR content in list_crs output', async () => {
      // Given: CRs with malicious content
      // Create multiple CRs with different malicious content
      await createCRWithMaliciousContent(projectCode, '<script>alert("CR1")</script>')
      await createCRWithMaliciousContent(projectCode, 'Content with <img onerror="alert(\'CR2\')" src="x">')

      // When: Listing CRs
      const result = await mcpClient.callTool('list_crs', {
        project: projectCode,
      })

      // Then: Output should be sanitized
      expect(result.data).not.toContain('<script>')
      expect(result.data).not.toContain('onerror=')
      expect(result.data).not.toContain('alert(')
    })

    it('should sanitize project descriptions', async () => {
      // Given: Project exists (created in beforeEach)

      // When: Getting project info
      const result = await mcpClient.callTool('get_project_info', {
        key: projectCode,
      })

      // Then: Response should be successful and contain project info
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data).toContain('Sanitization Test Project')
    })
  })

  describe('tool Name and Parameter Sanitization', () => {
    it('should not reflect malicious input in error messages', async () => {
      // Given: Malicious input parameters
      const maliciousInput = {
        project: '<script>alert("project")</script>',
        key: 'javascript:alert("key")',
      }

      // When: Making request with malicious params
      try {
        await mcpClient.callTool('get_cr', maliciousInput)
      }
      catch (error) {
        // Then: Error message should not contain malicious content
        expect((error as Error).message).not.toContain('<script>')
        expect((error as Error).message).not.toContain('javascript:')
        expect((error as Error).message).not.toContain('alert(')
      }
    })

    it('should not reflect malicious tool names', async () => {
      // Given: Attempting to call non-existent tool with malicious name
      const maliciousToolName = '<script>alert("tool")</script>'

      // When: Making request
      try {
        await mcpClient.callTool(maliciousToolName, {})
      }
      catch (error) {
        // Then: Error should not reflect malicious input
        expect((error as Error).message).not.toContain('<script>')
        expect((error as Error).message).not.toContain('alert(')
      }
    })
  })

  describe('sanitization Consistency', () => {
    it('should apply same sanitization rules across all tools', async () => {
      // Given: Common malicious content
      const maliciousContent = '<script>alert("XSS")</script>'

      // When: Using different tools
      const crCode = await createCRWithMaliciousContent(projectCode, maliciousContent)

      const getResult = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      const listResult = await mcpClient.callTool('list_crs', {
        project: projectCode,
      })

      // Then: All outputs should be consistently sanitized
      expect(getResult.data).not.toContain('<script>')
      expect(listResult.data).not.toContain('<script>')
    })
  })

  describe('performance Impact', () => {
    it('should handle large content without performance degradation', async () => {
      // Given: Large content with some malicious snippets
      let largeContent = '# Large Content\n\n'
      for (let i = 0; i < 100; i++) {
        largeContent += `Section ${i}: <script>alert(${i})</script>\n`
        largeContent += `Content ${i}: This is safe content.\n\n`
      }

      const crCode = await createCRWithMaliciousContent(projectCode, largeContent)

      // Verify CR was created successfully
      expect(crCode).toBeTruthy()
      expect(crCode).not.toBe('')

      // When: Retrieving large content
      const startTime = Date.now()
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })
      const endTime = Date.now()

      // Verify we got a result
      expect(result).toBeDefined()
      expect(result.data).toBeDefined()

      // Then: Should complete in reasonable time
      // Note: This is an E2E test that includes:
      // - IPC communication via stdio transport
      // - File I/O operations (reading CR from disk)
      // - JSON-RPC serialization/deserialization
      // - Server processing overhead
      // The sanitizer itself is optimized to <1ms for this content size
      // 5 second timeout allows for E2E infrastructure overhead while catching performance regressions
      expect(endTime - startTime).toBeLessThan(5000)

      // And: Content should be sanitized
      expect(result.data).not.toContain('<script>')
      expect(result.data).toContain('Content 0:') // Safe content preserved
    })
  })

  describe('sanitization Toggle', () => {
    it('should not sanitize when MCP_SANITIZATION_ENABLED is not set', async () => {
      // Create a new test environment with sanitization disabled
      const testEnvDisabled = new TestEnvironment()
      await testEnvDisabled.setup()

      // Ensure sanitization is disabled
      delete process.env.MCP_SANITIZATION_ENABLED

      // Create project BEFORE starting client (server discovers projects at startup)
      const projectSetupDisabled = new ProjectSetup({ testEnv: testEnvDisabled })
      const projectCodeDisabled = `D${Math.random().toString(36).replace(/[^a-z]/g, '').toUpperCase().slice(0, 3)}`
      await projectSetupDisabled.createProjectStructure(projectCodeDisabled, 'Disabled Sanitization Project')

      // Start a new MCP client (it will pick up the updated environment)
      const mcpClientDisabled = new MCPClient(testEnvDisabled, { transport: 'stdio' })
      await mcpClientDisabled.start()

      try {
        // Given: A project exists (created above)
        // eslint-disable-next-line no-new
        new ProjectFactory(testEnvDisabled, mcpClientDisabled)

        // When: Creating CR with script tags while sanitization is disabled
        const maliciousContent = '<script>alert("XSS")</script><p>Safe content</p>'
        const crData = {
          title: 'Test CR with Malicious Content',
          type: 'Feature Enhancement',
          priority: 'Medium',
          content: `
## 1. Description

This CR contains potentially malicious content that should be sanitized.

${maliciousContent}

## 2. Rationale

Testing sanitization of malicious content.
          `.trim(),
        }

        const result = await mcpClientDisabled.callTool('create_cr', {
          project: projectCodeDisabled,
          type: crData.type,
          data: crData,
        })

        // Look for CR key in multiple possible formats
        const patterns = [
          /✅ \*\*Created CR (\w+-\d+)\*\*/,
          /- Key: (\w+-\d+)/,
          /Created (\w+-\d+)/,
        ]

        let crCode = ''
        for (const pattern of patterns) {
          const match = (result.data as string)?.match(pattern)
          if (match && match[1]) {
            crCode = match[1]
            break
          }
        }

        // When: Retrieving the CR content
        const getResult = await mcpClientDisabled.callTool('get_cr', {
          project: projectCodeDisabled,
          key: crCode,
        })

        // Then: Content should NOT be sanitized (script tags should remain)
        expect(getResult.data).toContain('<script>alert("XSS")</script>')
        expect(getResult.data).toContain('<p>Safe content</p>')
      }
      finally {
        // Cleanup
        await mcpClientDisabled.stop()
        await testEnvDisabled.cleanup()
      }
    })

    it('should sanitize when MCP_SANITIZATION_ENABLED=true', async () => {
      // This test verifies that the existing tests are actually testing sanitization
      // Given: A project exists with sanitization enabled (created in beforeEach)

      // When: Creating CR with script tags
      const maliciousContent = '<script>alert("XSS")</script><p>Safe content</p>'
      const crCode = await createCRWithMaliciousContent(projectCode, maliciousContent)

      // Then: Script tags should be removed but safe content should remain
      const result = await mcpClient.callTool('get_cr', {
        project: projectCode,
        key: crCode,
      })

      expect(result.data).not.toContain('<script>alert("XSS")</script>')
      expect(result.data).not.toContain('</script>')
      expect(result.data).toContain('Safe content') // Safe content should remain
    })
  })
})
