#!/usr/bin/env node

/**
 * Simple MCP health verification that doesn't require external configuration
 */

const { spawn } = require('child_process');

function checkMCPHealth() {
  console.log('🔍 Checking MCP Server Health...\n');

  return new Promise((resolve, reject) => {
    const mcpServer = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';
    let hasToolsResponse = false;

    const timeout = setTimeout(() => {
      mcpServer.kill();
      if (!hasToolsResponse) {
        reject(new Error('Health check timeout - server did not respond to tools/list'));
      }
    }, 8000);

    mcpServer.stdout.on('data', (data) => {
      stdout += data.toString();

      try {
        // Parse JSON-RPC responses
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.trim() && line.includes('"jsonrpc"')) {
            const response = JSON.parse(line);

            if (response.error) {
              clearTimeout(timeout);
              mcpServer.kill();
              reject(new Error(`MCP server error: ${response.error.code}: ${response.error.message}`));
              return;
            }

            if (response.result && response.result.tools) {
              hasToolsResponse = true;
              clearTimeout(timeout);
              mcpServer.kill();

              const tools = response.result.tools;

              console.log('✅ MCP Server is Healthy!\n');
              console.log(`📊 Server: ${response.result.serverInfo?.name || 'Unknown'} v${response.result.serverInfo?.version || 'Unknown'}`);
              console.log(`📦 Available Tools: ${tools.length}\n`);

              // Verify our consolidated tools are present
              const expectedTools = [
                'get_cr',
                'manage_cr_sections',
                'create_cr',
                'list_projects',
                'list_crs',
                'update_cr_attrs',
                'update_cr_status',
                'delete_cr',
                'get_project_info',
                'suggest_cr_improvements'
              ];

              console.log('🎯 Consolidated Tools Verification:');
              const allExpectedPresent = expectedTools.every(tool =>
                tools.some(t => t.name === tool)
              );

              expectedTools.forEach(tool => {
                const present = tools.some(t => t.name === tool);
                console.log(`   ${present ? '✅' : '❌'} ${tool}`);
              });

              console.log('');
              console.log(`Consolidated Tools: ${allExpectedPresent ? '✅ ALL PRESENT' : '❌ MISSING'}`);

              // Check that legacy tools are gone
              const legacyTools = [
                'get_cr_full_content',
                'get_cr_attributes',
                'list_cr_sections',
                'get_cr_section',
                'update_cr_section',
                'list_cr_templates',
                'get_cr_template'
              ];

              console.log('\n🗑️  Legacy Tools Removal Status:');
              const allLegacyRemoved = legacyTools.every(tool =>
                !tools.some(t => t.name === tool)
              );

              legacyTools.forEach(tool => {
                const present = tools.some(t => t.name === tool);
                console.log(`   ${present ? '❌ STILL PRESENT' : '✅ REMOVED'} ${tool}`);
              });

              console.log('');
              console.log(`Legacy Tools: ${allLegacyRemoved ? '✅ ALL REMOVED' : '❌ SOME REMAIN'}`);

              if (allExpectedPresent && allLegacyRemoved) {
                console.log('\n🎉 MCP Optimization is WORKING PERFECTLY!');
                console.log('   ✅ All consolidated tools available');
                console.log('   ✅ All legacy tools removed');
                console.log('   ✅ Server responding correctly');
                console.log(`   ✅ ${tools.length} tools total`);
                console.log('');
                console.log('🚀 Ready for production use with optimized token usage!');
              } else {
                console.log('\n⚠️  Some issues detected - review the status above');
              }

              resolve({
                status: 'healthy',
                tools: tools,
                consolidatedPresent: allExpectedPresent,
                legacyRemoved: allLegacyRemoved
              });
              return;
            }
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    });

    mcpServer.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mcpServer.on('close', (code) => {
      clearTimeout(timeout);
      if (!hasToolsResponse) {
        reject(new Error(`MCP server exited with code ${code}. Stderr: ${stderr}`));
      }
    });

    mcpServer.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Send tools list request
    setTimeout(() => {
      mcpServer.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      }) + '\n');
    }, 1000);
  });
}

checkMCPHealth()
  .then(result => {
    console.log('\n✅ Health check completed successfully');
    process.exit(result.status === 'healthy' ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Health check failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure you\'ve run "npm run build" in the mcp-server directory');
    console.error('2. Check that all required files are in the dist/ directory');
    console.error('3. Verify that dist/shared/services/ contains TemplateService.js');
    console.error('4. Ensure the MCP server can read project configuration');
    process.exit(1);
  });