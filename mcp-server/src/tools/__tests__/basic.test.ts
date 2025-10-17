describe('MCP Tools Basic Tests', () => {
  it('should verify MCP server can be built', async () => {
    // This test just verifies that the MCP server can be imported
    // and the basic structure is in place

    const fs = await import('fs/promises');
    const path = await import('path');

    // Check that the built files exist
    const distIndex = path.join(process.cwd(), 'dist', 'index.js');
    const distTools = path.join(process.cwd(), 'dist', 'tools', 'index.js');

    expect(await fs.access(distIndex).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(distTools).then(() => true).catch(() => false)).toBe(true);
  });

  it('should verify consolidation results', async () => {
    // Read the built tools file and count the tools
    const fs = await import('fs/promises');
    const path = await import('path');

    const toolsPath = path.join(process.cwd(), 'dist', 'tools', 'index.js');
    const toolsContent = await fs.readFile(toolsPath, 'utf-8');

    // Count tool definitions - look for actual tool definitions in the array
    const toolMatches = toolsContent.match(/name:\s*['"]([^'"]+)['"]/g);
    const toolCount = toolMatches ? toolMatches.length : 0;

    console.log(`Found ${toolCount} tools in built MCP server`);

    // Should have 10 consolidated tools
    expect(toolCount).toBe(10);

    // Extract tool names for more precise checking
    const toolNames = toolMatches ? toolMatches.map(match => {
      const nameMatch = match.match(/name:\s*['"]([^'"]+)['"]/);
      return nameMatch ? nameMatch[1] : null;
    }).filter(name => name) : [];

    // Check that consolidated tools exist
    expect(toolNames).toContain('get_cr');
    expect(toolNames).toContain('manage_cr_sections');
    expect(toolNames).toContain('create_cr');
    expect(toolNames).toContain('list_projects');
    expect(toolNames).toContain('suggest_cr_improvements');

    // Check that legacy tools are gone from actual tool definitions
    expect(toolNames).not.toContain('get_cr_full_content');
    expect(toolNames).not.toContain('get_cr_attributes');
    expect(toolNames).not.toContain('list_cr_sections');
    expect(toolNames).not.toContain('get_cr_section');
    expect(toolNames).not.toContain('update_cr_section');
    expect(toolNames).not.toContain('list_cr_templates');
    expect(toolNames).not.toContain('get_cr_template');
  });

  it('should verify token reduction achievement', async () => {
    // Test the overall optimization success using the verification script logic
    const { execSync } = await import('child_process');

    try {
      // Run the verification script and capture output
      const output = execSync('node verify-optimization.cjs', {
        encoding: 'utf-8',
        cwd: process.cwd()
      });

      // Check for success indicators in the output
      expect(output).toContain('🎉 MDT-070 MCP Tool Optimization COMPLETED SUCCESSFULLY!');
      expect(output).toContain('✅ 40% token reduction achieved');
      expect(output).toContain('✅ All consolidated tools implemented');
      expect(output).toContain('✅ All legacy tools removed');
      expect(output).toContain('🚀 Ready for production deployment!');

      // Verify specific metrics
      expect(output).toContain('Token Savings: ✅ (47% reduction)');
      expect(output).toContain('Tools: 17 → 10 (41% reduction)');

      console.log('✅ Optimization verification passed - all checks successful');

    } catch (error) {
      // If verification script fails, fail the test
      fail(`Verification script failed: ${error.message}`);
    }
  });
});